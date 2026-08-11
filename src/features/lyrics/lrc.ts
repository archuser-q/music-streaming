export interface LrcLine {
	startMs: number;
	endMs: number | null;
	text: string;
}

const timestampPattern = /\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g;

function parseTimestamp(match: RegExpMatchArray) {
	const minutes = Number(match[1]);
	const seconds = Number(match[2]);
	if (seconds > 59) return null;

	const fraction = match[3] ?? "0";
	const fractionMs = Number(fraction.padEnd(3, "0"));
	return minutes * 60_000 + seconds * 1000 + fractionMs;
}

function formatTimestamp(timestampMs: number) {
	const safeTimestamp = Math.max(0, Math.round(timestampMs));
	const minutes = Math.floor(safeTimestamp / 60_000);
	const seconds = Math.floor((safeTimestamp % 60_000) / 1000);
	const milliseconds = safeTimestamp % 1000;
	const fraction =
		milliseconds % 10 === 0
			? Math.floor(milliseconds / 10)
					.toString()
					.padStart(2, "0")
			: milliseconds.toString().padStart(3, "0");

	return `[${minutes.toString().padStart(2, "0")}:${seconds
		.toString()
		.padStart(2, "0")}.${fraction}]`;
}

export function parseLrc(source: string): LrcLine[] {
	const markers: Array<Omit<LrcLine, "endMs">> = [];
	for (const rawLine of source.replace(/\r/g, "").split("\n")) {
		const matches = [...rawLine.matchAll(timestampPattern)];
		if (!matches.length) continue;
		const text = rawLine.replace(timestampPattern, "").trim();
		for (const match of matches) {
			const startMs = parseTimestamp(match);
			if (startMs !== null) markers.push({ startMs, text });
		}
	}

	markers.sort((a, b) => a.startMs - b.startMs);
	const boundaryStarts = [...new Set(markers.map((marker) => marker.startMs))];
	const lyricsByStart = new Map<number, string[]>();

	for (const marker of markers) {
		if (!marker.text) continue;
		const texts = lyricsByStart.get(marker.startMs) ?? [];
		if (!texts.includes(marker.text)) texts.push(marker.text);
		lyricsByStart.set(marker.startMs, texts);
	}

	return [...lyricsByStart.entries()].map(([startMs, texts]) => {
		const boundaryIndex = boundaryStarts.indexOf(startMs);
		return {
			startMs,
			endMs: boundaryStarts[boundaryIndex + 1] ?? null,
			text: texts.join(" / "),
		};
	});
}

export function formatLrc(lines: LrcLine[]) {
	const formatted: string[] = [];
	for (const [index, line] of lines.entries()) {
		formatted.push(`${formatTimestamp(line.startMs)}${line.text}`);
		const nextStartMs = lines[index + 1]?.startMs ?? null;
		if (
			line.endMs !== null &&
			line.endMs > line.startMs &&
			line.endMs !== nextStartMs
		) {
			formatted.push(formatTimestamp(line.endMs));
		}
	}
	return formatted.join("\n");
}
