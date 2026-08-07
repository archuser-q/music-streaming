import { createFileRoute } from "@tanstack/react-router";
import { LibraryBig, LoaderCircle, Pencil, Plus, Trash2 } from "lucide-react";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { AdminNav } from "@/features/admin/components/admin-nav";
import { ImageUploadField } from "@/features/admin/components/media-upload-fields";
import { getAdminContent } from "@/features/admin/services/content-service";
import { useAuth } from "@/features/auth/auth-context";
import { getErrorMessage } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import type { AlbumRow, ArtistRow } from "@/lib/supabase/database.types";
import {
	publicStorageUrl,
	removeStorageFiles,
	uploadImage,
} from "@/lib/supabase/storage";

export const Route = createFileRoute("/_authenticated/admin/albums")({
	component: AlbumsAdmin,
});

function AlbumsAdmin() {
	const { user } = useAuth();
	const [albums, setAlbums] = useState<AlbumRow[]>([]);
	const [artists, setArtists] = useState<ArtistRow[]>([]);
	const [editing, setEditing] = useState<AlbumRow | null>(null);
	const [formOpen, setFormOpen] = useState(false);
	const [saving, setSaving] = useState(false);
	const load = useCallback(async () => {
		try {
			const data = await getAdminContent();
			setAlbums(data.albums);
			setArtists(data.artists);
		} catch (error) {
			toast.error(getErrorMessage(error));
		}
	}, []);
	useEffect(() => void load(), [load]);
	const submit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!user) return;
		setSaving(true);
		const form = new FormData(event.currentTarget);
		const file = form.get("cover");
		const removeCover = form.get("remove_cover") === "on";
		let coverPath = editing?.cover_path ?? null;
		let uploaded: string | null = null;
		try {
			if (file instanceof File && file.size) {
				uploaded = await uploadImage(file, user.id);
				coverPath = uploaded;
			} else if (removeCover) {
				coverPath = null;
			}
			const payload = {
				artist_id: String(form.get("artist_id")),
				title: String(form.get("title") ?? "").trim(),
				slug: editing?.slug ?? "",
				description: String(form.get("description") ?? "").trim() || null,
				cover_path: coverPath,
				release_date: String(form.get("release_date") ?? "") || null,
				created_by: editing?.created_by ?? user.id,
			};
			const result = editing
				? await createClient()
						.from("albums")
						.update(payload)
						.eq("id", editing.id)
				: await createClient().from("albums").insert(payload);
			if (result.error) throw result.error;
			if (editing?.cover_path && editing.cover_path !== coverPath)
				await removeStorageFiles("music-covers", [editing?.cover_path]);
			toast.success(editing ? "Đã cập nhật album." : "Đã thêm album.");
			setEditing(null);
			setFormOpen(false);
			await load();
		} catch (error) {
			await removeStorageFiles("music-covers", [uploaded]);
			toast.error(getErrorMessage(error));
		} finally {
			setSaving(false);
		}
	};
	const remove = async (album: AlbumRow) => {
		const songs = await createClient()
			.from("songs")
			.select("id", { count: "exact", head: true })
			.eq("album_id", album.id);
		if ((songs.count ?? 0) > 0) {
			toast.error("Hãy chuyển hoặc xóa các bài hát trong album trước.");
			return;
		}
		if (!window.confirm(`Xóa album “${album.title}”?`)) return;
		const { error } = await createClient()
			.from("albums")
			.delete()
			.eq("id", album.id);
		if (error) toast.error(getErrorMessage(error));
		else {
			await removeStorageFiles("music-covers", [album.cover_path]);
			await load();
			toast.success("Đã xóa album.");
		}
	};
	const artistName = (id: string) =>
		artists.find((artist) => artist.id === id)?.name ?? "Không rõ";
	return (
		<div className="page-stack">
			<AdminNav />
			<div className="section-heading">
				<div>
					<p className="eyebrow">Quản lý nội dung</p>
					<h1>Album</h1>
				</div>
				<button
					type="button"
					className="button primary"
					onClick={() => {
						setEditing(null);
						setFormOpen(true);
					}}
					disabled={!artists.length}
				>
					<Plus size={18} /> Thêm album
				</button>
			</div>
			{!artists.length ? (
				<div className="notice">Hãy thêm nghệ sĩ trước khi tạo album.</div>
			) : null}
			{formOpen ? (
				<form
					key={editing?.id ?? "new-album"}
					className="panel stack-form"
					onSubmit={submit}
				>
					<div className="form-grid two">
						<label>
							<span>Tên album</span>
							<input name="title" required defaultValue={editing?.title} />
						</label>
						<label>
							<span>Nghệ sĩ</span>
							<select
								name="artist_id"
								required
								defaultValue={editing?.artist_id ?? artists[0]?.id}
							>
								{artists.map((artist) => (
									<option key={artist.id} value={artist.id}>
										{artist.name}
									</option>
								))}
							</select>
						</label>
						<label>
							<span>Ngày phát hành</span>
							<input
								name="release_date"
								type="date"
								defaultValue={editing?.release_date ?? ""}
							/>
						</label>
						<ImageUploadField
							name="cover"
							label="Ảnh bìa"
							currentPath={editing?.cover_path}
							removeName="remove_cover"
						/>
					</div>
					<label>
						<span>Mô tả</span>
						<textarea
							name="description"
							rows={4}
							defaultValue={editing?.description ?? ""}
						/>
					</label>
					<div className="button-row">
						<button type="submit" className="button primary" disabled={saving}>
							{saving ? <LoaderCircle className="spin" size={18} /> : null} Lưu
						</button>
						<button
							type="button"
							className="button ghost"
							onClick={() => setFormOpen(false)}
						>
							Hủy
						</button>
					</div>
				</form>
			) : null}
			<div className="admin-table">
				<div className="admin-table-head">
					<span>Album</span>
					<span>Nghệ sĩ</span>
					<span>Phát hành</span>
					<span>Thao tác</span>
				</div>
				{albums.map((album) => (
					<div className="admin-table-row" key={album.id}>
						<div className="table-entity">
							<div className="avatar-placeholder square">
								{album.cover_path ? (
									<img
										src={
											publicStorageUrl("music-covers", album.cover_path) ?? ""
										}
										alt=""
									/>
								) : (
									<LibraryBig size={19} />
								)}
							</div>
							<strong>{album.title}</strong>
						</div>
						<span>{artistName(album.artist_id)}</span>
						<span>{album.release_date ?? "—"}</span>
						<div className="button-row">
							<button
								type="button"
								className="icon-button"
								onClick={() => {
									setEditing(album);
									setFormOpen(true);
								}}
							>
								<Pencil size={17} />
							</button>
							<button
								type="button"
								className="icon-button danger"
								onClick={() => void remove(album)}
							>
								<Trash2 size={17} />
							</button>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
