import type {
	AlbumRow,
	ArtistCatalogRow,
	ArtistRow,
	GenreRow,
	PlaylistRow,
} from "@/lib/supabase/database.types";

export interface SongGenre {
	id: string;
	name: string;
	slug: string;
}

export interface CatalogSong {
	id: string;
	title: string;
	slug: string;
	artistId: string | null;
	artistName: string;
	artistSlug: string | null;
	albumId: string | null;
	albumTitle: string | null;
	albumSlug: string | null;
	audioPath: string;
	coverPath: string | null;
	coverUrl: string | null;
	durationSeconds: number;
	trackNumber: number | null;
	releaseDate: string | null;
	isExplicit: boolean;
	totalPlays: number;
	genres: SongGenre[];
}

export interface PlayerTrack {
	id: string;
	title: string;
	artistName: string;
	albumTitle: string | null;
	audioPath: string;
	coverUrl: string | null;
	durationSeconds: number;
}

export interface CatalogPage {
	songs: CatalogSong[];
	total: number;
	page: number;
	pageSize: number;
	genres: GenreRow[];
	artists: Pick<ArtistRow, "id" | "name" | "slug">[];
	albums: Pick<AlbumRow, "id" | "title" | "slug" | "artist_id">[];
}

export interface SearchResult {
	type: "song" | "artist" | "album";
	id: string;
	slug: string | null;
	title: string;
	subtitle: string;
	imageUrl: string | null;
	rank: number;
	song: CatalogSong | null;
}

export interface ArtistDetail {
	artist: ArtistCatalogRow & { imageUrl: string | null };
	albums: (AlbumRow & { coverUrl: string | null })[];
	songs: CatalogSong[];
}

export interface AlbumDetail {
	album: AlbumRow & { coverUrl: string | null };
	artist: Pick<ArtistRow, "id" | "name" | "slug" | "image_path"> | null;
	songs: CatalogSong[];
}

export interface SharedPlaylistSong extends PlayerTrack {
	slug: string;
	position: number;
}

export interface SharedPlaylist {
	id: string;
	title: string;
	description: string | null;
	coverPath: string | null;
	coverUrl: string | null;
	visibility: "private" | "public";
	owner: {
		username: string;
		displayName: string | null;
		avatarUrl: string | null;
	};
	songs: SharedPlaylistSong[];
}

export type PlaylistWithCover = PlaylistRow & { coverUrl: string | null };

export function toPlayerTrack(song: CatalogSong): PlayerTrack {
	return {
		id: song.id,
		title: song.title,
		artistName: song.artistName,
		albumTitle: song.albumTitle,
		audioPath: song.audioPath,
		coverUrl: song.coverUrl,
		durationSeconds: song.durationSeconds,
	};
}
