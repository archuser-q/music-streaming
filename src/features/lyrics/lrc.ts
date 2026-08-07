export interface LrcLine {
	startMs: number;
	endMs: number | null;
	text: string;
}

const timestampPattern = /\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g;

export function parseLrc(source: string): LrcLine[] {
	const parsed: Array<Omit<LrcLine, "endMs">> = [];
	for (const rawLine of source.replace(/\r/g, "").split("\n")) {
		const matches = [...rawLine.matchAll(timestampPattern)];
		if (!matches.length) continue;
		const text = rawLine.replace(timestampPattern, "").trim();
		for (const match of matches) {
			const minutes = Number(match[1]);
			const seconds = Number(match[2]);
			const fraction = match[3] ?? "0";
			const fractionMs =
				fraction.length === 3
					? Number(fraction)
					: fraction.length === 2
						? Number(fraction) * 10
						: Number(fraction) * 100;
			parsed.push({
				startMs: minutes * 60_000 + seconds * 1000 + fractionMs,
				text,
			});
		}
	}

	parsed.sort((a, b) => a.startMs - b.startMs);
	return parsed.map((line, index) => ({
		...line,
		endMs: parsed[index + 1]?.startMs ?? null,
	}));
}

export function formatLrc(lines: LrcLine[]) {
	return lines
		.map((line) => {
			const minutes = Math.floor(line.startMs / 60_000);
			const seconds = Math.floor((line.startMs % 60_000) / 1000);
			const centiseconds = Math.floor((line.startMs % 1000) / 10);
			return `[${minutes.toString().padStart(2, "0")}:${seconds
				.toString()
				.padStart(
					2,
					"0",
				)}.${centiseconds.toString().padStart(2, "0")}]${line.text}`;
		})
		.join("\n");
}
