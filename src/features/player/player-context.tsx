import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useReducer,
	useRef,
} from "react";
import { toast } from "sonner";
import { useAuth } from "@/features/auth/auth-context";
import type { PlayerTrack } from "@/features/catalog/catalog-types";
import { createClient } from "@/lib/supabase/client";
import {
	initialPlayerState,
	type PlayerState,
	playerReducer,
} from "./player-state";
import {
	hasReachedPlayThreshold,
	nextQueueIndex,
	previousQueueIndex,
	type RepeatMode,
	requiredListenSeconds,
} from "./player-utils";

interface PlayerContextValue extends PlayerState {
	currentTrack: PlayerTrack | null;
	playTrack: (track: PlayerTrack, queue?: PlayerTrack[]) => void;
	playQueue: (queue: PlayerTrack[], index?: number) => void;
	togglePlay: () => void;
	next: () => void;
	previous: () => void;
	seek: (seconds: number) => void;
	setVolume: (volume: number) => void;
	cycleRepeat: () => void;
	toggleShuffle: () => void;
	toggleLyrics: () => void;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function PlayerProvider({ children }: { children: ReactNode }) {
	const { user } = useAuth();
	const [state, dispatch] = useReducer(playerReducer, initialPlayerState);
	const audioRef = useRef<HTMLAudioElement>(null);
	const loadIdRef = useRef(0);
	const retriedRef = useRef(false);
	const listenedRef = useRef(0);
	const recordedRef = useRef(false);
	const sessionRef = useRef(crypto.randomUUID());
	const recordingRef = useRef(false);
	const playbackActiveRef = useRef(false);
	const shouldPlayRef = useRef(false);
	const currentTrack = state.queue[state.currentIndex] ?? null;

	useEffect(() => {
		const savedVolume = Number.parseFloat(
			window.localStorage.getItem("music-volume") ?? "0.8",
		);
		if (Number.isFinite(savedVolume)) {
			dispatch({
				type: "SET_VOLUME",
				volume: Math.min(1, Math.max(0, savedVolume)),
			});
		}
	}, []);

	const loadCurrentTrack = useCallback(async () => {
		if (!currentTrack || !audioRef.current) return;
		const loadId = ++loadIdRef.current;
		dispatch({ type: "SET_LOADING", value: true });
		dispatch({ type: "SET_ERROR", error: null });

		const { data, error } = await createClient()
			.storage.from("music-audio")
			.createSignedUrl(currentTrack.audioPath, 3600);

		if (loadId !== loadIdRef.current) return;
		if (error || !data?.signedUrl) {
			dispatch({
				type: "SET_ERROR",
				error: "Không thể tải tệp âm thanh.",
			});
			return;
		}

		audioRef.current.src = data.signedUrl;
		audioRef.current.load();
	}, [currentTrack]);

	useEffect(() => {
		listenedRef.current = 0;
		recordedRef.current = false;
		retriedRef.current = false;
		playbackActiveRef.current = false;
		sessionRef.current = crypto.randomUUID();
		if (currentTrack) void loadCurrentTrack();
	}, [currentTrack, loadCurrentTrack]);

	useEffect(() => {
		if (audioRef.current) audioRef.current.volume = state.volume;
		window.localStorage.setItem("music-volume", String(state.volume));
	}, [state.volume]);

	const recordPlay = useCallback(
		async (completed: boolean) => {
			if (
				!user ||
				!currentTrack ||
				recordedRef.current ||
				recordingRef.current ||
				!hasReachedPlayThreshold(
					currentTrack.durationSeconds,
					listenedRef.current,
				)
			) {
				return;
			}
			recordingRef.current = true;
			try {
				const { data, error } = await createClient().rpc("record_song_play", {
					p_song_id: currentTrack.id,
					p_session_id: sessionRef.current,
					p_listened_seconds: Math.floor(listenedRef.current),
					p_completed: completed,
				});
				if (!error && data) recordedRef.current = true;
			} finally {
				recordingRef.current = false;
			}
		},
		[currentTrack, user],
	);

	useEffect(() => {
		if (!currentTrack) return;
		const interval = window.setInterval(() => {
			if (!playbackActiveRef.current) return;
			listenedRef.current += 1;
			if (
				listenedRef.current >=
				requiredListenSeconds(currentTrack.durationSeconds)
			) {
				void recordPlay(false);
			}
		}, 1000);
		return () => window.clearInterval(interval);
	}, [currentTrack, recordPlay]);

	const playQueue = useCallback((queue: PlayerTrack[], index = 0) => {
		if (!queue.length) return;
		shouldPlayRef.current = true;
		dispatch({
			type: "PLAY_QUEUE",
			queue,
			index: Math.min(Math.max(index, 0), queue.length - 1),
		});
	}, []);

	const playTrack = useCallback(
		(track: PlayerTrack, queue?: PlayerTrack[]) => {
			const nextQueue = queue?.length ? queue : [track];
			const index = Math.max(
				0,
				nextQueue.findIndex((item) => item.id === track.id),
			);
			playQueue(nextQueue, index);
		},
		[playQueue],
	);

	const togglePlay = useCallback(() => {
		const audio = audioRef.current;
		if (!audio || !currentTrack) return;
		if (audio.paused) {
			shouldPlayRef.current = true;
			void audio.play().catch(() => {
				shouldPlayRef.current = false;
				toast.error("Trình duyệt đã chặn phát âm thanh.");
			});
		} else {
			shouldPlayRef.current = false;
			audio.pause();
		}
	}, [currentTrack]);

	const next = useCallback(() => {
		const index = nextQueueIndex({
			currentIndex: state.currentIndex,
			length: state.queue.length,
			repeatMode: state.repeatMode,
			shuffle: state.shuffle,
		});
		if (index === state.currentIndex && audioRef.current) {
			shouldPlayRef.current = true;
			audioRef.current.currentTime = 0;
			dispatch({ type: "SET_TIME", time: 0 });
			void audioRef.current.play();
		} else if (index >= 0) {
			shouldPlayRef.current = true;
			dispatch({ type: "SET_INDEX", index });
		} else {
			shouldPlayRef.current = false;
			dispatch({ type: "SET_PLAYING", value: false });
		}
	}, [state.currentIndex, state.queue.length, state.repeatMode, state.shuffle]);

	const previous = useCallback(() => {
		const audio = audioRef.current;
		if (audio && audio.currentTime > 3) {
			audio.currentTime = 0;
			return;
		}
		const index = previousQueueIndex(state.currentIndex, state.queue.length);
		if (index >= 0) {
			shouldPlayRef.current = true;
			dispatch({ type: "SET_INDEX", index });
		}
	}, [state.currentIndex, state.queue.length]);

	const seek = useCallback((seconds: number) => {
		if (!audioRef.current) return;
		audioRef.current.currentTime = seconds;
		dispatch({ type: "SET_TIME", time: seconds });
	}, []);

	const setVolume = useCallback((volume: number) => {
		dispatch({
			type: "SET_VOLUME",
			volume: Math.min(1, Math.max(0, volume)),
		});
	}, []);

	const cycleRepeat = useCallback(() => {
		const modes: RepeatMode[] = ["off", "all", "one"];
		const nextMode =
			modes[(modes.indexOf(state.repeatMode) + 1) % modes.length];
		dispatch({ type: "SET_REPEAT", repeatMode: nextMode });
	}, [state.repeatMode]);

	const value = useMemo<PlayerContextValue>(
		() => ({
			...state,
			currentTrack,
			playTrack,
			playQueue,
			togglePlay,
			next,
			previous,
			seek,
			setVolume,
			cycleRepeat,
			toggleShuffle: () => dispatch({ type: "TOGGLE_SHUFFLE" }),
			toggleLyrics: () => dispatch({ type: "TOGGLE_LYRICS" }),
		}),
		[
			state,
			currentTrack,
			playTrack,
			playQueue,
			togglePlay,
			next,
			previous,
			seek,
			setVolume,
			cycleRepeat,
		],
	);

	return (
		<PlayerContext.Provider value={value}>
			{children}
			{/* biome-ignore lint/a11y/useMediaCaption: Đây là trình phát nhạc; lời đồng bộ được hiển thị trong LyricsPanel. */}
			<audio
				ref={audioRef}
				className="hidden"
				preload="metadata"
				onCanPlay={() => {
					dispatch({ type: "SET_LOADING", value: false });
					if (shouldPlayRef.current) {
						void audioRef.current?.play().catch(() => {
							shouldPlayRef.current = false;
							dispatch({ type: "SET_PLAYING", value: false });
							toast.error("Trình duyệt đã chặn phát âm thanh.");
						});
					}
				}}
				onPlay={() => {
					playbackActiveRef.current = true;
					dispatch({ type: "SET_PLAYING", value: true });
				}}
				onPlaying={() => {
					playbackActiveRef.current = true;
					dispatch({ type: "SET_LOADING", value: false });
				}}
				onWaiting={() => {
					playbackActiveRef.current = false;
					dispatch({ type: "SET_LOADING", value: true });
				}}
				onPause={() => {
					playbackActiveRef.current = false;
					dispatch({ type: "SET_PLAYING", value: false });
				}}
				onSeeking={() => {
					playbackActiveRef.current = false;
				}}
				onSeeked={() => {
					playbackActiveRef.current = !audioRef.current?.paused;
				}}
				onTimeUpdate={() => {
					const audio = audioRef.current;
					if (!audio) return;
					dispatch({
						type: "SET_TIME",
						time: audio.currentTime,
						duration: Number.isFinite(audio.duration)
							? audio.duration
							: currentTrack?.durationSeconds,
					});
				}}
				onEnded={() => {
					playbackActiveRef.current = false;
					void recordPlay(true);
					next();
				}}
				onError={() => {
					if (!retriedRef.current) {
						retriedRef.current = true;
						void loadCurrentTrack();
						return;
					}
					dispatch({ type: "SET_ERROR", error: "Không thể phát bài hát." });
				}}
			/>
		</PlayerContext.Provider>
	);
}

export function usePlayer() {
	const context = useContext(PlayerContext);
	if (!context)
		throw new Error("usePlayer phải được dùng trong PlayerProvider");
	return context;
}
