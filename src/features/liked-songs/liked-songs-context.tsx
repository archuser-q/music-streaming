import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";
import { toast } from "sonner";
import { useAuth } from "@/features/auth/auth-context";
import { createClient } from "@/lib/supabase/client";

interface LikedSongsValue {
	likedIds: Set<string>;
	isLiked: (songId: string) => boolean;
	toggleLike: (songId: string) => Promise<void>;
	refresh: () => Promise<void>;
}

const LikedSongsContext = createContext<LikedSongsValue | null>(null);

export function LikedSongsProvider({ children }: { children: ReactNode }) {
	const { user } = useAuth();
	const [likedIds, setLikedIds] = useState(new Set<string>());

	const refresh = useCallback(async () => {
		if (!user) {
			setLikedIds(new Set());
			return;
		}
		const { data, error } = await createClient()
			.from("liked_songs")
			.select("song_id")
			.eq("user_id", user.id);
		if (!error) setLikedIds(new Set((data ?? []).map((item) => item.song_id)));
	}, [user]);

	useEffect(() => {
		void refresh();
	}, [refresh]);

	const toggleLike = useCallback(
		async (songId: string) => {
			if (!user) {
				toast.info("Đăng nhập để lưu bài hát yêu thích.");
				return;
			}
			const wasLiked = likedIds.has(songId);
			setLikedIds((current) => {
				const next = new Set(current);
				if (wasLiked) next.delete(songId);
				else next.add(songId);
				return next;
			});

			const query = wasLiked
				? createClient()
						.from("liked_songs")
						.delete()
						.eq("user_id", user.id)
						.eq("song_id", songId)
				: createClient()
						.from("liked_songs")
						.insert({ user_id: user.id, song_id: songId });
			const { error } = await query;
			if (error) {
				toast.error("Không thể cập nhật bài hát yêu thích.");
				await refresh();
			}
		},
		[likedIds, refresh, user],
	);

	const value = useMemo<LikedSongsValue>(
		() => ({
			likedIds,
			isLiked: (songId) => likedIds.has(songId),
			toggleLike,
			refresh,
		}),
		[likedIds, refresh, toggleLike],
	);

	return (
		<LikedSongsContext.Provider value={value}>
			{children}
		</LikedSongsContext.Provider>
	);
}

export function useLikedSongs() {
	const context = useContext(LikedSongsContext);
	if (!context) {
		throw new Error("useLikedSongs phải được dùng trong LikedSongsProvider");
	}
	return context;
}
