import type { LrcLine } from "@/features/lyrics/lrc";
import { createClient } from "@/lib/supabase/client";
import type {
	AlbumRow,
	ArtistRow,
	GenreRow,
	LyricsLineRow,
	SongRow,
	SongStatus,
} from "@/lib/supabase/database.types";
import {
	readAudioDuration,
	removeStorageFiles,
	uploadAudio,
	uploadImage,
} from "@/lib/supabase/storage";

export interface AdminContentData {
	artists: ArtistRow[];
	albums: AlbumRow[];
	songs: SongRow[];
	genres: GenreRow[];
}

export interface SongSaveProgress {
	label: string;
	percent: number;
}

export interface AdminGenre extends GenreRow {
	songCount: number;
}

export function slugifyContentName(value: string) {
	return value
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/đ/g, "d")
		.replace(/Đ/g, "D")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

export async function getAdminGenres(): Promise<AdminGenre[]> {
	const [genres, relations] = await Promise.all([
		createClient().from("genres").select("*").order("name"),
		createClient().from("song_genres").select("genre_id"),
	]);
	if (genres.error) throw genres.error;
	if (relations.error) throw relations.error;
	const usage = new Map<string, number>();
	for (const relation of relations.data ?? []) {
		usage.set(relation.genre_id, (usage.get(relation.genre_id) ?? 0) + 1);
	}
	return (genres.data ?? []).map((genre) => ({
		...genre,
		songCount: usage.get(genre.id) ?? 0,
	}));
}

async function createUniqueGenreSlug(name: string) {
	const base = slugifyContentName(name) || "the-loai";
	const { data, error } = await createClient()
		.from("genres")
		.select("slug")
		.like("slug", `${base}%`);
	if (error) throw error;
	const usedSlugs = new Set((data ?? []).map((genre) => genre.slug));
	if (!usedSlugs.has(base)) return base;
	let suffix = 2;
	while (usedSlugs.has(`${base}-${suffix}`)) suffix += 1;
	return `${base}-${suffix}`;
}

export async function saveGenre({
	current,
	name,
	description,
}: {
	current: GenreRow | null;
	name: string;
	description: string;
}) {
	const normalizedName = name.trim();
	if (normalizedName.length < 2 || normalizedName.length > 80) {
		throw new Error("Tên thể loại phải có từ 2 đến 80 ký tự.");
	}
	const payload = {
		name: normalizedName,
		slug: current?.slug ?? (await createUniqueGenreSlug(normalizedName)),
		description: description.trim() || null,
	};
	const result = current
		? await createClient()
				.from("genres")
				.update(payload)
				.eq("id", current.id)
				.select("*")
				.single()
		: await createClient().from("genres").insert(payload).select("*").single();
	if (result.error) throw result.error;
	return result.data;
}

export async function deleteGenre(genre: GenreRow) {
	const usage = await createClient()
		.from("song_genres")
		.select("song_id", { count: "exact", head: true })
		.eq("genre_id", genre.id);
	if (usage.error) throw usage.error;
	if ((usage.count ?? 0) > 0) {
		throw new Error(
			`Thể loại “${genre.name}” đang được dùng bởi ${usage.count} bài hát.`,
		);
	}
	const { error } = await createClient()
		.from("genres")
		.delete()
		.eq("id", genre.id);
	if (error) throw error;
}

export async function getAdminContent(): Promise<AdminContentData> {
	const [artists, albums, songs, genres] = await Promise.all([
		createClient().from("artists").select("*").order("name"),
		createClient().from("albums").select("*").order("title"),
		createClient()
			.from("songs")
			.select("*")
			.order("created_at", { ascending: false }),
		createClient().from("genres").select("*").order("name"),
	]);
	for (const result of [artists, albums, songs, genres]) {
		if (result.error) throw result.error;
	}
	return {
		artists: artists.data ?? [],
		albums: albums.data ?? [],
		songs: songs.data ?? [],
		genres: genres.data ?? [],
	};
}

export async function getSongEditorData(songId: string) {
	const [genres, lyrics] = await Promise.all([
		createClient().from("song_genres").select("genre_id").eq("song_id", songId),
		createClient()
			.from("lyrics_lines")
			.select("*")
			.eq("song_id", songId)
			.order("line_order"),
	]);
	if (genres.error) throw genres.error;
	if (lyrics.error) throw lyrics.error;
	return {
		genreIds: (genres.data ?? []).map((item) => item.genre_id),
		lyrics: (lyrics.data ?? []).map((line) => ({
			startMs: line.start_ms,
			endMs: line.end_ms,
			text: line.text,
		})),
	};
}

async function replaceLyrics(songId: string, lines: LrcLine[]) {
	const { data: oldLines, error: readError } = await createClient()
		.from("lyrics_lines")
		.select("*")
		.eq("song_id", songId)
		.order("line_order");
	if (readError) throw readError;
	const { error: deleteError } = await createClient()
		.from("lyrics_lines")
		.delete()
		.eq("song_id", songId);
	if (deleteError) throw deleteError;

	const cleaned = lines
		.filter((line) => line.text.trim())
		.sort((a, b) => a.startMs - b.startMs)
		.map((line, index, all) => ({
			song_id: songId,
			line_order: index,
			start_ms: Math.max(0, Math.round(line.startMs)),
			end_ms:
				line.endMs && line.endMs > line.startMs
					? Math.round(line.endMs)
					: (all[index + 1]?.startMs ?? null),
			text: line.text.trim(),
		}));
	if (!cleaned.length) return;
	const { error: insertError } = await createClient()
		.from("lyrics_lines")
		.insert(cleaned);
	if (!insertError) return;

	const restore = (oldLines ?? []).map((line: LyricsLineRow) => ({
		song_id: line.song_id,
		line_order: line.line_order,
		start_ms: line.start_ms,
		end_ms: line.end_ms,
		text: line.text,
	}));
	if (restore.length) await createClient().from("lyrics_lines").insert(restore);
	throw insertError;
}

export async function saveSong({
	current,
	values,
	audioFile,
	coverFile,
	removeCover,
	genreIds,
	lyrics,
	userId,
	onProgress,
}: {
	current: SongRow | null;
	values: {
		title: string;
		artist_id: string | null;
		album_id: string | null;
		status: SongStatus;
		track_number: number | null;
		release_date: string | null;
		lyrics_language: string | null;
		is_explicit: boolean;
	};
	audioFile: File | null;
	coverFile: File | null;
	removeCover: boolean;
	genreIds: string[];
	lyrics: LrcLine[];
	userId: string;
	onProgress?: (progress: SongSaveProgress) => void;
}) {
	const client = createClient();
	let audioPath = current?.audio_path ?? null;
	let coverPath = current?.cover_path ?? null;
	let duration = current?.duration_seconds ?? 0;
	let uploadedAudio: string | null = null;
	let uploadedCover: string | null = null;
	let savedSongId: string | null = null;
	let databaseWritten = false;
	let previousGenreIds: string[] = [];
	let previousLyrics: LrcLine[] = [];
	const report = (label: string, percent: number) =>
		onProgress?.({ label, percent });

	report("Đang kiểm tra dữ liệu", 5);
	if (!values.title.trim()) throw new Error("Tên bài hát không được để trống.");
	if (values.track_number !== null && values.track_number < 1) {
		throw new Error("Số thứ tự track phải lớn hơn 0.");
	}
	const lyricTimestamps = new Set<number>();
	for (const line of lyrics.filter((item) => item.text.trim())) {
		const startMs = Math.max(0, Math.round(line.startMs));
		if (lyricTimestamps.has(startMs)) {
			throw new Error("Lyrics không được có hai dòng cùng timestamp bắt đầu.");
		}
		if (line.endMs !== null && line.endMs <= line.startMs) {
			throw new Error("Thời gian kết thúc lyrics phải sau thời gian bắt đầu.");
		}
		lyricTimestamps.add(startMs);
	}

	if (current) {
		const [genresResult, lyricsResult] = await Promise.all([
			client.from("song_genres").select("genre_id").eq("song_id", current.id),
			client
				.from("lyrics_lines")
				.select("start_ms,end_ms,text")
				.eq("song_id", current.id)
				.order("line_order"),
		]);
		if (genresResult.error) throw genresResult.error;
		if (lyricsResult.error) throw lyricsResult.error;
		previousGenreIds = (genresResult.data ?? []).map((item) => item.genre_id);
		previousLyrics = (lyricsResult.data ?? []).map((line) => ({
			startMs: line.start_ms,
			endMs: line.end_ms,
			text: line.text,
		}));
	}

	try {
		if (audioFile) {
			report("Đang đọc metadata âm thanh", 12);
			duration = await readAudioDuration(audioFile);
			report("Đang tải tệp âm thanh lên Supabase", 20);
			uploadedAudio = await uploadAudio(audioFile, userId);
			audioPath = uploadedAudio;
			report("Đã tải tệp âm thanh", 55);
		}
		if (coverFile) {
			report("Đang tải ảnh bìa", 60);
			uploadedCover = await uploadImage(coverFile, userId);
			coverPath = uploadedCover;
			report("Đã tải ảnh bìa", 70);
		} else if (removeCover) {
			coverPath = null;
		}
		if (!audioPath) throw new Error("Vui lòng chọn tệp âm thanh.");

		report("Đang lưu thông tin bài hát", 76);
		const payload = {
			...values,
			title: values.title.trim(),
			slug: current?.slug ?? "",
			audio_path: audioPath,
			cover_path: coverPath,
			duration_seconds: duration,
			uploaded_by: current?.uploaded_by ?? userId,
			source: "admin_upload" as const,
		};
		const result = current
			? await client
					.from("songs")
					.update(payload)
					.eq("id", current.id)
					.select("*")
					.single()
			: await client.from("songs").insert(payload).select("*").single();
		if (result.error) throw result.error;
		const song = result.data;
		savedSongId = song.id;
		databaseWritten = true;

		report("Đang cập nhật thể loại", 84);
		const { error: clearGenresError } = await client
			.from("song_genres")
			.delete()
			.eq("song_id", song.id);
		if (clearGenresError) throw clearGenresError;
		if (genreIds.length) {
			const { error } = await client
				.from("song_genres")
				.insert(
					genreIds.map((genreId) => ({ song_id: song.id, genre_id: genreId })),
				);
			if (error) throw error;
		}
		report("Đang lưu lyrics đồng bộ", 92);
		await replaceLyrics(song.id, lyrics);

		report("Đang hoàn tất và dọn tệp cũ", 97);
		if (uploadedAudio)
			await removeStorageFiles("music-audio", [current?.audio_path]);
		if (current?.cover_path && current.cover_path !== coverPath)
			await removeStorageFiles("music-covers", [current?.cover_path]);
		report("Hoàn tất", 100);
		return song;
	} catch (error) {
		let storageCanBeCleaned = !databaseWritten;
		if (databaseWritten && savedSongId && !current) {
			const rollback = await client
				.from("songs")
				.delete()
				.eq("id", savedSongId);
			storageCanBeCleaned = !rollback.error;
		}
		if (databaseWritten && savedSongId && current) {
			const rollback = await client
				.from("songs")
				.update({
					title: current.title,
					slug: current.slug,
					artist_id: current.artist_id,
					album_id: current.album_id,
					uploaded_by: current.uploaded_by,
					source: current.source,
					status: current.status,
					audio_path: current.audio_path,
					cover_path: current.cover_path,
					duration_seconds: current.duration_seconds,
					track_number: current.track_number,
					release_date: current.release_date,
					lyrics_language: current.lyrics_language,
					is_explicit: current.is_explicit,
					published_at: current.published_at,
				})
				.eq("id", current.id);
			storageCanBeCleaned = !rollback.error;

			if (!rollback.error) {
				await client.from("song_genres").delete().eq("song_id", current.id);
				if (previousGenreIds.length) {
					await client.from("song_genres").insert(
						previousGenreIds.map((genreId) => ({
							song_id: current.id,
							genre_id: genreId,
						})),
					);
				}
				try {
					await replaceLyrics(current.id, previousLyrics);
				} catch {
					// Best-effort relation rollback; the song and its files are already safe.
				}
			}
		}
		if (storageCanBeCleaned) {
			await Promise.all([
				removeStorageFiles("music-audio", [uploadedAudio]),
				removeStorageFiles("music-covers", [uploadedCover]),
			]);
		}
		throw error;
	}
}
