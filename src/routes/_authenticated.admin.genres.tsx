import { createFileRoute } from "@tanstack/react-router";
import { LoaderCircle, Pencil, Plus, Search, Tags, Trash2 } from "lucide-react";
import {
	type FormEvent,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from "react";
import { toast } from "sonner";
import { AdminNav } from "@/features/admin/components/admin-nav";
import {
	type AdminGenre,
	deleteGenre,
	getAdminGenres,
	saveGenre,
} from "@/features/admin/services/content-service";
import { getErrorMessage } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/genres")({
	component: GenresAdmin,
});

function GenresAdmin() {
	const [genres, setGenres] = useState<AdminGenre[]>([]);
	const [editing, setEditing] = useState<AdminGenre | null>(null);
	const [formOpen, setFormOpen] = useState(false);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [query, setQuery] = useState("");

	const load = useCallback(async () => {
		setLoading(true);
		try {
			setGenres(await getAdminGenres());
		} catch (error) {
			toast.error(getErrorMessage(error));
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => void load(), [load]);

	const filteredGenres = useMemo(() => {
		const normalizedQuery = query.trim().toLocaleLowerCase("vi");
		if (!normalizedQuery) return genres;
		return genres.filter((genre) =>
			[genre.name, genre.slug, genre.description]
				.filter(Boolean)
				.some((value) =>
					value?.toLocaleLowerCase("vi").includes(normalizedQuery),
				),
		);
	}, [genres, query]);

	const submit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setSaving(true);
		const form = new FormData(event.currentTarget);
		try {
			await saveGenre({
				current: editing,
				name: String(form.get("name") ?? ""),
				description: String(form.get("description") ?? ""),
			});
			toast.success(editing ? "Đã cập nhật thể loại." : "Đã thêm thể loại.");
			setEditing(null);
			setFormOpen(false);
			await load();
		} catch (error) {
			toast.error(getErrorMessage(error));
		} finally {
			setSaving(false);
		}
	};

	const remove = async (genre: AdminGenre) => {
		if (!window.confirm(`Xóa thể loại “${genre.name}”?`)) return;
		try {
			await deleteGenre(genre);
			toast.success("Đã xóa thể loại.");
			await load();
		} catch (error) {
			toast.error(getErrorMessage(error));
		}
	};

	return (
		<div className="page-stack">
			<AdminNav />
			<div className="section-heading">
				<div>
					<p className="eyebrow">Phân loại nội dung</p>
					<h1>Thể loại</h1>
				</div>
				<button
					type="button"
					className="button primary"
					onClick={() => {
						setEditing(null);
						setFormOpen(true);
					}}
				>
					<Plus size={18} /> Thêm thể loại
				</button>
			</div>
			<div className="admin-toolbar">
				<label className="search-box">
					<Search size={18} />
					<input
						type="search"
						value={query}
						onChange={(event) => setQuery(event.target.value)}
						placeholder="Tìm theo tên, slug hoặc mô tả"
						aria-label="Tìm thể loại"
					/>
				</label>
				<span className="result-count">{filteredGenres.length} thể loại</span>
			</div>
			{formOpen ? (
				<form
					key={editing?.id ?? "new-genre"}
					className="panel stack-form"
					onSubmit={submit}
				>
					<div className="section-heading">
						<h2>{editing ? `Sửa “${editing.name}”` : "Thể loại mới"}</h2>
						<button
							type="button"
							className="text-button"
							onClick={() => setFormOpen(false)}
						>
							Đóng
						</button>
					</div>
					<label>
						<span>Tên thể loại</span>
						<input
							name="name"
							required
							minLength={2}
							maxLength={80}
							defaultValue={editing?.name}
						/>
					</label>
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
			{loading ? (
				<div className="loading-state">
					<LoaderCircle className="spin" /> Đang tải...
				</div>
			) : (
				<div className="admin-table genres-table">
					<div className="admin-table-head">
						<span>Thể loại</span>
						<span>Slug</span>
						<span>Bài hát</span>
						<span>Thao tác</span>
					</div>
					{filteredGenres.map((genre) => (
						<div className="admin-table-row" key={genre.id}>
							<div className="table-entity">
								<div className="avatar-placeholder square">
									<Tags size={18} />
								</div>
								<div className="truncate">
									<strong>{genre.name}</strong>
									<small>{genre.description ?? "Chưa có mô tả"}</small>
								</div>
							</div>
							<code>{genre.slug}</code>
							<span>{genre.songCount}</span>
							<div className="button-row">
								<button
									type="button"
									className="icon-button"
									aria-label={`Sửa ${genre.name}`}
									onClick={() => {
										setEditing(genre);
										setFormOpen(true);
									}}
								>
									<Pencil size={17} />
								</button>
								<button
									type="button"
									className="icon-button danger"
									aria-label={`Xóa ${genre.name}`}
									disabled={genre.songCount > 0}
									onClick={() => void remove(genre)}
								>
									<Trash2 size={17} />
								</button>
							</div>
						</div>
					))}
					{!filteredGenres.length ? (
						<div className="empty-inline">Không có thể loại phù hợp.</div>
					) : null}
				</div>
			)}
		</div>
	);
}
