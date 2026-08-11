import {
	createRootRoute,
	type ErrorComponentProps,
	HeadContent,
	Outlet,
	Scripts,
} from "@tanstack/react-router";
import { CircleAlert, SearchX } from "lucide-react";
import { Toaster } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { AuthProvider } from "@/features/auth/auth-context";
import { resolveAuthSnapshot } from "@/features/auth/auth-snapshot-cache";
import { LikedSongsProvider } from "@/features/liked-songs/liked-songs-context";
import { PlayerBar } from "@/features/player/player-bar";
import { PlayerProvider } from "@/features/player/player-context";
import { getErrorMessage } from "@/lib/format";
import appCss from "../styles.css?url";

export const Route = createRootRoute({
	beforeLoad: async () => ({ auth: await resolveAuthSnapshot() }),
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1, viewport-fit=cover",
			},
			{ title: "Âm Sắc — Music Streaming" },
			{
				name: "description",
				content: "Nghe nhạc, tạo playlist và khám phá nghệ sĩ yêu thích.",
			},
		],
		links: [{ rel: "stylesheet", href: appCss }],
	}),
	component: RootApp,
	errorComponent: AppError,
	notFoundComponent: AppNotFound,
	shellComponent: RootDocument,
});

function AppError({ error, reset }: ErrorComponentProps) {
	return (
		<main className="standalone-state">
			<div className="empty-state">
				<div className="empty-icon">
					<CircleAlert size={28} />
				</div>
				<h1>Không thể tải nội dung</h1>
				<p>{getErrorMessage(error)}</p>
				<button type="button" className="button primary" onClick={reset}>
					Thử lại
				</button>
			</div>
		</main>
	);
}

function AppNotFound() {
	return (
		<main className="standalone-state">
			<div className="empty-state">
				<div className="empty-icon">
					<SearchX size={28} />
				</div>
				<h1>Không tìm thấy trang</h1>
				<p>Liên kết không tồn tại hoặc nội dung đã bị gỡ.</p>
				<a className="button primary" href="/">
					Về trang chủ
				</a>
			</div>
		</main>
	);
}

function RootApp() {
	const { auth } = Route.useRouteContext();
	return (
		<AuthProvider initialAuth={auth}>
			<PlayerProvider>
				<LikedSongsProvider>
					<AppShell>
						<Outlet />
					</AppShell>
					<PlayerBar />
					<Toaster theme="dark" position="top-right" richColors />
				</LikedSongsProvider>
			</PlayerProvider>
		</AuthProvider>
	);
}

function RootDocument({ children }: { children: React.ReactNode }) {
	return (
		<html lang="vi">
			<head>
				<HeadContent />
			</head>
			<body>
				{children}
				<Scripts />
			</body>
		</html>
	);
}
