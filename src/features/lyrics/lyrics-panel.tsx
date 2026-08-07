import { LoaderCircle, Music2, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePlayer } from "@/features/player/player-context";
import { formatDuration } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import type { LyricsLineRow } from "@/lib/supabase/database.types";

export function LyricsPanel() {
	const { currentTrack, currentTime, seek, toggleLyrics } = usePlayer();
	const [lines, setLines] = useState<LyricsLineRow[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const activeRef = useRef<HTMLButtonElement>(null);

	useEffect(() => {
		let active = true;
		setLines([]);
		setError(null);
		setLoading(Boolean(currentTrack));
		if (!currentTrack) return;
		void createClient()
			.from("lyrics_lines")
			.select("*")
			.eq("song_id", currentTrack.id)
			.order("start_ms")
			.then(({ data, error: lyricsError }) => {
				if (!active) return;
				if (lyricsError) {
					setError("Không thể tải lời bài hát lúc này.");
				} else {
					setLines(data ?? []);
				}
				setLoading(false);
			});
		return () => {
			active = false;
		};
	}, [currentTrack]);

	const activeIndex = useMemo(() => {
		const time = currentTime * 1000;
		for (let index = lines.length - 1; index >= 0; index -= 1) {
			if (time >= lines[index].start_ms) return index;
		}
		return -1;
	}, [currentTime, lines]);

	useEffect(() => {
		if (activeIndex >= 0) {
			activeRef.current?.scrollIntoView({
				behavior: "smooth",
				block: "center",
			});
		}
	}, [activeIndex]);

	const progress = currentTrack?.durationSeconds
		? Math.min(
				100,
				Math.max(0, (currentTime / currentTrack.durationSeconds) * 100),
			)
		: 0;

	return (
		<section className="lyrics-panel" aria-label="Lời bài hát đồng bộ">
			<div
				className="lyrics-backdrop"
				style={
					currentTrack?.coverUrl
						? { backgroundImage: `url("${currentTrack.coverUrl}")` }
						: undefined
				}
			/>
			<div className="lyrics-backdrop-overlay" />

			<header className="lyrics-topbar">
				<div className="lyrics-mode-label">
					<Sparkles size={16} />
					<span>Lyrics đồng bộ</span>
				</div>
				<button
					type="button"
					className="lyrics-close-button"
					onClick={toggleLyrics}
					aria-label="Đóng lời bài hát"
				>
					<X size={21} />
				</button>
			</header>

			<div className="lyrics-stage">
				<aside className="lyrics-now-playing">
					<div className="lyrics-cover">
						{currentTrack?.coverUrl ? (
							<img
								src={currentTrack.coverUrl}
								alt={`Bìa ${currentTrack.title}`}
							/>
						) : (
							<Music2 size={58} />
						)}
					</div>
					<div className="lyrics-track-copy">
						<p className="eyebrow">Đang phát</p>
						<h2>{currentTrack?.title ?? "Chưa chọn bài hát"}</h2>
						<p>{currentTrack?.artistName}</p>
						{currentTrack?.albumTitle ? (
							<small>{currentTrack.albumTitle}</small>
						) : null}
					</div>
					<div className="lyrics-mini-progress">
						<div className="lyrics-mini-progress-track">
							<span style={{ width: `${progress}%` }} />
						</div>
						<div>
							<span>{formatDuration(currentTime)}</span>
							<span>{formatDuration(currentTrack?.durationSeconds ?? 0)}</span>
						</div>
					</div>
				</aside>

				<div className="lyrics-viewport">
					<div
						className={`lyrics-scroll ${loading || error || !lines.length ? "has-state" : ""}`}
					>
						{loading ? (
							<div className="lyrics-state">
								<LoaderCircle className="spin" size={28} />
								<p>Đang tải lời bài hát...</p>
							</div>
						) : error ? (
							<div className="lyrics-state">
								<Music2 size={32} />
								<p>{error}</p>
							</div>
						) : lines.length ? (
							lines.map((line, index) => {
								const state =
									index === activeIndex
										? "active"
										: index < activeIndex
											? "past"
											: "future";
								return (
									<button
										type="button"
										key={line.id}
										ref={index === activeIndex ? activeRef : undefined}
										className={`lyric-line ${state}`}
										aria-current={index === activeIndex ? "true" : undefined}
										title={`Tua đến ${formatDuration(line.start_ms / 1000)}`}
										onClick={() => seek(line.start_ms / 1000)}
									>
										{line.text}
									</button>
								);
							})
						) : (
							<div className="lyrics-state">
								<div className="lyrics-state-icon">
									<Music2 size={30} />
								</div>
								<h3>Chưa có lyrics đồng bộ</h3>
								<p>Admin có thể bổ sung lời LRC trong trang quản lý bài hát.</p>
							</div>
						)}
					</div>
				</div>
			</div>
		</section>
	);
}
