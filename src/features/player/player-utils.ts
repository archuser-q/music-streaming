export type RepeatMode = "off" | "one" | "all";

export function requiredListenSeconds(durationSeconds: number) {
	return Math.min(30, Math.max(1, Math.ceil(durationSeconds * 0.5)));
}

export function hasReachedPlayThreshold(
	durationSeconds: number,
	listenedSeconds: number,
) {
	return listenedSeconds >= requiredListenSeconds(durationSeconds);
}

export function getRandomIndex(length: number, currentIndex: number) {
	if (length <= 1) return 0;
	const candidate = Math.floor(Math.random() * length);
	return candidate === currentIndex ? (currentIndex + 1) % length : candidate;
}

export function nextQueueIndex({
	currentIndex,
	length,
	repeatMode,
	shuffle,
}: {
	currentIndex: number;
	length: number;
	repeatMode: RepeatMode;
	shuffle: boolean;
}) {
	if (length === 0) return -1;
	if (repeatMode === "one") return currentIndex;
	if (shuffle) return getRandomIndex(length, currentIndex);
	if (currentIndex < length - 1) return currentIndex + 1;
	return repeatMode === "all" ? 0 : -1;
}

export function previousQueueIndex(currentIndex: number, length: number) {
	if (length === 0) return -1;
	return currentIndex > 0 ? currentIndex - 1 : length - 1;
}
