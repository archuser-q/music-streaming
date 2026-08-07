import { createFileRoute } from "@tanstack/react-router";
import { Heart, LoaderCircle, Play } from "lucide-react";
import { useEffect, useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import {
	type CatalogSong,
	toPlayerTrack,
} from "@/features/catalog/catalog-types";
import { SongRow } from "@/features/catalog/components/song-row";
import { getCatalogSongsByIds } from "@/features/catalog/services/catalog-client";
import { useLikedSongs } from "@/features/liked-songs/liked-songs-context";
import { usePlayer } from "@/features/player/player-context";

export const Route = createFileRoute("/_authenticated/liked")({
	component: LikedPage,
});

function LikedPage() {
	const likes = useLikedSongs();
	const player = usePlayer();
	const [songs, setSongs] = useState<CatalogSong[]>([]);
	const [loading, setLoading] = useState(true);
	useEffect(() => {
		void getCatalogSongsByIds([...likes.likedIds])
			.then(setSongs)
			.finally(() => setLoading(false));
	}, [likes.likedIds]);
	return (
		<div className="page-stack">
			<div className="section-heading">
				<div>
					<p className="eyebrow">Thư viện cá nhân</p>
					<h1>Bài hát yêu thích</h1>
				</div>
				{songs.length ? (
					<button
						type="button"
						className="button primary"
						onClick={() => player.playQueue(songs.map(toPlayerTrack))}
					>
						<Play size={18} fill="currentColor" /> Phát tất cả
					</button>
				) : null}
			</div>
			{loading ? (
				<div className="loading-state">
					<LoaderCircle className="spin" /> Đang tải...
				</div>
			) : songs.length ? (
				<div className="song-list">
					{songs.map((song, index) => (
						<SongRow key={song.id} song={song} queue={songs} index={index} />
					))}
				</div>
			) : (
				<EmptyState
					icon={Heart}
					title="Chưa có bài hát yêu thích"
					description="Nhấn biểu tượng trái tim ở một bài hát để lưu vào đây."
				/>
			)}
		</div>
	);
}
