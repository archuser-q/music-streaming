export function getAppUrl() {
	return (import.meta.env.VITE_APP_URL || "http://localhost:3000").replace(
		/\/$/,
		"",
	);
}

export function getPlaylistShareUrl(shareToken: string) {
	return `${getAppUrl()}/share/playlists/${shareToken}`;
}
