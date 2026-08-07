import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type {
	Database,
	Json,
	SongCatalogRow,
} from "@/lib/supabase/database.types";
import type {
	AlbumDetail,
	ArtistDetail,
	CatalogPage,
	CatalogSong,
	SearchResult,
	SharedPlaylist,
	SongGenre,
} from "../catalog-types";

const catalogInput = z.object({
	page: z.number().int().min(1).default(1),
	genre: z.string().max(120).default(""),
	artist: z.string().max(160).default(""),
	album: z.string().max(160).default(""),
});

const slugInput = z.object({ slug: z.string().min(1).max(180) });
const searchInput = z.object({ query: z.string().trim().max(120) });
const shareInput = z.object({ shareToken: z.string().uuid() });

function publicAssetUrl(
	supabase: SupabaseClient<Database>,
	bucket: "music-covers" | "avatars",
	path: string | null,
) {
	if (!path) return null;
	if (/^https?:\/\//.test(path)) return path;
	return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

function parseGenres(value: Json | null): SongGenre[] {
	if (!Array.isArray(value)) return [];
	return value.flatMap((item) => {
		if (!item || Array.isArray(item) || typeof item !== "object") return [];
		const { id, name, slug } = item;
		if (
			typeof id !== "string" ||
			typeof name !== "string" ||
			typeof slug !== "string"
		) {
			return [];
		}
		return [{ id, name, slug }];
	});
}

function normalizeSong(
	supabase: SupabaseClient<Database>,
	row: SongCatalogRow,
): CatalogSong | null {
	if (!row.id || !row.title || !row.slug || !row.audio_path) return null;
	return {
		id: row.id,
		title: row.title,
		slug: row.slug,
		artistId: row.artist_id,
		artistName: row.artist_name ?? "Nghệ sĩ độc lập",
		artistSlug: row.artist_slug,
		albumId: row.album_id,
		albumTitle: row.album_title,
		albumSlug: row.album_slug,
		audioPath: row.audio_path,
		coverPath: row.cover_path,
		coverUrl: publicAssetUrl(supabase, "music-covers", row.cover_path),
		durationSeconds: row.duration_seconds ?? 0,
		trackNumber: row.track_number,
		releaseDate: row.release_date,
		isExplicit: row.is_explicit ?? false,
		totalPlays: row.total_plays ?? 0,
		genres: parseGenres(row.genres),
	};
}

async function getServerClient() {
	const { createClient } = await import("@/lib/supabase/server");
	return createClient();
}

export const getCatalogPage = createServerFn({ method: "GET" })
	.validator(catalogInput)
	.handler(async ({ data }): Promise<CatalogPage> => {
		const supabase = await getServerClient();
		const pageSize = 24;
		const from = (data.page - 1) * pageSize;
		const to = from + pageSize - 1;

		let query = supabase
			.from("song_catalog")
			.select("*", { count: "exact" })
			.eq("status", "published")
			.order("total_plays", { ascending: false })
			.range(from, to);

		if (data.genre) query = query.contains("genres", [{ slug: data.genre }]);
		if (data.artist) query = query.eq("artist_slug", data.artist);
		if (data.album) query = query.eq("album_slug", data.album);

		const [songsResult, genresResult, artistsResult, albumsResult] =
			await Promise.all([
				query,
				supabase.from("genres").select("*").order("name"),
				supabase.from("artists").select("id,name,slug").order("name"),
				supabase
					.from("albums")
					.select("id,title,slug,artist_id")
					.order("title"),
			]);

		if (songsResult.error) throw songsResult.error;
		if (genresResult.error) throw genresResult.error;
		if (artistsResult.error) throw artistsResult.error;
		if (albumsResult.error) throw albumsResult.error;

		return {
			songs: (songsResult.data ?? []).flatMap((row) => {
				const song = normalizeSong(supabase, row);
				return song ? [song] : [];
			}),
			total: songsResult.count ?? 0,
			page: data.page,
			pageSize,
			genres: genresResult.data ?? [],
			artists: artistsResult.data ?? [],
			albums: albumsResult.data ?? [],
		};
	});

export const searchCatalog = createServerFn({ method: "GET" })
	.validator(searchInput)
	.handler(async ({ data }): Promise<SearchResult[]> => {
		if (!data.query) return [];
		const supabase = await getServerClient();
		const { data: rows, error } = await supabase.rpc("search_catalog", {
			p_query: data.query,
			p_limit: 30,
		});
		if (error) throw error;
		const resultRows = rows ?? [];
		const songIds = resultRows
			.filter((row) => row.entity_type === "song")
			.map((row) => row.entity_id);
		const artistIds = resultRows
			.filter((row) => row.entity_type === "artist")
			.map((row) => row.entity_id);
		const albumIds = resultRows
			.filter((row) => row.entity_type === "album")
			.map((row) => row.entity_id);
		const [songRows, artistRows, albumRows] = await Promise.all([
			songIds.length
				? supabase.from("song_catalog").select("*").in("id", songIds)
				: Promise.resolve({ data: [], error: null }),
			artistIds.length
				? supabase.from("artists").select("id,slug").in("id", artistIds)
				: Promise.resolve({ data: [], error: null }),
			albumIds.length
				? supabase.from("albums").select("id,slug").in("id", albumIds)
				: Promise.resolve({ data: [], error: null }),
		]);
		if (songRows.error) throw songRows.error;
		if (artistRows.error) throw artistRows.error;
		if (albumRows.error) throw albumRows.error;
		const songs = new Map(
			(songRows.data ?? []).flatMap((row) => {
				const song = normalizeSong(supabase, row);
				return song ? [[song.id, song] as const] : [];
			}),
		);
		const artistSlugs = new Map(
			(artistRows.data ?? []).map((row) => [row.id, row.slug]),
		);
		const albumSlugs = new Map(
			(albumRows.data ?? []).map((row) => [row.id, row.slug]),
		);

		return resultRows.flatMap((row) => {
			if (
				!(["song", "artist", "album"] as string[]).includes(row.entity_type)
			) {
				return [];
			}
			return [
				{
					type: row.entity_type as "song" | "artist" | "album",
					id: row.entity_id,
					slug:
						row.entity_type === "artist"
							? (artistSlugs.get(row.entity_id) ?? null)
							: row.entity_type === "album"
								? (albumSlugs.get(row.entity_id) ?? null)
								: (songs.get(row.entity_id)?.slug ?? null),
					title: row.title,
					subtitle: row.subtitle,
					imageUrl: publicAssetUrl(supabase, "music-covers", row.image_path),
					rank: row.rank_score,
					song: songs.get(row.entity_id) ?? null,
				},
			];
		});
	});

export const getArtistDetail = createServerFn({ method: "GET" })
	.validator(slugInput)
	.handler(async ({ data }): Promise<ArtistDetail | null> => {
		const supabase = await getServerClient();
		const { data: artist, error } = await supabase
			.from("artist_catalog")
			.select("*")
			.eq("slug", data.slug)
			.maybeSingle();
		if (error) throw error;
		if (!artist?.id) return null;

		const [albumsResult, songsResult] = await Promise.all([
			supabase
				.from("albums")
				.select("*")
				.eq("artist_id", artist.id)
				.order("release_date", { ascending: false }),
			supabase
				.from("song_catalog")
				.select("*")
				.eq("artist_id", artist.id)
				.eq("status", "published")
				.order("track_number"),
		]);
		if (albumsResult.error) throw albumsResult.error;
		if (songsResult.error) throw songsResult.error;

		return {
			artist: {
				...artist,
				imageUrl: publicAssetUrl(supabase, "music-covers", artist.image_path),
			},
			albums: (albumsResult.data ?? []).map((album) => ({
				...album,
				coverUrl: publicAssetUrl(supabase, "music-covers", album.cover_path),
			})),
			songs: (songsResult.data ?? []).flatMap((row) => {
				const song = normalizeSong(supabase, row);
				return song ? [song] : [];
			}),
		};
	});

export const getAlbumDetail = createServerFn({ method: "GET" })
	.validator(slugInput)
	.handler(async ({ data }): Promise<AlbumDetail | null> => {
		const supabase = await getServerClient();
		const { data: album, error } = await supabase
			.from("albums")
			.select("*")
			.eq("slug", data.slug)
			.maybeSingle();
		if (error) throw error;
		if (!album) return null;

		const [artistResult, songsResult] = await Promise.all([
			supabase
				.from("artists")
				.select("id,name,slug,image_path")
				.eq("id", album.artist_id)
				.maybeSingle(),
			supabase
				.from("song_catalog")
				.select("*")
				.eq("album_id", album.id)
				.eq("status", "published")
				.order("track_number"),
		]);
		if (artistResult.error) throw artistResult.error;
		if (songsResult.error) throw songsResult.error;

		return {
			album: {
				...album,
				coverUrl: publicAssetUrl(supabase, "music-covers", album.cover_path),
			},
			artist: artistResult.data,
			songs: (songsResult.data ?? []).flatMap((row) => {
				const song = normalizeSong(supabase, row);
				return song ? [song] : [];
			}),
		};
	});

function objectValue(value: Json, key: string) {
	if (!value || Array.isArray(value) || typeof value !== "object") return null;
	return value[key] ?? null;
}

function stringValue(value: Json | undefined) {
	return typeof value === "string" ? value : null;
}

export const getSharedPlaylist = createServerFn({ method: "GET" })
	.validator(shareInput)
	.handler(async ({ data }): Promise<SharedPlaylist | null> => {
		const supabase = await getServerClient();
		const { data: raw, error } = await supabase.rpc("get_shared_playlist", {
			p_share_token: data.shareToken,
		});
		if (error) throw error;
		if (!raw || Array.isArray(raw) || typeof raw !== "object") return null;

		const id = stringValue(raw.id);
		const title = stringValue(raw.title);
		const visibility = stringValue(raw.visibility);
		if (!id || !title || !["private", "public"].includes(visibility ?? "")) {
			return null;
		}

		const owner = objectValue(raw, "owner");
		const songsValue = raw.songs;
		const songs = Array.isArray(songsValue)
			? songsValue.flatMap((song) => {
					if (!song || Array.isArray(song) || typeof song !== "object")
						return [];
					const songId = stringValue(song.id);
					const songTitle = stringValue(song.title);
					const audioPath = stringValue(song.audio_path);
					if (!songId || !songTitle || !audioPath) return [];
					return [
						{
							id: songId,
							title: songTitle,
							slug: stringValue(song.slug) ?? "",
							artistName: stringValue(song.artist_name) ?? "Nghệ sĩ độc lập",
							albumTitle: stringValue(song.album_title),
							audioPath,
							coverUrl: publicAssetUrl(
								supabase,
								"music-covers",
								stringValue(song.cover_path),
							),
							durationSeconds:
								typeof song.duration_seconds === "number"
									? song.duration_seconds
									: 0,
							position: typeof song.position === "number" ? song.position : 0,
						},
					];
				})
			: [];

		return {
			id,
			title,
			description: stringValue(raw.description),
			coverPath: stringValue(raw.cover_path),
			coverUrl: publicAssetUrl(
				supabase,
				"music-covers",
				stringValue(raw.cover_path),
			),
			visibility: visibility === "public" ? "public" : "private",
			owner: {
				username:
					stringValue(owner && objectValue(owner, "username")) ?? "user",
				displayName: stringValue(owner && objectValue(owner, "display_name")),
				avatarUrl: publicAssetUrl(
					supabase,
					"avatars",
					stringValue(owner && objectValue(owner, "avatar_path")),
				),
			},
			songs: songs.sort((a, b) => a.position - b.position),
		};
	});
