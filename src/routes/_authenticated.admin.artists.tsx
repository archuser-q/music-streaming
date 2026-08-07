import { createFileRoute } from "@tanstack/react-router";
import { LoaderCircle, Mic2, Pencil, Plus, Trash2 } from "lucide-react";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { AdminNav } from "@/features/admin/components/admin-nav";
import { ImageUploadField } from "@/features/admin/components/media-upload-fields";
import {
	getAdminContent,
	slugifyContentName,
} from "@/features/admin/services/content-service";
import { useAuth } from "@/features/auth/auth-context";
import { getErrorMessage } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import type { ArtistRow } from "@/lib/supabase/database.types";
import {
	publicStorageUrl,
	removeStorageFiles,
	uploadImage,
} from "@/lib/supabase/storage";

export const Route = createFileRoute("/_authenticated/admin/artists")({
	component: ArtistsAdmin,
});

function ArtistsAdmin() {
	const { user } = useAuth();
	const [artists, setArtists] = useState<ArtistRow[]>([]);
	const [editing, setEditing] = useState<ArtistRow | null>(null);
	const [formOpen, setFormOpen] = useState(false);
	const [saving, setSaving] = useState(false);
	const load = useCallback(async () => {
		try {
			setArtists((await getAdminContent()).artists);
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
		const file = form.get("image");
		const removeImage = form.get("remove_image") === "on";
		let imagePath = editing?.image_path ?? null;
		let uploaded: string | null = null;
		try {
			if (file instanceof File && file.size) {
				uploaded = await uploadImage(file, user.id);
				imagePath = uploaded;
			} else if (removeImage) {
				imagePath = null;
			}
			const name = String(form.get("name") ?? "").trim();
			const generatedSlug =
				slugifyContentName(name) ||
				`nghe-si-${crypto.randomUUID().slice(0, 8)}`;
			const payload = {
				name,
				slug: editing?.slug ?? generatedSlug,
				biography: String(form.get("biography") ?? "").trim() || null,
				country: String(form.get("country") ?? "").trim() || null,
				image_path: imagePath,
				is_verified: form.get("verified") === "on",
				created_by: editing?.created_by ?? user.id,
			};
			const result = editing
				? await createClient()
						.from("artists")
						.update(payload)
						.eq("id", editing.id)
				: await createClient().from("artists").insert(payload);
			if (result.error) throw result.error;
			if (editing?.image_path && editing.image_path !== imagePath)
				await removeStorageFiles("music-covers", [editing?.image_path]);
			toast.success(editing ? "Đã cập nhật nghệ sĩ." : "Đã thêm nghệ sĩ.");
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

	const remove = async (artist: ArtistRow) => {
		const [songs, albums] = await Promise.all([
			createClient()
				.from("songs")
				.select("id", { count: "exact", head: true })
				.eq("artist_id", artist.id),
			createClient()
				.from("albums")
				.select("id", { count: "exact", head: true })
				.eq("artist_id", artist.id),
		]);
		if ((songs.count ?? 0) > 0 || (albums.count ?? 0) > 0) {
			toast.error("Hãy chuyển hoặc xóa bài hát và album liên quan trước.");
			return;
		}
		if (!window.confirm(`Xóa nghệ sĩ “${artist.name}”?`)) return;
		const { error } = await createClient()
			.from("artists")
			.delete()
			.eq("id", artist.id);
		if (error) toast.error(getErrorMessage(error));
		else {
			await removeStorageFiles("music-covers", [artist.image_path]);
			await load();
			toast.success("Đã xóa nghệ sĩ.");
		}
	};

	return (
		<div className="page-stack">
			<AdminNav />
			<div className="section-heading">
				<div>
					<p className="eyebrow">Quản lý nội dung</p>
					<h1>Nghệ sĩ</h1>
				</div>
				<button
					type="button"
					className="button primary"
					onClick={() => {
						setEditing(null);
						setFormOpen(true);
					}}
				>
					<Plus size={18} /> Thêm nghệ sĩ
				</button>
			</div>
			{formOpen ? (
				<form
					key={editing?.id ?? "new-artist"}
					className="panel stack-form"
					onSubmit={submit}
				>
					<div className="form-grid two">
						<label>
							<span>Tên nghệ sĩ</span>
							<input name="name" required defaultValue={editing?.name} />
						</label>
						<label>
							<span>Quốc gia</span>
							<input name="country" defaultValue={editing?.country ?? ""} />
						</label>
					</div>
					<label>
						<span>Tiểu sử</span>
						<textarea
							name="biography"
							rows={5}
							defaultValue={editing?.biography ?? ""}
						/>
					</label>
					<ImageUploadField
						name="image"
						label="Ảnh nghệ sĩ"
						currentPath={editing?.image_path}
						removeName="remove_image"
					/>
					<label className="check-row">
						<input
							name="verified"
							type="checkbox"
							defaultChecked={editing?.is_verified}
						/>{" "}
						Nghệ sĩ đã xác minh
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
					<span>Nghệ sĩ</span>
					<span>Quốc gia</span>
					<span>Xác minh</span>
					<span>Thao tác</span>
				</div>
				{artists.map((artist) => (
					<div className="admin-table-row" key={artist.id}>
						<div className="table-entity">
							<div className="avatar-placeholder">
								{artist.image_path ? (
									<img
										src={
											publicStorageUrl("music-covers", artist.image_path) ?? ""
										}
										alt=""
									/>
								) : (
									<Mic2 size={19} />
								)}
							</div>
							<strong>{artist.name}</strong>
						</div>
						<span>{artist.country ?? "—"}</span>
						<span>{artist.is_verified ? "Có" : "Không"}</span>
						<div className="button-row">
							<button
								type="button"
								className="icon-button"
								onClick={() => {
									setEditing(artist);
									setFormOpen(true);
								}}
							>
								<Pencil size={17} />
							</button>
							<button
								type="button"
								className="icon-button danger"
								onClick={() => void remove(artist)}
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
