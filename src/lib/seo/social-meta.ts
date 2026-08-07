import { getAbsoluteAppUrl } from "@/lib/config/app-url";

export const SITE_NAME = "Âm Sắc";
export const DEFAULT_SOCIAL_IMAGE_PATH = "/og/am-sac-app-preview.png";

interface SocialMetaOptions {
	title: string;
	description: string;
	url: string;
	imageUrl?: string | null;
	imageAlt?: string;
	type?: string;
	robots?: string;
}

export function getDefaultSocialImageUrl() {
	return getAbsoluteAppUrl(DEFAULT_SOCIAL_IMAGE_PATH);
}

export function normalizeMetaDescription(description: string, maxLength = 180) {
	const normalized = description.replace(/\s+/g, " ").trim();
	if (normalized.length <= maxLength) return normalized;
	return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}

export function createSocialMeta({
	title,
	description,
	url,
	imageUrl,
	imageAlt = `${SITE_NAME} — Music Streaming`,
	type = "website",
	robots,
}: SocialMetaOptions) {
	const normalizedDescription = normalizeMetaDescription(description);
	const socialImageUrl = imageUrl || getDefaultSocialImageUrl();
	const usesDefaultImage = !imageUrl;
	const meta = [
		{ title },
		{ name: "description", content: normalizedDescription },
		{ name: "theme-color", content: "#8b5cf6" },
		{ property: "og:title", content: title },
		{ property: "og:description", content: normalizedDescription },
		{ property: "og:type", content: type },
		{ property: "og:url", content: url },
		{ property: "og:site_name", content: SITE_NAME },
		{ property: "og:locale", content: "vi_VN" },
		{ property: "og:image", content: socialImageUrl },
		{ property: "og:image:alt", content: imageAlt },
		{ name: "twitter:card", content: "summary_large_image" },
		{ name: "twitter:title", content: title },
		{ name: "twitter:description", content: normalizedDescription },
		{ name: "twitter:image", content: socialImageUrl },
		{ name: "twitter:image:alt", content: imageAlt },
	];

	if (socialImageUrl.startsWith("https://")) {
		meta.push({ property: "og:image:secure_url", content: socialImageUrl });
	}

	if (usesDefaultImage) {
		meta.push(
			{ property: "og:image:type", content: "image/png" },
			{ property: "og:image:width", content: "1200" },
			{ property: "og:image:height", content: "630" },
		);
	}

	if (robots) meta.push({ name: "robots", content: robots });

	return meta;
}

export function serializeStructuredData(data: object) {
	return JSON.stringify(data).replace(/</g, "\\u003c");
}
