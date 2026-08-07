export function getAppUrl() {
	return (import.meta.env.VITE_APP_URL || "http://localhost:3000").replace(
		/\/$/,
		"",
	);
}

export function getAbsoluteAppUrl(pathname = "/") {
	if (/^https?:\/\//i.test(pathname)) return pathname;

	const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
	return `${getAppUrl()}${normalizedPath}`;
}

export function getPlaylistShareUrl(shareToken: string) {
	return getAbsoluteAppUrl(`/share/playlists/${shareToken}`);
}
