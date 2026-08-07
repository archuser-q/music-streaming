import { createFileRoute } from "@tanstack/react-router";
import { Copy, ListMusic, LoaderCircle, Play, Save } from "lucide-react";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/ui/empty-state";
import { toPlayerTrack } from "@/features/catalog/catalog-types";
import { SongRow } from "@/features/catalog/components/song-row";
import { usePlayer } from "@/features/player/player-context";
import {
	getPlaylistDetail,
	type PlaylistDetail,
	removeSongFromPlaylist,
	savePlaylist,
} from "@/features/playlists/playlist-service";
import { getPlaylistShareUrl } from "@/lib/config/app-url";
import { getErrorMessage } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";

export const Route = createFileRoute("/_authenticated/playlists/$playlistId")({
	component: PlaylistDetailPage,
});

function PlaylistDetailPage() {
	const { playlistId } = Route.useParams();
	const player = usePlayer();
	const { authenticatedUser } = Route.useRouteContext();
	const [detail, setDetail] = useState<PlaylistDetail | null>(null);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);

	const load = useCallback(async () => {
		try {
			const next = await getPlaylistDetail(playlistId);
			setDetail(next?.playlist.owner_id === authenticatedUser.id ? next : null);
		} catch (error) {
			toast.error(getErrorMessage(error));
		} finally {
			setLoading(false);
		}
	}, [authenticatedUser.id, playlistId]);

	useEffect(() => void load(), [load]);
	useEffect(() => {
		const supabase = createClient();
		const channel = supabase
			.channel(`playlist-detail:${playlistId}`)
			.on(
				"postgres_changes",
				{
					event: "*",
					schema: "public",
					table: "playlist_songs",
					filter: `playlist_id=eq.${playlistId}`,
				},
				() => void load(),
			)
			.on(
				"postgres_changes",
				{
					event: "*",
					schema: "public",
					table: "playlists",
					filter: `id=eq.${playlistId}`,
				},
				() => void load(),
			)
			.subscribe();
		return () => {
			void supabase.removeChannel(channel);
		};
	}, [load, playlistId]);

	const save = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!detail) return;
		setSaving(true);
		const form = new FormData(event.currentTarget);
		try {
			await savePlaylist({
				ownerId: authenticatedUser.id,
				playlist: {
					id: detail.playlist.id,
					title: String(form.get("title") ?? "").trim(),
					description: String(form.get("description") ?? "").trim() || null,
					visibility:
						form.get("visibility") === "public" ? "public" : "private",
					share_enabled: form.get("share_enabled") === "on",
					cover_path: detail.playlist.cover_path,
				},
			});
			toast.success("Đã lưu playlist.");
			await load();
		} catch (error) {
			toast.error(getErrorMessage(error));
		} finally {
			setSaving(false);
		}
	};

	const removeSong = async (songId: string) => {
		try {
			await removeSongFromPlaylist({ playlistId, songId });
			toast.success("Đã xóa bài hát khỏi playlist.");
			await load();
		} catch (error) {
			toast.error(getErrorMessage(error));
		}
	};

	if (loading)
		return (
			<div className="loading-state">
				<LoaderCircle className="spin" /> Đang tải playlist...
			</div>
		);
	if (!detail)
		return (
			<EmptyState
				icon={ListMusic}
				title="Không tìm thấy playlist"
				description="Playlist không tồn tại hoặc bạn không có quyền xem."
			/>
		);
	const songs = detail.entries.map((entry) => entry.song);

	return (
		<div className="page-stack">
			<section className="entity-hero compact">
				<div className="entity-image">
					{detail.playlist.coverUrl ? (
						<img src={detail.playlist.coverUrl} alt={detail.playlist.title} />
					) : (
						<ListMusic size={60} />
					)}
				</div>
				<div className="grow">
					<p className="eyebrow">Playlist cá nhân</p>
					<h1>{detail.playlist.title}</h1>
					<p className="muted">
						{songs.length} bài hát ·{" "}
						{detail.playlist.visibility === "public" ? "Công khai" : "Riêng tư"}
					</p>
					<div className="button-row">
						{songs.length ? (
							<button
								type="button"
								className="button primary"
								onClick={() => player.playQueue(songs.map(toPlayerTrack))}
							>
								<Play size={18} fill="currentColor" /> Phát tất cả
							</button>
						) : null}
						{detail.playlist.share_enabled ? (
							<button
								type="button"
								className="button ghost"
								onClick={() => {
									void navigator.clipboard.writeText(
										getPlaylistShareUrl(detail.playlist.share_token),
									);
									toast.success("Đã sao chép link.");
								}}
							>
								<Copy size={17} /> Chia sẻ
							</button>
						) : null}
					</div>
				</div>
			</section>
			<form className="panel inline-edit-form" onSubmit={save}>
				<input
					name="title"
					defaultValue={detail.playlist.title}
					required
					maxLength={120}
				/>
				<input
					name="description"
					defaultValue={detail.playlist.description ?? ""}
					placeholder="Mô tả"
				/>
				<select name="visibility" defaultValue={detail.playlist.visibility}>
					<option value="private">Riêng tư</option>
					<option value="public">Công khai</option>
				</select>
				<label className="check-row">
					<input
						name="share_enabled"
						type="checkbox"
						defaultChecked={detail.playlist.share_enabled}
					/>{" "}
					Chia sẻ
				</label>
				<button type="submit" className="button subtle" disabled={saving}>
					<Save size={17} /> Lưu
				</button>
			</form>
			<section>
				<div className="section-heading">
					<h2>Danh sách bài hát</h2>
					<span>{songs.length} bài</span>
				</div>
				{songs.length ? (
					<div className="song-list">
						{detail.entries.map((entry, index) => (
							<SongRow
								key={entry.song.id}
								song={entry.song}
								queue={songs}
								index={index}
								onRemove={() => void removeSong(entry.song.id)}
							/>
						))}
					</div>
				) : (
					<EmptyState
						icon={ListMusic}
						title="Playlist đang trống"
						description="Dùng nút thêm playlist ở bất kỳ bài hát nào để đưa nhạc vào đây."
					/>
				)}
			</section>
		</div>
	);
}
