import { ListPlus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/features/auth/auth-context";
import type { PlaylistRow } from "@/lib/supabase/database.types";
import { addSongToPlaylist, getOwnPlaylists } from "./playlist-service";

export function AddToPlaylistButton({ songId }: { songId: string }) {
	const { user } = useAuth();
	const [open, setOpen] = useState(false);
	const [playlists, setPlaylists] = useState<PlaylistRow[]>([]);
	const [saving, setSaving] = useState(false);
	const wrapperRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!open || !user) return;
		void getOwnPlaylists(user.id)
			.then(setPlaylists)
			.catch(() => {
				toast.error("Không thể tải danh sách playlist.");
			});
	}, [open, user]);

	useEffect(() => {
		if (!open) return;
		const onPointerDown = (event: PointerEvent) => {
			if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
		};
		document.addEventListener("pointerdown", onPointerDown);
		return () => document.removeEventListener("pointerdown", onPointerDown);
	}, [open]);

	const add = async (playlist: PlaylistRow) => {
		if (!user) return;
		setSaving(true);
		try {
			await addSongToPlaylist({
				playlistId: playlist.id,
				songId,
				userId: user.id,
			});
			toast.success(`Đã thêm vào “${playlist.title}”.`);
			setOpen(false);
		} catch (error) {
			const code =
				typeof error === "object" && error && "code" in error
					? error.code
					: null;
			if (code === "23505") toast.info("Bài hát đã có trong playlist này.");
			else toast.error("Không thể thêm bài hát vào playlist.");
		} finally {
			setSaving(false);
		}
	};

	if (!user) {
		return (
			<button
				type="button"
				className="icon-button"
				onClick={() => toast.info("Đăng nhập để tạo playlist.")}
				aria-label="Thêm vào playlist"
			>
				<ListPlus size={18} />
			</button>
		);
	}

	return (
		<div className="popover-wrapper" ref={wrapperRef}>
			<button
				type="button"
				className="icon-button"
				onClick={() => setOpen((value) => !value)}
				aria-label="Thêm vào playlist"
			>
				<ListPlus size={18} />
			</button>
			{open ? (
				<div className="popover-menu">
					<strong>Thêm vào playlist</strong>
					{playlists.length ? (
						playlists.map((playlist) => (
							<button
								type="button"
								key={playlist.id}
								disabled={saving}
								onClick={() => void add(playlist)}
							>
								{playlist.title}
							</button>
						))
					) : (
						<span>Bạn chưa có playlist.</span>
					)}
				</div>
			) : null}
		</div>
	);
}
