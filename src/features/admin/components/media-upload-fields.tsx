import {
	AlertCircle,
	CheckCircle2,
	FileAudio,
	ImagePlus,
	LoaderCircle,
	Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { formatDuration, formatFileSize } from "@/lib/format";
import {
	createAudioSignedUrl,
	publicStorageUrl,
	readAudioDuration,
	validateAudioFile,
	validateImageFile,
} from "@/lib/supabase/storage";

interface AudioUploadFieldProps {
	currentPath?: string | null;
	currentDuration?: number | null;
	required?: boolean;
}

export function AudioUploadField({
	currentPath,
	currentDuration,
	required = false,
}: AudioUploadFieldProps) {
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);
	const [duration, setDuration] = useState(currentDuration ?? null);
	const [reading, setReading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (selectedFile) {
			const url = URL.createObjectURL(selectedFile);
			setPreviewUrl(url);
			return () => URL.revokeObjectURL(url);
		}
		if (!currentPath) {
			setPreviewUrl(null);
			return;
		}
		let active = true;
		void createAudioSignedUrl(currentPath)
			.then((url) => {
				if (active) setPreviewUrl(url);
			})
			.catch(() => {
				if (active) setError("Không thể tải bản nghe thử hiện tại.");
			});
		return () => {
			active = false;
		};
	}, [currentPath, selectedFile]);

	return (
		<div className="media-upload-field">
			<label>
				<span>
					Tệp âm thanh {currentPath ? "(chọn tệp mới để thay thế)" : ""}
				</span>
				<input
					name="audio"
					type="file"
					accept="audio/mpeg,audio/mp4,audio/aac,audio/ogg,audio/wav,audio/x-wav,audio/flac"
					required={required}
					onChange={(event) => {
						const input = event.currentTarget;
						const file = input.files?.[0] ?? null;
						input.setCustomValidity("");
						setSelectedFile(file);
						setError(null);
						setDuration(file ? null : (currentDuration ?? null));
						if (!file) return;
						try {
							validateAudioFile(file);
						} catch (validationError) {
							const message =
								validationError instanceof Error
									? validationError.message
									: "Tệp âm thanh không hợp lệ.";
							input.setCustomValidity(message);
							setError(message);
							return;
						}
						setReading(true);
						void readAudioDuration(file)
							.then(setDuration)
							.catch((metadataError) => {
								const message =
									metadataError instanceof Error
										? metadataError.message
										: "Không đọc được metadata tệp âm thanh.";
								input.setCustomValidity(message);
								setError(message);
							})
							.finally(() => setReading(false));
					}}
				/>
			</label>
			{selectedFile || currentPath ? (
				<div className="media-preview audio-preview">
					<div className="media-preview-icon">
						<FileAudio size={22} />
					</div>
					<div className="media-preview-copy">
						<strong>{selectedFile?.name ?? "Tệp âm thanh hiện tại"}</strong>
						<small>
							{selectedFile
								? formatFileSize(selectedFile.size)
								: "Đã lưu trên Supabase"}
							{duration ? ` · ${formatDuration(duration)}` : ""}
						</small>
					</div>
					{reading ? (
						<LoaderCircle className="spin" size={19} />
					) : error ? (
						<AlertCircle className="danger-text" size={19} />
					) : (
						<CheckCircle2 className="success-text" size={19} />
					)}
					{previewUrl ? (
						<audio controls preload="metadata" src={previewUrl}>
							<track kind="captions" />
						</audio>
					) : null}
				</div>
			) : null}
			{error ? <p className="field-error">{error}</p> : null}
		</div>
	);
}

interface ImageUploadFieldProps {
	name: string;
	label: string;
	currentPath?: string | null;
	removeName?: string;
}

export function ImageUploadField({
	name,
	label,
	currentPath,
	removeName,
}: ImageUploadFieldProps) {
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const [removeCurrent, setRemoveCurrent] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const selectedUrl = useMemo(
		() => (selectedFile ? URL.createObjectURL(selectedFile) : null),
		[selectedFile],
	);

	useEffect(() => {
		return () => {
			if (selectedUrl) URL.revokeObjectURL(selectedUrl);
		};
	}, [selectedUrl]);

	const previewUrl = removeCurrent
		? null
		: (selectedUrl ?? publicStorageUrl("music-covers", currentPath ?? null));

	return (
		<div className="media-upload-field">
			<label>
				<span>{label}</span>
				<input
					name={name}
					type="file"
					accept="image/jpeg,image/png,image/webp"
					onChange={(event) => {
						const input = event.currentTarget;
						const file = input.files?.[0] ?? null;
						input.setCustomValidity("");
						setError(null);
						if (file) {
							try {
								validateImageFile(file);
							} catch (validationError) {
								const message =
									validationError instanceof Error
										? validationError.message
										: "Ảnh không hợp lệ.";
								input.setCustomValidity(message);
								setError(message);
							}
							setRemoveCurrent(false);
						}
						setSelectedFile(file);
					}}
				/>
			</label>
			{previewUrl || selectedFile ? (
				<div className="media-preview image-preview">
					<div className="image-preview-frame">
						{previewUrl ? (
							<img src={previewUrl} alt="Xem trước" />
						) : (
							<ImagePlus />
						)}
					</div>
					<div className="media-preview-copy">
						<strong>{selectedFile?.name ?? "Ảnh hiện tại"}</strong>
						<small>
							{selectedFile
								? formatFileSize(selectedFile.size)
								: "Đã lưu trên Supabase"}
						</small>
					</div>
				</div>
			) : null}
			{currentPath && removeName && !selectedFile ? (
				<label className="check-row danger-text">
					<input
						name={removeName}
						type="checkbox"
						checked={removeCurrent}
						onChange={(event) => setRemoveCurrent(event.target.checked)}
					/>
					<Trash2 size={15} /> Xóa ảnh hiện tại khi lưu
				</label>
			) : null}
			{error ? <p className="field-error">{error}</p> : null}
		</div>
	);
}
