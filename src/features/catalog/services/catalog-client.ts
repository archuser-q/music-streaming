import { createClient } from "@/lib/supabase/client";
import type { Json, SongCatalogRow } from "@/lib/supabase/database.types";
import { publicStorageUrl } from "@/lib/supabase/storage";
import type { CatalogSong, SongGenre } from "../catalog-types";

function genres(value: Json | null): SongGenre[] {
	if (!Array.isArray(value)) return [];
	return value.flatMap((item) => {
		if (!item || Array.isArray(item) || typeof item !== "object") return [];
		if (
			typeof item.id !== "string" ||
			typeof item.name !== "string" ||
			typeof item.slug !== "string"
		) {
			return [];
		}
		return [{ id: item.id, name: item.name, slug: item.slug }];
	});
}

export function catalogSongFromRow(row: SongCatalogRow): CatalogSong | null {
	if (!row.id || !row.title || !row.slug || !row.audio_path) return null;
	return {
		id: row.id,
		title: row.title,
		slug: row.slug,
		artistId: row.artist_id,
		artistName: row.artist_name ?? "Nghệ sĩ độc lập",
		artistSlug: row.artist_slug,
		albumId: row.album_id,
		albumTitle: row.album_title,
		albumSlug: row.album_slug,
		audioPath: row.audio_path,
		coverPath: row.cover_path,
		coverUrl: publicStorageUrl("music-covers", row.cover_path),
		durationSeconds: row.duration_seconds ?? 0,
		trackNumber: row.track_number,
		releaseDate: row.release_date,
		isExplicit: row.is_explicit ?? false,
		totalPlays: row.total_plays ?? 0,
		genres: genres(row.genres),
	};
}

export async function getCatalogSongsByIds(ids: string[]) {
	if (!ids.length) return [];
	const { data, error } = await createClient()
		.from("song_catalog")
		.select("*")
		.in("id", ids);
	if (error) throw error;
	const byId = new Map(
		(data ?? []).flatMap((row) => {
			const song = catalogSongFromRow(row);
			return song ? [[song.id, song] as const] : [];
		}),
	);
	return ids.flatMap((id) => {
		const song = byId.get(id);
		return song ? [song] : [];
	});
}
