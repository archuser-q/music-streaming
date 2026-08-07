import { Heart, ListMusic, Pause, Play } from "lucide-react";
import { useLikedSongs } from "@/features/liked-songs/liked-songs-context";
import { usePlayer } from "@/features/player/player-context";
import { AddToPlaylistButton } from "@/features/playlists/add-to-playlist-button";
import { formatDuration, formatNumber } from "@/lib/format";
import {
	type CatalogSong,
	type PlayerTrack,
	toPlayerTrack,
} from "../catalog-types";

export function SongRow({
	song,
	queue,
	index,
	onRemove,
}: {
	song: CatalogSong;
	queue?: CatalogSong[] | PlayerTrack[];
	index?: number;
	onRemove?: () => void;
}) {
	const player = usePlayer();
	const likes = useLikedSongs();
	const isCurrent = player.currentTrack?.id === song.id;
	const queueTracks = queue?.map((item) =>
		"slug" in item ? toPlayerTrack(item) : item,
	);

	const toggle = () => {
		if (isCurrent) player.togglePlay();
		else player.playTrack(toPlayerTrack(song), queueTracks);
	};

	return (
		<div className={isCurrent ? "song-row current" : "song-row"}>
			<button
				type="button"
				className="song-play-cover"
				onClick={toggle}
				aria-label={`Phát ${song.title}`}
			>
				{song.coverUrl ? (
					<img src={song.coverUrl} alt="" />
				) : (
					<ListMusic size={22} />
				)}
				<span>
					{isCurrent && player.isPlaying ? (
						<Pause size={18} fill="currentColor" />
					) : (
						<Play size={18} fill="currentColor" />
					)}
				</span>
			</button>
			<div className="song-primary truncate">
				<strong>{song.title}</strong>
				<span>{song.artistName}</span>
			</div>
			<div className="song-album truncate">{song.albumTitle ?? "Đĩa đơn"}</div>
			<div className="song-plays">{formatNumber(song.totalPlays)} lượt</div>
			<div className="song-actions">
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
				{onRemove ? (
					<button
						type="button"
						className="text-button danger"
						onClick={onRemove}
					>
						Xóa
					</button>
				) : null}
			</div>
			<span className="song-duration">
				{formatDuration(song.durationSeconds)}
			</span>
			{typeof index === "number" ? (
				<span className="sr-only">Vị trí {index + 1}</span>
			) : null}
		</div>
	);
}
