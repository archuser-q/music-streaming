import {
	createFileRoute,
	Link,
	stripSearchParams,
} from "@tanstack/react-router";
import { Album, Disc3, Music2, Play, Search, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { z } from "zod";
import { EmptyState } from "@/components/ui/empty-state";
import { toPlayerTrack } from "@/features/catalog/catalog-types";
import { searchCatalog } from "@/features/catalog/services/catalog-server";
import { usePlayer } from "@/features/player/player-context";

const searchSchema = z.object({ q: z.string().max(120).catch("") });

export const Route = createFileRoute("/search")({
	validateSearch: searchSchema,
	search: { middlewares: [stripSearchParams({ q: "" })] },
	loaderDeps: ({ search }) => ({ query: search.q.trim() }),
	loader: ({ deps }) => searchCatalog({ data: deps }),
	component: SearchPage,
});

function SearchPage() {
	const search = Route.useSearch();
	const results = Route.useLoaderData();
	const navigate = Route.useNavigate();
	const player = usePlayer();
	const [query, setQuery] = useState(search.q);

	useEffect(() => setQuery(search.q), [search.q]);
	useEffect(() => {
		const timeout = window.setTimeout(() => {
			if (query.trim() !== search.q) {
				void navigate({ search: { q: query.trim() }, replace: true });
			}
		}, 300);
		return () => window.clearTimeout(timeout);
	}, [navigate, query, search.q]);

	const songs = results.flatMap((result) => (result.song ? [result.song] : []));
	const groups = [
		{
			type: "song" as const,
			label: "Bài hát",
			items: results.filter((result) => result.type === "song"),
		},
		{
			type: "artist" as const,
			label: "Nghệ sĩ",
			items: results.filter((result) => result.type === "artist"),
		},
		{
			type: "album" as const,
			label: "Album",
			items: results.filter((result) => result.type === "album"),
		},
	];

	const renderResult = (result: (typeof results)[number]) => {
		const Icon =
			result.type === "song"
				? Music2
				: result.type === "artist"
					? UserRound
					: Album;
		const content = (
			<>
				<div className="search-result-image">
					{result.imageUrl ? (
						<img src={result.imageUrl} alt="" />
					) : (
						<Icon size={24} />
					)}
				</div>
				<div className="truncate grow">
					<strong>{result.title}</strong>
					<span>{result.subtitle}</span>
				</div>
			</>
		);
		const key = `${result.type}-${result.id}`;
		const song = result.song;
		if (result.type === "song" && song) {
			return (
				<button
					type="button"
					key={key}
					className="search-result"
					onClick={() =>
						player.playTrack(toPlayerTrack(song), songs.map(toPlayerTrack))
					}
				>
					{content}
					<Play size={19} fill="currentColor" />
				</button>
			);
		}
		if (result.type === "artist" && result.slug) {
			return (
				<Link
					key={key}
					className="search-result"
					to="/artists/$artistSlug"
					params={{ artistSlug: result.slug }}
				>
					{content}
				</Link>
			);
		}
		if (result.type === "album" && result.slug) {
			return (
				<Link
					key={key}
					className="search-result"
					to="/albums/$albumSlug"
					params={{ albumSlug: result.slug }}
				>
					{content}
				</Link>
			);
		}
		return null;
	};

	return (
		<div className="page-stack narrow-page">
			<div className="page-title">
				<p className="eyebrow">Tìm kiếm toàn bộ thư viện</p>
				<h1>Tìm bài hát, nghệ sĩ, album</h1>
			</div>
			<label className="search-box">
				<Search size={22} />
				<input
					value={query}
					onChange={(event) => setQuery(event.target.value)}
					placeholder="Nhập tên bài hát, nghệ sĩ hoặc album..."
				/>
			</label>
			{!search.q ? (
				<EmptyState
					icon={Search}
					title="Bạn muốn nghe gì?"
					description="Nhập từ khóa để tìm kiếm trong toàn bộ danh mục âm nhạc."
				/>
			) : results.length ? (
				<div className="search-results">
					{groups.map((group) =>
						group.items.length ? (
							<section className="search-group" key={group.type}>
								<div className="search-group-heading">
									<h2>{group.label}</h2>
									<span>{group.items.length} kết quả</span>
								</div>
								<div className="search-group-items">
									{group.items.map(renderResult)}
								</div>
							</section>
						) : null,
					)}
				</div>
			) : (
				<EmptyState
					icon={Disc3}
					title="Không tìm thấy kết quả"
					description={`Không có kết quả phù hợp với “${search.q}”.`}
				/>
			)}
		</div>
	);
}
