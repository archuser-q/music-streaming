import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Disc3, ListMusic, MapPin, Play } from "lucide-react";
import { toPlayerTrack } from "@/features/catalog/catalog-types";
import { SongRow } from "@/features/catalog/components/song-row";
import { getArtistDetail } from "@/features/catalog/services/catalog-server";
import { usePlayer } from "@/features/player/player-context";
import { formatNumber } from "@/lib/format";

export const Route = createFileRoute("/artists/$artistSlug")({
	loader: async ({ params }) => {
		const detail = await getArtistDetail({ data: { slug: params.artistSlug } });
		if (!detail) throw notFound();
		return detail;
	},
	head: ({ loaderData }) => ({
		meta: [
			{ title: `${loaderData?.artist.name ?? "Nghệ sĩ"} — Âm Sắc` },
			{
				name: "description",
				content:
					loaderData?.artist.biography ??
					"Khám phá âm nhạc và album của nghệ sĩ.",
			},
		],
	}),
	component: ArtistPage,
});

function ArtistPage() {
	const data = Route.useLoaderData();
	const player = usePlayer();
	return (
		<div className="page-stack">
			<section className="entity-hero">
				<div className="entity-image round">
					{data.artist.imageUrl ? (
						<img
							src={data.artist.imageUrl}
							alt={data.artist.name ?? "Nghệ sĩ"}
						/>
					) : (
						<Disc3 size={66} />
					)}
				</div>
				<div>
					<p className="eyebrow">
						Nghệ sĩ {data.artist.is_verified ? "· Đã xác minh" : ""}
					</p>
					<h1>{data.artist.name}</h1>
					{data.artist.country ? (
						<p className="muted inline">
							<MapPin size={16} /> {data.artist.country}
						</p>
					) : null}
					<p className="entity-description">
						{data.artist.biography ?? "Nghệ sĩ chưa cập nhật tiểu sử."}
					</p>
					<div className="stat-row">
						<span>
							<strong>{formatNumber(data.artist.song_count ?? 0)}</strong> bài
							hát
						</span>
						<span>
							<strong>{formatNumber(data.artist.album_count ?? 0)}</strong>{" "}
							album
						</span>
						<span>
							<strong>{formatNumber(data.artist.total_plays ?? 0)}</strong> lượt
							nghe
						</span>
					</div>
					{data.songs.length ? (
						<button
							type="button"
							className="button primary"
							onClick={() => player.playQueue(data.songs.map(toPlayerTrack))}
						>
							<Play size={18} fill="currentColor" /> Phát tất cả
						</button>
					) : null}
				</div>
			</section>
			<section>
				<div className="section-heading">
					<h2>Bài hát nổi bật</h2>
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
					<p className="muted">Chưa có bài hát được phát hành.</p>
				)}
			</section>
			<section>
				<div className="section-heading">
					<h2>Album</h2>
				</div>
				<div className="album-grid">
					{data.albums.map((album) => (
						<Link
							key={album.id}
							to="/albums/$albumSlug"
							params={{ albumSlug: album.slug }}
							className="album-card"
						>
							<div>
								{album.coverUrl ? (
									<img src={album.coverUrl} alt={album.title} />
								) : (
									<ListMusic size={38} />
								)}
							</div>
							<strong>{album.title}</strong>
							<span>{album.release_date?.slice(0, 4) ?? "Chưa phát hành"}</span>
						</Link>
					))}
				</div>
			</section>
		</div>
	);
}
