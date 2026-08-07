import { createFileRoute, useBlocker } from "@tanstack/react-router";
import {
	Disc3,
	FileAudio,
	LoaderCircle,
	Pencil,
	Plus,
	Search,
	Trash2,
} from "lucide-react";
import {
	type FormEvent,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from "react";
import { toast } from "sonner";
import { AdminNav } from "@/features/admin/components/admin-nav";
import { LrcEditor } from "@/features/admin/components/lrc-editor";
import {
	AudioUploadField,
	ImageUploadField,
} from "@/features/admin/components/media-upload-fields";
import {
	type AdminContentData,
	getAdminContent,
	getSongEditorData,
	type SongSaveProgress,
	saveSong,
} from "@/features/admin/services/content-service";
import { useAuth } from "@/features/auth/auth-context";
import type { LrcLine } from "@/features/lyrics/lrc";
import { formatDuration, formatNumber, getErrorMessage } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import type { SongRow, SongStatus } from "@/lib/supabase/database.types";
import { publicStorageUrl, removeStorageFiles } from "@/lib/supabase/storage";

export const Route = createFileRoute("/_authenticated/admin/songs")({
	component: SongsAdmin,
});

const emptyContent: AdminContentData = {
	artists: [],
	albums: [],
	songs: [],
	genres: [],
};

function SongsAdmin() {
	const { user } = useAuth();
	const [content, setContent] = useState(emptyContent);
	const [editing, setEditing] = useState<SongRow | null>(null);
	const [formOpen, setFormOpen] = useState(false);
	const [saving, setSaving] = useState(false);
	const [loading, setLoading] = useState(true);
	const [genreIds, setGenreIds] = useState<string[]>([]);
	const [lyrics, setLyrics] = useState<LrcLine[]>([]);
	const [artistId, setArtistId] = useState("");
	const [albumId, setAlbumId] = useState("");
	const [query, setQuery] = useState("");
	const [statusFilter, setStatusFilter] = useState<"all" | SongStatus>("all");
	const [saveProgress, setSaveProgress] = useState<SongSaveProgress | null>(
		null,
	);
	useBlocker({
		enableBeforeUnload: saving,
		shouldBlockFn: () =>
			saving &&
			!window.confirm(
				"Tệp đang được tải lên. Rời trang lúc này có thể làm gián đoạn quá trình lưu. Bạn vẫn muốn rời đi?",
			),
	});

	const load = useCallback(async () => {
		setLoading(true);
		try {
			setContent(await getAdminContent());
		} catch (error) {
			toast.error(getErrorMessage(error));
		} finally {
			setLoading(false);
		}
	}, []);
	useEffect(() => void load(), [load]);

	const openNew = () => {
		setEditing(null);
		setGenreIds([]);
		setLyrics([]);
		setArtistId(content.artists[0]?.id ?? "");
		setAlbumId("");
		setFormOpen(true);
	};
	const openEdit = async (song: SongRow) => {
		setEditing(song);
		setArtistId(song.artist_id ?? "");
		setAlbumId(song.album_id ?? "");
		setFormOpen(true);
		try {
			const editor = await getSongEditorData(song.id);
			setGenreIds(editor.genreIds);
			setLyrics(editor.lyrics);
		} catch (error) {
			toast.error(getErrorMessage(error));
		}
	};

	const submit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!user) return;
		setSaving(true);
		setSaveProgress({ label: "Đang chuẩn bị", percent: 0 });
		const form = new FormData(event.currentTarget);
		const audio = form.get("audio");
		const cover = form.get("cover");
		try {
			await saveSong({
				current: editing,
				userId: user.id,
				audioFile: audio instanceof File && audio.size ? audio : null,
				coverFile: cover instanceof File && cover.size ? cover : null,
				removeCover: form.get("remove_cover") === "on",
				genreIds,
				lyrics,
				onProgress: setSaveProgress,
				values: {
					title: String(form.get("title") ?? ""),
					artist_id: String(form.get("artist_id") ?? "") || null,
					album_id: String(form.get("album_id") ?? "") || null,
					status: String(form.get("status")) as SongStatus,
					track_number: form.get("track_number")
						? Number(form.get("track_number"))
						: null,
					release_date: String(form.get("release_date") ?? "") || null,
					lyrics_language:
						String(form.get("lyrics_language") ?? "").trim() || null,
					is_explicit: form.get("is_explicit") === "on",
				},
			});
			toast.success(editing ? "Đã cập nhật bài hát." : "Đã thêm bài hát.");
			setFormOpen(false);
			setEditing(null);
			await load();
		} catch (error) {
			toast.error(getErrorMessage(error));
		} finally {
			setSaving(false);
			setSaveProgress(null);
		}
	};

	const remove = async (song: SongRow) => {
		if (!window.confirm(`Xóa bài hát “${song.title}” và tệp âm thanh?`)) return;
		const { error } = await createClient()
			.from("songs")
			.delete()
			.eq("id", song.id);
		if (error) toast.error(getErrorMessage(error));
		else {
			await Promise.all([
				removeStorageFiles("music-audio", [song.audio_path]),
				removeStorageFiles("music-covers", [song.cover_path]),
			]);
			toast.success("Đã xóa bài hát.");
			await load();
		}
	};

	const artistName = (id: string | null) =>
		content.artists.find((artist) => artist.id === id)?.name ??
		"Nghệ sĩ độc lập";
	const availableAlbums = content.albums.filter(
		(album) => !artistId || album.artist_id === artistId,
	);
	const filteredSongs = useMemo(() => {
		const normalizedQuery = query.trim().toLocaleLowerCase("vi");
		return content.songs.filter((song) => {
			if (statusFilter !== "all" && song.status !== statusFilter) return false;
			if (!normalizedQuery) return true;
			const artist = content.artists.find((item) => item.id === song.artist_id);
			const album = content.albums.find((item) => item.id === song.album_id);
			return [song.title, artist?.name, album?.title]
				.filter(Boolean)
				.some((value) =>
					value?.toLocaleLowerCase("vi").includes(normalizedQuery),
				);
		});
	}, [content.albums, content.artists, content.songs, query, statusFilter]);

	return (
		<div className="page-stack">
			<AdminNav />
			<div className="section-heading">
				<div>
					<p className="eyebrow">Quản lý nội dung</p>
					<h1>Bài hát</h1>
				</div>
				<button type="button" className="button primary" onClick={openNew}>
					<Plus size={18} /> Thêm bài hát
				</button>
			</div>
			<div className="admin-toolbar">
				<label className="search-box">
					<Search size={18} />
					<input
						type="search"
						value={query}
						onChange={(event) => setQuery(event.target.value)}
						placeholder="Tìm bài hát, nghệ sĩ hoặc album"
						aria-label="Tìm trong danh sách bài hát"
					/>
				</label>
				<select
					value={statusFilter}
					onChange={(event) =>
						setStatusFilter(event.target.value as "all" | SongStatus)
					}
					aria-label="Lọc trạng thái bài hát"
				>
					<option value="all">Tất cả trạng thái</option>
					<option value="draft">Bản nháp</option>
					<option value="pending">Chờ duyệt</option>
					<option value="published">Đã phát hành</option>
					<option value="rejected">Từ chối</option>
				</select>
				<span className="result-count">
					{filteredSongs.length}/{content.songs.length} bài hát
				</span>
			</div>
			{formOpen ? (
				<form
					key={editing?.id ?? "new-song"}
					className="panel stack-form song-editor"
					onSubmit={submit}
				>
					<div className="section-heading">
						<h2>{editing ? `Sửa “${editing.title}”` : "Bài hát mới"}</h2>
						<button
							type="button"
							className="text-button"
							disabled={saving}
							onClick={() => setFormOpen(false)}
						>
							Đóng
						</button>
					</div>
					<div className="form-grid three">
						<label>
							<span>Tên bài hát</span>
							<input name="title" required defaultValue={editing?.title} />
						</label>
						<label>
							<span>Nghệ sĩ</span>
							<select
								name="artist_id"
								value={artistId}
								onChange={(event) => {
									const nextArtistId = event.target.value;
									setArtistId(nextArtistId);
									if (
										albumId &&
										content.albums.find((album) => album.id === albumId)
											?.artist_id !== nextArtistId
									) {
										setAlbumId("");
									}
								}}
							>
								<option value="">Nghệ sĩ độc lập</option>
								{content.artists.map((artist) => (
									<option key={artist.id} value={artist.id}>
										{artist.name}
									</option>
								))}
							</select>
						</label>
						<label>
							<span>Album</span>
							<select
								name="album_id"
								value={albumId}
								onChange={(event) => setAlbumId(event.target.value)}
							>
								<option value="">Đĩa đơn / Không album</option>
								{availableAlbums.map((album) => (
									<option key={album.id} value={album.id}>
										{album.title}
									</option>
								))}
							</select>
						</label>
						<label>
							<span>Trạng thái</span>
							<select
								name="status"
								defaultValue={editing?.status ?? "published"}
							>
								<option value="draft">Bản nháp</option>
								<option value="pending">Chờ duyệt</option>
								<option value="published">Đã phát hành</option>
								<option value="rejected">Từ chối</option>
							</select>
						</label>
						<label>
							<span>Số thứ tự track</span>
							<input
								name="track_number"
								type="number"
								min="1"
								defaultValue={editing?.track_number ?? ""}
							/>
						</label>
						<label>
							<span>Ngày phát hành</span>
							<input
								name="release_date"
								type="date"
								defaultValue={editing?.release_date ?? ""}
							/>
						</label>
						<label>
							<span>Ngôn ngữ lyrics</span>
							<input
								name="lyrics_language"
								defaultValue={editing?.lyrics_language ?? "vi"}
							/>
						</label>
						<AudioUploadField
							currentPath={editing?.audio_path}
							currentDuration={editing?.duration_seconds}
							required={!editing}
						/>
						<ImageUploadField
							name="cover"
							label="Ảnh bìa"
							currentPath={editing?.cover_path}
							removeName="remove_cover"
						/>
					</div>
					<label className="check-row">
						<input
							name="is_explicit"
							type="checkbox"
							defaultChecked={editing?.is_explicit}
						/>{" "}
						Nội dung explicit
					</label>
					<fieldset className="genre-picker">
						<legend>Thể loại</legend>
						{content.genres.map((genre) => (
							<label key={genre.id} className="chip-check">
								<input
									type="checkbox"
									checked={genreIds.includes(genre.id)}
									onChange={(event) =>
										setGenreIds((current) =>
											event.target.checked
												? [...current, genre.id]
												: current.filter((id) => id !== genre.id),
										)
									}
								/>{" "}
								{genre.name}
							</label>
						))}
					</fieldset>
					<div>
						<div className="section-heading">
							<div>
								<p className="eyebrow">Nâng cao</p>
								<h3>Lyrics đồng bộ</h3>
							</div>
							<span>{lyrics.length} dòng</span>
						</div>
						<LrcEditor lines={lyrics} onChange={setLyrics} />
					</div>
					<div className="button-row">
						<button type="submit" className="button primary" disabled={saving}>
							{saving ? (
								<LoaderCircle className="spin" size={18} />
							) : (
								<FileAudio size={18} />
							)}{" "}
							Lưu bài hát
						</button>
						<button
							type="button"
							className="button ghost"
							disabled={saving}
							onClick={() => setFormOpen(false)}
						>
							Hủy
						</button>
					</div>
					{saveProgress ? (
						<output className="upload-progress" aria-live="polite">
							<div className="upload-progress-copy">
								<span>{saveProgress.label}</span>
								<strong>{saveProgress.percent}%</strong>
							</div>
							<progress max={100} value={saveProgress.percent} />
						</output>
					) : null}
				</form>
			) : null}
			{loading ? (
				<div className="loading-state">
					<LoaderCircle className="spin" /> Đang tải nội dung...
				</div>
			) : (
				<div className="admin-table songs-table">
					<div className="admin-table-head">
						<span>Bài hát</span>
						<span>Nghệ sĩ</span>
						<span>Trạng thái</span>
						<span>Lượt nghe</span>
						<span>Thao tác</span>
					</div>
					{filteredSongs.map((song) => (
						<div className="admin-table-row" key={song.id}>
							<div className="table-entity">
								<div className="avatar-placeholder square">
									{song.cover_path ? (
										<img
											src={
												publicStorageUrl("music-covers", song.cover_path) ?? ""
											}
											alt=""
										/>
									) : (
										<Disc3 size={19} />
									)}
								</div>
								<div className="truncate">
									<strong>{song.title}</strong>
									<small>{formatDuration(song.duration_seconds)}</small>
								</div>
							</div>
							<span>{artistName(song.artist_id)}</span>
							<span
								className={`status ${song.status === "published" ? "success" : song.status === "rejected" ? "danger" : "warning"}`}
							>
								{song.status}
							</span>
							<span>{formatNumber(song.total_plays)}</span>
							<div className="button-row">
								<button
									type="button"
									className="icon-button"
									onClick={() => void openEdit(song)}
								>
									<Pencil size={17} />
								</button>
								<button
									type="button"
									className="icon-button danger"
									onClick={() => void remove(song)}
								>
									<Trash2 size={17} />
								</button>
							</div>
						</div>
					))}
					{!filteredSongs.length ? (
						<div className="empty-inline">Không có bài hát phù hợp bộ lọc.</div>
					) : null}
				</div>
			)}
		</div>
	);
}
