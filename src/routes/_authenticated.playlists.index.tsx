import { createFileRoute, Link } from "@tanstack/react-router";
import { Copy, ListMusic, LoaderCircle, Plus, Trash2 } from "lucide-react";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/ui/empty-state";
import { useAuth } from "@/features/auth/auth-context";
import type { PlaylistWithCover } from "@/features/catalog/catalog-types";
import {
	getOwnPlaylists,
	savePlaylist,
} from "@/features/playlists/playlist-service";
import { getPlaylistShareUrl } from "@/lib/config/app-url";
import { getErrorMessage } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import { removeStorageFiles, uploadImage } from "@/lib/supabase/storage";

export const Route = createFileRoute("/_authenticated/playlists/")({
	component: PlaylistsPage,
});

function PlaylistsPage() {
	const { user } = useAuth();
	const [playlists, setPlaylists] = useState<PlaylistWithCover[]>([]);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [editing, setEditing] = useState<PlaylistWithCover | null>(null);
	const [formOpen, setFormOpen] = useState(false);

	const load = useCallback(async () => {
		if (!user) return;
		try {
			setPlaylists(await getOwnPlaylists(user.id));
		} catch (error) {
			toast.error(getErrorMessage(error));
		} finally {
			setLoading(false);
		}
	}, [user]);

	useEffect(() => void load(), [load]);
	useEffect(() => {
		if (!user) return;
		const channel = createClient()
			.channel(`playlists:${user.id}`)
			.on(
				"postgres_changes",
				{
					event: "*",
					schema: "public",
					table: "playlists",
					filter: `owner_id=eq.${user.id}`,
				},
				() => void load(),
			)
			.subscribe();
		return () => {
			void createClient().removeChannel(channel);
		};
	}, [load, user]);

	const submit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!user) return;
		setSaving(true);
		const form = new FormData(event.currentTarget);
		const file = form.get("cover");
		let newCoverPath: string | null = editing?.cover_path ?? null;
		try {
			if (file instanceof File && file.size)
				newCoverPath = await uploadImage(file, user.id);
			await savePlaylist({
				ownerId: user.id,
				playlist: {
					id: editing?.id,
					title: String(form.get("title") ?? "").trim(),
					description: String(form.get("description") ?? "").trim() || null,
					visibility:
						form.get("visibility") === "public" ? "public" : "private",
					share_enabled: form.get("share_enabled") === "on",
					cover_path: newCoverPath,
				},
			});
			if (newCoverPath !== editing?.cover_path)
				await removeStorageFiles("music-covers", [editing?.cover_path]);
			toast.success(editing ? "Đã cập nhật playlist." : "Đã tạo playlist.");
			setEditing(null);
			setFormOpen(false);
			await load();
		} catch (error) {
			if (newCoverPath !== editing?.cover_path)
				await removeStorageFiles("music-covers", [newCoverPath]);
			toast.error(getErrorMessage(error));
		} finally {
			setSaving(false);
		}
	};

	const remove = async (playlist: PlaylistWithCover) => {
		if (!window.confirm(`Xóa playlist “${playlist.title}”?`)) return;
		const { error } = await createClient()
			.from("playlists")
			.delete()
			.eq("id", playlist.id);
		if (error) toast.error(getErrorMessage(error));
		else {
			await removeStorageFiles("music-covers", [playlist.cover_path]);
			toast.success("Đã xóa playlist.");
			await load();
		}
	};

	return (
		<div className="page-stack">
			<div className="section-heading">
				<div>
					<p className="eyebrow">Thư viện cá nhân</p>
					<h1>Playlist của bạn</h1>
				</div>
				<button
					type="button"
					className="button primary"
					onClick={() => {
						setEditing(null);
						setFormOpen(true);
					}}
				>
					<Plus size={18} /> Tạo playlist
				</button>
			</div>
			{formOpen ? (
				<form className="panel stack-form" onSubmit={submit}>
					<div className="section-heading">
						<h2>{editing ? "Sửa playlist" : "Playlist mới"}</h2>
						<button
							type="button"
							className="text-button"
							onClick={() => setFormOpen(false)}
						>
							Đóng
						</button>
					</div>
					<div className="form-grid two">
						<label>
							<span>Tên playlist</span>
							<input
								name="title"
								required
								maxLength={120}
								defaultValue={editing?.title}
							/>
						</label>
						<label>
							<span>Quyền riêng tư</span>
							<select
								name="visibility"
								defaultValue={editing?.visibility ?? "private"}
							>
								<option value="private">Riêng tư</option>
								<option value="public">Công khai</option>
							</select>
						</label>
					</div>
					<label>
						<span>Mô tả</span>
						<textarea
							name="description"
							rows={3}
							defaultValue={editing?.description ?? ""}
						/>
					</label>
					<label>
						<span>Ảnh bìa</span>
						<input
							type="file"
							name="cover"
							accept="image/jpeg,image/png,image/webp"
						/>
					</label>
					<label className="check-row">
						<input
							type="checkbox"
							name="share_enabled"
							defaultChecked={editing?.share_enabled}
						/>{" "}
						Cho phép chia sẻ qua link
					</label>
					<button type="submit" className="button primary" disabled={saving}>
						{saving ? <LoaderCircle className="spin" size={18} /> : null} Lưu
						playlist
					</button>
				</form>
			) : null}
			{loading ? (
				<div className="loading-state">
					<LoaderCircle className="spin" /> Đang tải...
				</div>
			) : playlists.length ? (
				<div className="playlist-grid">
					{playlists.map((playlist) => (
						<article className="playlist-card" key={playlist.id}>
							<Link
								to="/playlists/$playlistId"
								params={{ playlistId: playlist.id }}
								className="playlist-cover"
							>
								{playlist.coverUrl ? (
									<img src={playlist.coverUrl} alt={playlist.title} />
								) : (
									<ListMusic size={44} />
								)}
							</Link>
							<div>
								<Link
									to="/playlists/$playlistId"
									params={{ playlistId: playlist.id }}
								>
									<strong>{playlist.title}</strong>
								</Link>
								<span>
									{playlist.visibility === "public" ? "Công khai" : "Riêng tư"}
								</span>
							</div>
							<div className="card-actions">
								<button
									type="button"
									className="text-button"
									onClick={() => {
										setEditing(playlist);
										setFormOpen(true);
									}}
								>
									Sửa
								</button>
								{playlist.share_enabled ? (
									<button
										type="button"
										className="icon-button"
										aria-label="Sao chép link"
										onClick={() => {
											void navigator.clipboard.writeText(
												getPlaylistShareUrl(playlist.share_token),
											);
											toast.success("Đã sao chép link.");
										}}
									>
										<Copy size={17} />
									</button>
								) : null}
								<button
									type="button"
									className="icon-button danger"
									aria-label="Xóa"
									onClick={() => void remove(playlist)}
								>
									<Trash2 size={17} />
								</button>
							</div>
						</article>
					))}
				</div>
			) : (
				<EmptyState
					icon={ListMusic}
					title="Chưa có playlist"
					description="Tạo playlist đầu tiên và thêm những bài hát bạn yêu thích."
					action={
						<button
							type="button"
							className="button primary"
							onClick={() => setFormOpen(true)}
						>
							<Plus size={18} /> Tạo playlist
						</button>
					}
				/>
			)}
		</div>
	);
}
