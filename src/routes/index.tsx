import {
	createFileRoute,
	Link,
	stripSearchParams,
} from "@tanstack/react-router";
import {
	ChevronLeft,
	ChevronRight,
	Disc3,
	Music2,
	Sparkles,
} from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { SongCard } from "@/features/catalog/components/song-card";
import { getCatalogPage } from "@/features/catalog/services/catalog-server";
import {
	catalogSearchSchema,
	emptyCatalogSearch,
} from "@/features/search/search-params";
import { getAbsoluteAppUrl } from "@/lib/config/app-url";
import { createSocialMeta } from "@/lib/seo/social-meta";

export const Route = createFileRoute("/")({
	validateSearch: catalogSearchSchema,
	search: { middlewares: [stripSearchParams(emptyCatalogSearch)] },
	loaderDeps: ({ search }) => ({
		page: search.page,
		genre: search.genre,
		artist: search.artist,
		album: search.album,
	}),
	loader: ({ deps }) => getCatalogPage({ data: deps }),
	head: () => {
		const url = getAbsoluteAppUrl("/");
		return {
			meta: createSocialMeta({
				title: "Âm Sắc — Music Streaming",
				description:
					"Nghe nhạc, khám phá nghệ sĩ, album và tạo playlist của riêng bạn trên Âm Sắc.",
				url,
				imageAlt: "Âm Sắc — không gian âm nhạc trực tuyến",
			}),
			links: [{ rel: "canonical", href: url }],
		};
	},
	component: HomePage,
});

function HomePage() {
	const data = Route.useLoaderData();
	const search = Route.useSearch();
	const navigate = Route.useNavigate();
	const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));

	const updateFilter = (key: "genre" | "artist" | "album", value: string) => {
		void navigate({
			search: (previous) => ({ ...previous, [key]: value, page: 1 }),
		});
	};

	return (
		<div className="page-stack">
			<section className="hero-card">
				<div className="hero-glow" />
				<div className="hero-content">
					<p className="eyebrow">
						<Sparkles size={15} /> Không gian âm nhạc của bạn
					</p>
					<h1>
						Nghe điều bạn yêu.
						<br />
						Khám phá điều mới.
					</h1>
					<p>
						Hàng ngàn giai điệu, playlist cá nhân và nghệ sĩ đang chờ bạn khám
						phá.
					</p>
					<div className="hero-actions">
						<Link to="/search" search={{ q: "" }} className="button primary">
							<Music2 size={18} /> Tìm nhạc ngay
						</Link>
						<Link to="/playlists" className="button ghost">
							Playlist của tôi
						</Link>
					</div>
				</div>
				<div className="hero-disc">
					<Disc3 size={132} />
				</div>
			</section>

			<section>
				<div className="section-heading">
					<div>
						<p className="eyebrow">Danh mục</p>
						<h2>Khám phá bài hát</h2>
					</div>
					<span className="result-count">{data.total} bài hát</span>
				</div>
				<div className="filter-bar">
					<label>
						<span>Thể loại</span>
						<select
							value={search.genre}
							onChange={(event) => updateFilter("genre", event.target.value)}
						>
							<option value="">Tất cả thể loại</option>
							{data.genres.map((genre) => (
								<option key={genre.id} value={genre.slug}>
									{genre.name}
								</option>
							))}
						</select>
					</label>
					<label>
						<span>Nghệ sĩ</span>
						<select
							value={search.artist}
							onChange={(event) => updateFilter("artist", event.target.value)}
						>
							<option value="">Tất cả nghệ sĩ</option>
							{data.artists.map((artist) => (
								<option key={artist.id} value={artist.slug}>
									{artist.name}
								</option>
							))}
						</select>
					</label>
					<label>
						<span>Album</span>
						<select
							value={search.album}
							onChange={(event) => updateFilter("album", event.target.value)}
						>
							<option value="">Tất cả album</option>
							{data.albums.map((album) => (
								<option key={album.id} value={album.slug}>
									{album.title}
								</option>
							))}
						</select>
					</label>
					{search.genre || search.artist || search.album ? (
						<button
							type="button"
							className="button subtle"
							onClick={() =>
								void navigate({
									search: { page: 1, genre: "", artist: "", album: "" },
								})
							}
						>
							Xóa bộ lọc
						</button>
					) : null}
				</div>

				{data.songs.length ? (
					<div className="song-grid">
						{data.songs.map((song) => (
							<SongCard key={song.id} song={song} queue={data.songs} />
						))}
					</div>
				) : (
					<EmptyState
						icon={Music2}
						title="Chưa có bài hát phù hợp"
						description="Thử thay đổi bộ lọc hoặc quay lại sau khi quản trị viên thêm nội dung."
					/>
				)}

				{totalPages > 1 ? (
					<div className="pagination">
						<Link
							from={Route.fullPath}
							to="."
							search={(previous) => ({
								...previous,
								page: Math.max(1, previous.page - 1),
							})}
							disabled={data.page === 1}
						>
							<ChevronLeft size={18} /> Trước
						</Link>
						<span>
							Trang {data.page} / {totalPages}
						</span>
						<Link
							from={Route.fullPath}
							to="."
							search={(previous) => ({
								...previous,
								page: Math.min(totalPages, previous.page + 1),
							})}
							disabled={data.page >= totalPages}
						>
							Sau <ChevronRight size={18} />
						</Link>
					</div>
				) : null}
			</section>
		</div>
	);
}
