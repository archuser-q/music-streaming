export function getAppUrl() {
  return window.location.origin;
}

export function getAbsoluteAppUrl(pathname = "/") {
	if (/^https?:\/\//i.test(pathname)) return pathname;

	const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
	return `${getAppUrl()}${normalizedPath}`;
}

export function getPlaylistShareUrl(shareToken: string) {
	return getAbsoluteAppUrl(`/share/playlists/${shareToken}`);
}
