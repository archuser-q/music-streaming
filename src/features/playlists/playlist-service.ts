import type {
	CatalogSong,
	PlaylistWithCover,
} from "@/features/catalog/catalog-types";
import { getCatalogSongsByIds } from "@/features/catalog/services/catalog-client";
import { createClient } from "@/lib/supabase/client";
import type {
	PlaylistRow,
	PlaylistSongRow,
} from "@/lib/supabase/database.types";
import { publicStorageUrl } from "@/lib/supabase/storage";

export interface PlaylistDetail {
	playlist: PlaylistWithCover;
	entries: Array<{ relation: PlaylistSongRow; song: CatalogSong }>;
}

export async function getOwnPlaylists(userId: string) {
	const { data, error } = await createClient()
		.from("playlists")
		.select("*")
		.eq("owner_id", userId)
		.order("updated_at", { ascending: false });
	if (error) throw error;
	return (data ?? []).map((playlist) => ({
		...playlist,
		coverUrl: publicStorageUrl("music-covers", playlist.cover_path),
	}));
}

export async function getPlaylistDetail(
	id: string,
): Promise<PlaylistDetail | null> {
	const [playlistResult, songsResult] = await Promise.all([
		createClient().from("playlists").select("*").eq("id", id).maybeSingle(),
		createClient()
			.from("playlist_songs")
			.select("*")
			.eq("playlist_id", id)
			.order("position"),
	]);
	if (playlistResult.error) throw playlistResult.error;
	if (songsResult.error) throw songsResult.error;
	if (!playlistResult.data) return null;

	const relations = songsResult.data ?? [];
	const songs = await getCatalogSongsByIds(
		relations.map((item) => item.song_id),
	);
	const songMap = new Map(songs.map((song) => [song.id, song]));
	return {
		playlist: {
			...playlistResult.data,
			coverUrl: publicStorageUrl(
				"music-covers",
				playlistResult.data.cover_path,
			),
		},
		entries: relations.flatMap((relation) => {
			const song = songMap.get(relation.song_id);
			return song ? [{ relation, song }] : [];
		}),
	};
}

export async function savePlaylist({
	playlist,
	ownerId,
}: {
	playlist: Pick<
		PlaylistRow,
		"title" | "description" | "visibility" | "share_enabled" | "cover_path"
	> & { id?: string };
	ownerId: string;
}) {
	if (playlist.id) {
		const { id, ...update } = playlist;
		const { data, error } = await createClient()
			.from("playlists")
			.update(update)
			.eq("id", id)
			.select("*")
			.single();
		if (error) throw error;
		return data;
	}
	const { data, error } = await createClient()
		.from("playlists")
		.insert({
			title: playlist.title,
			description: playlist.description,
			visibility: playlist.visibility,
			share_enabled: playlist.share_enabled,
			cover_path: playlist.cover_path,
			owner_id: ownerId,
		})
		.select("*")
		.single();
	if (error) throw error;
	return data;
}

export async function addSongToPlaylist({
	playlistId,
	songId,
	userId,
}: {
	playlistId: string;
	songId: string;
	userId: string;
}) {
	const { data: lastEntry, error: positionError } = await createClient()
		.from("playlist_songs")
		.select("position")
		.eq("playlist_id", playlistId)
		.order("position", { ascending: false })
		.limit(1)
		.maybeSingle();
	if (positionError) throw positionError;

	const { error } = await createClient()
		.from("playlist_songs")
		.insert({
			playlist_id: playlistId,
			song_id: songId,
			position: (lastEntry?.position ?? 0) + 1,
			added_by: userId,
		});
	if (error) throw error;
}

export async function removeSongFromPlaylist({
	playlistId,
	songId,
}: {
	playlistId: string;
	songId: string;
}) {
	const client = createClient();
	const { data: removedEntry, error: readError } = await client
		.from("playlist_songs")
		.select("position")
		.eq("playlist_id", playlistId)
		.eq("song_id", songId)
		.maybeSingle();
	if (readError) throw readError;

	const { error: deleteError } = await client
		.from("playlist_songs")
		.delete()
		.eq("playlist_id", playlistId)
		.eq("song_id", songId);
	if (deleteError) throw deleteError;
	if (!removedEntry) return;

	const { data: followingEntries, error: followingError } = await client
		.from("playlist_songs")
		.select("song_id,position")
		.eq("playlist_id", playlistId)
		.gt("position", removedEntry.position)
		.order("position");
	if (followingError) throw followingError;

	for (const entry of followingEntries ?? []) {
		const { error } = await client
			.from("playlist_songs")
			.update({ position: entry.position - 1 })
			.eq("playlist_id", playlistId)
			.eq("song_id", entry.song_id);
		if (error) throw error;
	}
}
