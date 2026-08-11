import { FileMusic, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { formatLrc, type LrcLine, parseLrc } from "@/features/lyrics/lrc";

function linesMatch(left: LrcLine[], right: LrcLine[]) {
	return (
		left.length === right.length &&
		left.every(
			(line, index) =>
				line.startMs === right[index]?.startMs &&
				line.endMs === right[index]?.endMs &&
				line.text === right[index]?.text,
		)
	);
}

export function LrcEditor({
	lines,
	onChange,
}: {
	lines: LrcLine[];
	onChange: (lines: LrcLine[]) => void;
}) {
	const [source, setSource] = useState(() => formatLrc(lines));
	useEffect(() => {
		setSource((currentSource) =>
			linesMatch(parseLrc(currentSource), lines)
				? currentSource
				: formatLrc(lines),
		);
	}, [lines]);

	const updateSource = (nextSource: string) => {
		setSource(nextSource);
		onChange(parseLrc(nextSource));
	};

	const updateLine = (index: number, next: Partial<LrcLine>) => {
		onChange(
			lines.map((line, lineIndex) =>
				lineIndex === index ? { ...line, ...next } : line,
			),
		);
	};

	return (
		<div className="lrc-editor">
			<div className="form-grid two">
				<label>
					<span>Dán nội dung LRC</span>
					<textarea
						rows={7}
						value={source}
						onChange={(event) => updateSource(event.target.value)}
						placeholder="[00:12.50]Dòng lời đầu tiên"
					/>
				</label>
				<div className="lrc-import-actions">
					<label className="button ghost">
						<FileMusic size={17} /> Tải file .lrc
						<input
							className="sr-only"
							type="file"
							accept=".lrc,text/plain"
							onChange={(event) => {
								const file = event.target.files?.[0];
								if (!file) return;
								void file.text().then(updateSource);
							}}
						/>
					</label>
					<p className="muted">
						Tự động cập nhật {lines.length} dòng hợp lệ. Metadata và dòng
						timestamp trống sẽ không được lưu.
					</p>
				</div>
			</div>
			<div className="lyrics-edit-list">
				{lines.map((line, index) => (
					<div className="lyrics-edit-row" key={`${line.startMs}-${line.text}`}>
						<input
							type="number"
							min="0"
							step="1"
							value={line.startMs}
							onChange={(event) =>
								updateLine(index, { startMs: Number(event.target.value) })
							}
							aria-label="Bắt đầu ms"
						/>
						<input
							type="number"
							min={line.startMs + 1}
							step="1"
							value={line.endMs ?? ""}
							onChange={(event) =>
								updateLine(index, {
									endMs: event.target.value ? Number(event.target.value) : null,
								})
							}
							aria-label="Kết thúc ms"
						/>
						<input
							value={line.text}
							onChange={(event) =>
								updateLine(index, { text: event.target.value })
							}
							aria-label="Nội dung lời"
						/>
						<button
							type="button"
							className="icon-button danger"
							onClick={() =>
								onChange(lines.filter((_, lineIndex) => lineIndex !== index))
							}
						>
							<Trash2 size={16} />
						</button>
					</div>
				))}
				<button
					type="button"
					className="text-button"
					onClick={() => {
						const lastLine = lines.at(-1);
						const startMs =
							lastLine?.endMs ?? (lastLine ? lastLine.startMs + 3000 : 0);
						onChange([...lines, { startMs, endMs: null, text: "" }]);
					}}
				>
					<Plus size={16} /> Thêm dòng thủ công
				</button>
			</div>
		</div>
	);
}
