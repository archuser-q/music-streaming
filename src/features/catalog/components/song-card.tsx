import { Heart, ListMusic, Pause, Play } from "lucide-react";
import { useLikedSongs } from "@/features/liked-songs/liked-songs-context";
import { usePlayer } from "@/features/player/player-context";
import { AddToPlaylistButton } from "@/features/playlists/add-to-playlist-button";
import { type CatalogSong, toPlayerTrack } from "../catalog-types";

export function SongCard({
	song,
	queue,
}: {
	song: CatalogSong;
	queue: CatalogSong[];
}) {
	const player = usePlayer();
	const likes = useLikedSongs();
	const isCurrent = player.currentTrack?.id === song.id;
	const toggle = () => {
		if (isCurrent) player.togglePlay();
		else player.playTrack(toPlayerTrack(song), queue.map(toPlayerTrack));
	};

	return (
		<article className="song-card">
			<div className="song-card-cover">
				{song.coverUrl ? (
					<img src={song.coverUrl} alt={`Bìa ${song.title}`} />
				) : (
					<ListMusic size={42} />
				)}
				<button
					type="button"
					className="floating-play"
					onClick={toggle}
					aria-label={`Phát ${song.title}`}
				>
					{isCurrent && player.isPlaying ? (
						<Pause fill="currentColor" />
					) : (
						<Play fill="currentColor" />
					)}
				</button>
			</div>
			<div className="song-card-title-row">
				<div className="truncate">
					<strong>{song.title}</strong>
					<span>{song.artistName}</span>
				</div>
				<button
					type="button"
					className={
						likes.isLiked(song.id) ? "icon-button liked" : "icon-button"
					}
					onClick={() => void likes.toggleLike(song.id)}
					aria-label="Yêu thích"
				>
					<Heart
						size={18}
						fill={likes.isLiked(song.id) ? "currentColor" : "none"}
					/>
				</button>
				<AddToPlaylistButton songId={song.id} />
			</div>
		</article>
	);
}
