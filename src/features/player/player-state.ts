import type { PlayerTrack } from "@/features/catalog/catalog-types";
import type { RepeatMode } from "./player-utils";

export interface PlayerState {
	queue: PlayerTrack[];
	currentIndex: number;
	isPlaying: boolean;
	isLoading: boolean;
	currentTime: number;
	duration: number;
	volume: number;
	repeatMode: RepeatMode;
	shuffle: boolean;
	lyricsOpen: boolean;
	error: string | null;
}

export type PlayerAction =
	| { type: "PLAY_QUEUE"; queue: PlayerTrack[]; index: number }
	| { type: "SET_INDEX"; index: number }
	| { type: "SET_PLAYING"; value: boolean }
	| { type: "SET_LOADING"; value: boolean }
	| { type: "SET_TIME"; time: number; duration?: number }
	| { type: "SET_VOLUME"; volume: number }
	| { type: "SET_REPEAT"; repeatMode: RepeatMode }
	| { type: "TOGGLE_SHUFFLE" }
	| { type: "TOGGLE_LYRICS" }
	| { type: "SET_ERROR"; error: string | null };

export const initialPlayerState: PlayerState = {
	queue: [],
	currentIndex: -1,
	isPlaying: false,
	isLoading: false,
	currentTime: 0,
	duration: 0,
	volume: 0.8,
	repeatMode: "off",
	shuffle: false,
	lyricsOpen: false,
	error: null,
};

export function playerReducer(
	state: PlayerState,
	action: PlayerAction,
): PlayerState {
	switch (action.type) {
		case "PLAY_QUEUE":
			return {
				...state,
				queue: action.queue,
				currentIndex: action.index,
				currentTime: 0,
				duration: 0,
				isPlaying: true,
				error: null,
			};
		case "SET_INDEX":
			return {
				...state,
				currentIndex: action.index,
				currentTime: 0,
				duration: 0,
				isPlaying: action.index >= 0,
				error: null,
			};
		case "SET_PLAYING":
			return { ...state, isPlaying: action.value };
		case "SET_LOADING":
			return { ...state, isLoading: action.value };
		case "SET_TIME":
			return {
				...state,
				currentTime: action.time,
				duration: action.duration ?? state.duration,
			};
		case "SET_VOLUME":
			return { ...state, volume: action.volume };
		case "SET_REPEAT":
			return { ...state, repeatMode: action.repeatMode };
		case "TOGGLE_SHUFFLE":
			return { ...state, shuffle: !state.shuffle };
		case "TOGGLE_LYRICS":
			return { ...state, lyricsOpen: !state.lyricsOpen };
		case "SET_ERROR":
			return { ...state, error: action.error, isLoading: false };
	}
}
