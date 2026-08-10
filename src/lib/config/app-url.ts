export function getAppUrl() {
  return window.location.origin;
}

export function getPlaylistShareUrl(shareToken: string) {
  return `${getAppUrl()}/share/playlists/${shareToken}`;
}