export type Json =
	| string
	| number
	| boolean
	| null
	| { [key: string]: Json | undefined }
	| Json[];

export type AppRole = "admin" | "user";
export type SongStatus = "draft" | "pending" | "published" | "rejected";
export type SongSource = "admin_upload" | "user_upload";
export type PlaylistVisibility = "private" | "public";

type TableDefinition<Row, Insert, Update> = {
	Row: Row;
	Insert: Insert;
	Update: Update;
	Relationships: [];
};

export type ProfileRow = {
	id: string;
	username: string;
	display_name: string | null;
	avatar_path: string | null;
	bio: string | null;
	role: AppRole;
	is_active: boolean;
	created_at: string;
	updated_at: string;
};

export type GenreRow = {
	id: string;
	name: string;
	slug: string;
	description: string | null;
	created_at: string;
	updated_at: string;
};

export type ArtistRow = {
	id: string;
	name: string;
	slug: string;
	biography: string | null;
	image_path: string | null;
	country: string | null;
	created_by: string | null;
	is_verified: boolean;
	created_at: string;
	updated_at: string;
};

export type AlbumRow = {
	id: string;
	artist_id: string;
	title: string;
	slug: string;
	description: string | null;
	cover_path: string | null;
	release_date: string | null;
	created_by: string | null;
	created_at: string;
	updated_at: string;
};

export type SongRow = {
	id: string;
	title: string;
	slug: string;
	artist_id: string | null;
	album_id: string | null;
	uploaded_by: string | null;
	source: SongSource;
	status: SongStatus;
	audio_path: string;
	cover_path: string | null;
	duration_seconds: number;
	track_number: number | null;
	release_date: string | null;
	lyrics_language: string | null;
	is_explicit: boolean;
	total_plays: number;
	published_at: string | null;
	created_at: string;
	updated_at: string;
};

export type SongGenreRow = {
	song_id: string;
	genre_id: string;
	created_at: string;
};

export type LyricsLineRow = {
	id: number;
	song_id: string;
	line_order: number;
	start_ms: number;
	end_ms: number | null;
	text: string;
	created_at: string;
	updated_at: string;
};

export type PlaylistRow = {
	id: string;
	owner_id: string;
	title: string;
	description: string | null;
	cover_path: string | null;
	visibility: PlaylistVisibility;
	share_enabled: boolean;
	share_token: string;
	created_at: string;
	updated_at: string;
};

export type PlaylistSongRow = {
	playlist_id: string;
	song_id: string;
	position: number;
	added_by: string | null;
	added_at: string;
};

export type LikedSongRow = {
	user_id: string;
	song_id: string;
	liked_at: string;
};

export type SongPlayRow = {
	id: number;
	user_id: string;
	song_id: string;
	session_id: string;
	listened_seconds: number;
	completed: boolean;
	played_at: string;
};

export type SongCatalogRow = {
	id: string | null;
	title: string | null;
	slug: string | null;
	artist_id: string | null;
	artist_name: string | null;
	artist_slug: string | null;
	album_id: string | null;
	album_title: string | null;
	album_slug: string | null;
	audio_path: string | null;
	cover_path: string | null;
	duration_seconds: number | null;
	track_number: number | null;
	release_date: string | null;
	is_explicit: boolean | null;
	total_plays: number | null;
	status: SongStatus | null;
	uploaded_by: string | null;
	genres: Json | null;
};

export type ArtistCatalogRow = {
	id: string | null;
	name: string | null;
	slug: string | null;
	biography: string | null;
	image_path: string | null;
	country: string | null;
	is_verified: boolean | null;
	song_count: number | null;
	album_count: number | null;
	total_plays: number | null;
};

export type SearchCatalogRow = {
	entity_type: string;
	entity_id: string;
	title: string;
	subtitle: string;
	image_path: string | null;
	rank_score: number;
};

export interface Database {
	public: {
		Tables: {
			profiles: TableDefinition<
				ProfileRow,
				{
					id: string;
					username: string;
					display_name?: string | null;
					avatar_path?: string | null;
					bio?: string | null;
					role?: AppRole;
					is_active?: boolean;
					created_at?: string;
					updated_at?: string;
				},
				Partial<Omit<ProfileRow, "id" | "created_at">>
			>;
			genres: TableDefinition<
				GenreRow,
				{
					id?: string;
					name: string;
					slug: string;
					description?: string | null;
					created_at?: string;
					updated_at?: string;
				},
				Partial<Omit<GenreRow, "id" | "created_at">>
			>;
			artists: TableDefinition<
				ArtistRow,
				{
					id?: string;
					name: string;
					slug: string;
					biography?: string | null;
					image_path?: string | null;
					country?: string | null;
					created_by?: string | null;
					is_verified?: boolean;
					created_at?: string;
					updated_at?: string;
				},
				Partial<Omit<ArtistRow, "id" | "created_at">>
			>;
			albums: TableDefinition<
				AlbumRow,
				{
					id?: string;
					artist_id: string;
					title: string;
					slug: string;
					description?: string | null;
					cover_path?: string | null;
					release_date?: string | null;
					created_by?: string | null;
					created_at?: string;
					updated_at?: string;
				},
				Partial<Omit<AlbumRow, "id" | "created_at">>
			>;
			songs: TableDefinition<
				SongRow,
				{
					id?: string;
					title: string;
					slug: string;
					artist_id?: string | null;
					album_id?: string | null;
					uploaded_by?: string | null;
					source?: SongSource;
					status?: SongStatus;
					audio_path: string;
					cover_path?: string | null;
					duration_seconds: number;
					track_number?: number | null;
					release_date?: string | null;
					lyrics_language?: string | null;
					is_explicit?: boolean;
					total_plays?: number;
					published_at?: string | null;
					created_at?: string;
					updated_at?: string;
				},
				Partial<Omit<SongRow, "id" | "created_at">>
			>;
			song_genres: TableDefinition<
				SongGenreRow,
				{ song_id: string; genre_id: string; created_at?: string },
				Partial<SongGenreRow>
			>;
			lyrics_lines: TableDefinition<
				LyricsLineRow,
				{
					id?: number;
					song_id: string;
					line_order: number;
					start_ms: number;
					end_ms?: number | null;
					text: string;
					created_at?: string;
					updated_at?: string;
				},
				Partial<Omit<LyricsLineRow, "id" | "created_at">>
			>;
			playlists: TableDefinition<
				PlaylistRow,
				{
					id?: string;
					owner_id: string;
					title: string;
					description?: string | null;
					cover_path?: string | null;
					visibility?: PlaylistVisibility;
					share_enabled?: boolean;
					share_token?: string;
					created_at?: string;
					updated_at?: string;
				},
				Partial<Omit<PlaylistRow, "id" | "owner_id" | "created_at">>
			>;
			playlist_songs: TableDefinition<
				PlaylistSongRow,
				{
					playlist_id: string;
					song_id: string;
					position: number;
					added_by?: string | null;
					added_at?: string;
				},
				Partial<PlaylistSongRow>
			>;
			liked_songs: TableDefinition<
				LikedSongRow,
				{ user_id: string; song_id: string; liked_at?: string },
				Partial<LikedSongRow>
			>;
			song_plays: TableDefinition<
				SongPlayRow,
				{
					id?: number;
					user_id: string;
					song_id: string;
					session_id: string;
					listened_seconds?: number;
					completed?: boolean;
					played_at?: string;
				},
				Partial<SongPlayRow>
			>;
		};
		Views: {
			song_catalog: {
				Row: SongCatalogRow;
				Relationships: [];
			};
			artist_catalog: {
				Row: ArtistCatalogRow;
				Relationships: [];
			};
		};
		Functions: {
			record_song_play: {
				Args: {
					p_song_id: string;
					p_session_id: string;
					p_listened_seconds: number;
					p_completed?: boolean;
				};
				Returns: boolean;
			};
			search_catalog: {
				Args: { p_query: string; p_limit?: number };
				Returns: SearchCatalogRow[];
			};
			recommend_songs: {
				Args: { p_limit?: number };
				Returns: {
					song_id: string;
					title: string;
					artist_name: string;
					album_title: string | null;
					cover_path: string | null;
					duration_seconds: number;
					score: number;
				}[];
			};
			get_shared_playlist: {
				Args: { p_share_token: string };
				Returns: Json;
			};
			admin_set_user_role: {
				Args: { p_user_id: string; p_role: AppRole };
				Returns: undefined;
			};
			admin_set_user_active: {
				Args: { p_user_id: string; p_is_active: boolean };
				Returns: undefined;
			};
			admin_dashboard_summary: {
				Args: Record<PropertyKey, never>;
				Returns: {
					total_songs: number;
					published_songs: number;
					total_artists: number;
					total_albums: number;
					total_users: number;
					total_plays: number;
				}[];
			};
			admin_top_songs: {
				Args: { p_limit?: number };
				Returns: {
					song_id: string;
					title: string;
					artist_name: string;
					total_plays: number;
				}[];
			};
			admin_play_stats: {
				Args: {
					p_granularity?: string;
					p_from?: string;
					p_to?: string;
				};
				Returns: {
					period_start: string;
					play_count: number;
					unique_listeners: number;
				}[];
			};
		};
		Enums: {
			app_role: AppRole;
			song_status: SongStatus;
			song_source: SongSource;
			playlist_visibility: PlaylistVisibility;
		};
		CompositeTypes: Record<PropertyKey, never>;
	};
}

export type Tables<Name extends keyof Database["public"]["Tables"]> =
	Database["public"]["Tables"][Name]["Row"];

export type TablesInsert<Name extends keyof Database["public"]["Tables"]> =
	Database["public"]["Tables"][Name]["Insert"];

export type TablesUpdate<Name extends keyof Database["public"]["Tables"]> =
	Database["public"]["Tables"][Name]["Update"];
