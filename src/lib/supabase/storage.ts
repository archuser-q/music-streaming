import { createClient } from "@/lib/supabase/client";

const imageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const audioTypes = new Set([
	"audio/mpeg",
	"audio/mp4",
	"audio/aac",
	"audio/ogg",
	"audio/wav",
	"audio/x-wav",
	"audio/flac",
]);

const AUDIO_MAX_SIZE = 100 * 1024 * 1024;
const COVER_MAX_SIZE = 10 * 1024 * 1024;
const AVATAR_MAX_SIZE = 5 * 1024 * 1024;

function extensionFor(file: File) {
	const extension = file.name.split(".").pop()?.toLowerCase();
	if (extension && /^[a-z0-9]+$/.test(extension)) return extension;
	return file.type.split("/")[1]?.replace("x-", "") || "bin";
}

export function publicStorageUrl(
	bucket: "music-covers" | "avatars",
	path: string | null,
) {
	if (!path) return null;
	if (/^https?:\/\//.test(path)) return path;
	return createClient().storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

export function validateImageFile(
	file: File,
	bucket: "music-covers" | "avatars" = "music-covers",
) {
	if (!imageTypes.has(file.type)) {
		throw new Error("Ảnh phải có định dạng JPEG, PNG hoặc WebP.");
	}
	const maxSize = bucket === "avatars" ? AVATAR_MAX_SIZE : COVER_MAX_SIZE;
	if (file.size > maxSize) {
		throw new Error(
			`Ảnh không được vượt quá ${bucket === "avatars" ? "5 MB" : "10 MB"}.`,
		);
	}
}

export function validateAudioFile(file: File) {
	if (!audioTypes.has(file.type)) {
		throw new Error("Chỉ hỗ trợ MP3, M4A/MP4, AAC, OGG, WAV và FLAC.");
	}
	if (file.size > AUDIO_MAX_SIZE) {
		throw new Error("Tệp âm thanh không được vượt quá 100 MB.");
	}
}

export async function uploadImage(
	file: File,
	userId: string,
	bucket: "music-covers" | "avatars" = "music-covers",
) {
	validateImageFile(file, bucket);
	const path = `${userId}/${crypto.randomUUID()}.${extensionFor(file)}`;
	const { error } = await createClient()
		.storage.from(bucket)
		.upload(path, file, {
			cacheControl: "31536000",
			upsert: false,
		});
	if (error) throw error;
	return path;
}

export async function uploadAudio(file: File, userId: string) {
	validateAudioFile(file);
	const path = `${userId}/${crypto.randomUUID()}.${extensionFor(file)}`;
	const { error } = await createClient()
		.storage.from("music-audio")
		.upload(path, file, { cacheControl: "3600", upsert: false });
	if (error) throw error;
	return path;
}

export async function createAudioSignedUrl(path: string, expiresIn = 3600) {
	const { data, error } = await createClient()
		.storage.from("music-audio")
		.createSignedUrl(path, expiresIn);
	if (error) throw error;
	if (!data?.signedUrl) throw new Error("Không thể tạo liên kết nghe thử.");
	return data.signedUrl;
}

export async function removeStorageFiles(
	bucket: "music-audio" | "music-covers" | "avatars",
	paths: Array<string | null | undefined>,
) {
	const validPaths = paths.filter((path): path is string =>
		Boolean(path && !/^https?:\/\//.test(path)),
	);
	if (!validPaths.length) return;
	await createClient().storage.from(bucket).remove(validPaths);
}

export function readAudioDuration(file: File) {
	return new Promise<number>((resolve, reject) => {
		const audio = document.createElement("audio");
		const url = URL.createObjectURL(file);
		audio.preload = "metadata";
		audio.onloadedmetadata = () => {
			URL.revokeObjectURL(url);
			const duration = Math.ceil(audio.duration);
			if (Number.isFinite(duration) && duration > 0) resolve(duration);
			else reject(new Error("Không đọc được thời lượng tệp âm thanh."));
		};
		audio.onerror = () => {
			URL.revokeObjectURL(url);
			reject(new Error("Không đọc được tệp âm thanh."));
		};
		audio.src = url;
	});
}
