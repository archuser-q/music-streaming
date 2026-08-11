import { createFileRoute, notFound, useRouter } from "@tanstack/react-router";
import { ListMusic, Play, UserRound } from "lucide-react";
import { useEffect } from "react";
import { getSharedPlaylist } from "@/features/catalog/services/catalog-server";
import { usePlayer } from "@/features/player/player-context";
import { getPlaylistShareUrl } from "@/lib/config/app-url";
import { formatDuration } from "@/lib/format";
import {
	createSocialMeta,
	getDefaultSocialImageUrl,
	serializeStructuredData,
} from "@/lib/seo/social-meta";
import { createClient } from "@/lib/supabase/client";

export const Route = createFileRoute("/share/playlists/$shareToken")({
	loader: async ({ params }) => {
		const playlist = await getSharedPlaylist({
			data: { shareToken: params.shareToken },
		});
		if (!playlist) throw notFound();
		return playlist;
	},
	head: ({ loaderData, params }) => {
		const playlistTitle = loaderData?.title ?? "Playlist";
		const title = `${playlistTitle} — Âm Sắc`;
		const ownerName =
			loaderData?.owner.displayName ??
			loaderData?.owner.username ??
			"người dùng";
		const description =
			loaderData?.description || `Nghe playlist của ${ownerName} trên Âm Sắc.`;
		const url = getPlaylistShareUrl(params.shareToken);
		const imageUrl = loaderData?.coverUrl || getDefaultSocialImageUrl();
		return {
			meta: createSocialMeta({
				title,
				description,
				url,
				imageUrl,
				imageAlt: `Ảnh bìa playlist ${playlistTitle}`,
				type: "music.playlist",
				robots:
					loaderData?.visibility === "public"
						? "index,follow"
						: "noindex,nofollow",
			}),
			links: [{ rel: "canonical", href: url }],
			scripts: [
				{
					type: "application/ld+json",
					children: serializeStructuredData({
						"@context": "https://schema.org",
						"@type": "MusicPlaylist",
						name: playlistTitle,
						description,
						url,
						image: imageUrl,
						numTracks: loaderData?.songs.length ?? 0,
						creator: { "@type": "Person", name: ownerName },
					}),
				},
			],
		};
	},
	component: SharedPlaylistPage,
});

function SharedPlaylistPage() {
	const playlist = Route.useLoaderData();
	const router = useRouter();
	const player = usePlayer();
	useEffect(() => {
		const refresh = () => void router.invalidate();
		window.addEventListener("focus", refresh);
		if (playlist.visibility === "public") {
			const supabase = createClient();
			const channel = supabase
				.channel(`shared:${playlist.id}`)
				.on(
					"postgres_changes",
					{
						event: "*",
						schema: "public",
						table: "playlist_songs",
						filter: `playlist_id=eq.${playlist.id}`,
					},
					refresh,
				)
				.on(
					"postgres_changes",
					{
						event: "*",
						schema: "public",
						table: "playlists",
						filter: `id=eq.${playlist.id}`,
					},
					refresh,
				)
				.subscribe();
			return () => {
				window.removeEventListener("focus", refresh);
				void supabase.removeChannel(channel);
			};
		}
		const interval = window.setInterval(refresh, 15_000);
		return () => {
			window.removeEventListener("focus", refresh);
			window.clearInterval(interval);
		};
	}, [playlist.id, playlist.visibility, router]);

	return (
		<div className="page-stack">
			<section className="entity-hero">
				<div className="entity-image">
					{playlist.coverUrl ? (
						<img src={playlist.coverUrl} alt={playlist.title} />
					) : (
						<ListMusic size={62} />
					)}
				</div>
				<div>
					<p className="eyebrow">Playlist được chia sẻ</p>
					<h1>{playlist.title}</h1>
					<p className="entity-description">
						{playlist.description ?? "Không có mô tả."}
					</p>
					<p className="muted inline">
						<UserRound size={16} />{" "}
						{playlist.owner.displayName ?? playlist.owner.username} ·{" "}
						{playlist.songs.length} bài hát
					</p>
					{playlist.songs.length ? (
						<button
							type="button"
							className="button primary"
							onClick={() => player.playQueue(playlist.songs)}
						>
							<Play size={18} fill="currentColor" /> Phát tất cả
						</button>
					) : null}
				</div>
			</section>
			<section>
				<div className="section-heading">
					<h2>Danh sách bài hát</h2>
				</div>
				<div className="shared-song-list">
					{playlist.songs.map((song, index) => (
						<button
							type="button"
							key={song.id}
							className="shared-song-row"
							onClick={() => player.playTrack(song, playlist.songs)}
						>
							<span>{index + 1}</span>
							<div className="truncate grow">
								<strong>{song.title}</strong>
								<small>
									{song.artistName} · {song.albumTitle ?? "Đĩa đơn"}
								</small>
							</div>
							<span>{formatDuration(song.durationSeconds)}</span>
							<Play size={17} />
						</button>
					))}
				</div>
			</section>
		</div>
	);
}
