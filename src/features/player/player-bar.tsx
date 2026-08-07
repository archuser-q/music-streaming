import {
	ListMusic,
	LoaderCircle,
	Maximize2,
	Pause,
	Play,
	Repeat,
	Repeat1,
	Shuffle,
	SkipBack,
	SkipForward,
	Volume1,
	Volume2,
	VolumeX,
} from "lucide-react";
import { LyricsPanel } from "@/features/lyrics/lyrics-panel";
import { formatDuration } from "@/lib/format";
import { usePlayer } from "./player-context";

export function PlayerBar() {
	const player = usePlayer();
	if (!player.currentTrack) return null;

	const VolumeIcon =
		player.volume === 0 ? VolumeX : player.volume < 0.5 ? Volume1 : Volume2;

	return (
		<>
			{player.lyricsOpen ? <LyricsPanel /> : null}
			<footer className="player-bar">
				<div className="player-track-info">
					<div className="cover-sm">
						{player.currentTrack.coverUrl ? (
							<img src={player.currentTrack.coverUrl} alt="" />
						) : (
							<ListMusic size={22} />
						)}
					</div>
					<div className="truncate">
						<strong>{player.currentTrack.title}</strong>
						<span>{player.currentTrack.artistName}</span>
					</div>
				</div>

				<div className="player-main-controls">
					<div className="player-buttons">
						<button
							type="button"
							className={player.shuffle ? "icon-button active" : "icon-button"}
							onClick={player.toggleShuffle}
							aria-label="Phát ngẫu nhiên"
						>
							<Shuffle size={17} />
						</button>
						<button
							type="button"
							className="icon-button"
							onClick={player.previous}
							aria-label="Bài trước"
						>
							<SkipBack size={20} fill="currentColor" />
						</button>
						<button
							type="button"
							className="play-button"
							onClick={player.togglePlay}
							aria-label="Phát hoặc tạm dừng"
						>
							{player.isLoading ? (
								<LoaderCircle className="spin" size={20} />
							) : player.isPlaying ? (
								<Pause size={20} fill="currentColor" />
							) : (
								<Play size={20} fill="currentColor" />
							)}
						</button>
						<button
							type="button"
							className="icon-button"
							onClick={player.next}
							aria-label="Bài tiếp"
						>
							<SkipForward size={20} fill="currentColor" />
						</button>
						<button
							type="button"
							className={
								player.repeatMode !== "off"
									? "icon-button active"
									: "icon-button"
							}
							onClick={player.cycleRepeat}
							aria-label="Chế độ lặp"
						>
							{player.repeatMode === "one" ? (
								<Repeat1 size={17} />
							) : (
								<Repeat size={17} />
							)}
						</button>
					</div>
					<div className="progress-row">
						<span>{formatDuration(player.currentTime)}</span>
						<input
							type="range"
							min="0"
							max={Math.max(player.duration, 1)}
							step="0.1"
							value={Math.min(player.currentTime, player.duration || 1)}
							onChange={(event) => player.seek(Number(event.target.value))}
							aria-label="Tiến trình bài hát"
						/>
						<span>{formatDuration(player.duration)}</span>
					</div>
				</div>

				<div className="player-secondary-controls">
					<button
						type="button"
						className="icon-button"
						onClick={player.toggleLyrics}
						aria-label="Hiển thị lời bài hát"
					>
						<Maximize2 size={17} />
					</button>
					<VolumeIcon size={18} />
					<input
						type="range"
						min="0"
						max="1"
						step="0.01"
						value={player.volume}
						onChange={(event) => player.setVolume(Number(event.target.value))}
						aria-label="Âm lượng"
					/>
				</div>
			</footer>
		</>
	);
}
