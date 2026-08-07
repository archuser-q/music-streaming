import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Disc3, ListMusic, Play } from "lucide-react";
import { toPlayerTrack } from "@/features/catalog/catalog-types";
import { SongRow } from "@/features/catalog/components/song-row";
import { getAlbumDetail } from "@/features/catalog/services/catalog-server";
import { usePlayer } from "@/features/player/player-context";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/albums/$albumSlug")({
	loader: async ({ params }) => {
		const detail = await getAlbumDetail({ data: { slug: params.albumSlug } });
		if (!detail) throw notFound();
		return detail;
	},
	head: ({ loaderData }) => ({
		meta: [
			{ title: `${loaderData?.album.title ?? "Album"} — Âm Sắc` },
			{
				name: "description",
				content: loaderData?.album.description ?? "Nghe album trên Âm Sắc.",
			},
		],
	}),
	component: AlbumPage,
});

function AlbumPage() {
	const data = Route.useLoaderData();
	const player = usePlayer();
	return (
		<div className="page-stack">
			<section className="entity-hero album-hero">
				<div className="entity-image">
					{data.album.coverUrl ? (
						<img src={data.album.coverUrl} alt={data.album.title} />
					) : (
						<Disc3 size={66} />
					)}
				</div>
				<div>
					<p className="eyebrow">Album</p>
					<h1>{data.album.title}</h1>
					{data.artist ? (
						<Link
							to="/artists/$artistSlug"
							params={{ artistSlug: data.artist.slug }}
							className="artist-link"
						>
							{data.artist.name}
						</Link>
					) : null}
					<p className="entity-description">
						{data.album.description ?? "Album chưa có mô tả."}
					</p>
					<p className="muted">
						{formatDate(data.album.release_date)} · {data.songs.length} bài hát
					</p>
					{data.songs.length ? (
						<button
							type="button"
							className="button primary"
							onClick={() => player.playQueue(data.songs.map(toPlayerTrack))}
						>
							<Play size={18} fill="currentColor" /> Phát album
						</button>
					) : null}
				</div>
			</section>
			<section>
				<div className="section-heading">
					<h2>Danh sách bài hát</h2>
				</div>
				{data.songs.length ? (
					<div className="song-list">
						{data.songs.map((song, index) => (
							<SongRow
								key={song.id}
								song={song}
								queue={data.songs}
								index={index}
							/>
						))}
					</div>
				) : (
					<div className="empty-inline">
						<ListMusic /> Album chưa có bài hát được phát hành.
					</div>
				)}
			</section>
		</div>
	);
}
