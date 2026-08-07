import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
	BarChart3,
	Disc3,
	Heart,
	Home,
	Library,
	LogIn,
	LogOut,
	Menu,
	Music2,
	Search,
	ShieldCheck,
	X,
} from "lucide-react";
import { type ReactNode, useState } from "react";
import { useAuth } from "@/features/auth/auth-context";

const memberLinks = [
	{ to: "/liked", label: "Bài hát yêu thích", icon: Heart },
	{ to: "/playlists", label: "Playlist của bạn", icon: Library },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
	const auth = useAuth();
	const navigate = useNavigate();
	const location = useLocation();
	const [mobileOpen, setMobileOpen] = useState(false);

	const close = () => setMobileOpen(false);
	const isAuthPage = ["/login", "/register"].includes(location.pathname);

	if (isAuthPage) return <main className="auth-shell">{children}</main>;

	return (
		<div className="app-layout">
			<button
				type="button"
				className="mobile-menu-button icon-button"
				onClick={() => setMobileOpen(true)}
				aria-label="Mở menu"
			>
				<Menu />
			</button>
			{mobileOpen ? (
				<button
					type="button"
					className="sidebar-backdrop"
					onClick={close}
					aria-label="Đóng menu"
				/>
			) : null}
			<aside className={mobileOpen ? "sidebar open" : "sidebar"}>
				<div className="brand-row">
					<Link
						to="/"
						search={{ page: 1, genre: "", artist: "", album: "" }}
						className="brand"
						onClick={close}
					>
						<span className="brand-mark">
							<Music2 size={21} />
						</span>
						<span>Âm Sắc</span>
					</Link>
					<button
						type="button"
						className="mobile-close icon-button"
						onClick={close}
						aria-label="Đóng menu"
					>
						<X size={19} />
					</button>
				</div>

				<nav className="main-nav">
					<p className="nav-label">Nghe nhạc</p>
					<Link
						to="/"
						search={{ page: 1, genre: "", artist: "", album: "" }}
						onClick={close}
						activeProps={{ className: "active" }}
					>
						<Home size={19} /> Khám phá
					</Link>
					<Link
						to="/search"
						search={{ q: "" }}
						onClick={close}
						activeProps={{ className: "active" }}
					>
						<Search size={19} /> Tìm kiếm
					</Link>
					{auth.user ? (
						<>
							<p className="nav-label">Thư viện</p>
							{memberLinks.map(({ to, label, icon: Icon }) => (
								<Link
									key={to}
									to={to}
									onClick={close}
									activeProps={{ className: "active" }}
								>
									<Icon size={19} /> {label}
								</Link>
							))}
						</>
					) : null}
					{auth.profile?.role === "admin" ? (
						<>
							<p className="nav-label">Quản trị</p>
							<Link
								to="/admin"
								onClick={close}
								activeProps={{ className: "active" }}
							>
								<BarChart3 size={19} /> Dashboard
							</Link>
							<Link
								to="/admin/songs"
								onClick={close}
								activeProps={{ className: "active" }}
							>
								<Disc3 size={19} /> Nội dung
							</Link>
							<Link
								to="/admin/users"
								onClick={close}
								activeProps={{ className: "active" }}
							>
								<ShieldCheck size={19} /> Người dùng
							</Link>
						</>
					) : null}
				</nav>

				<div className="sidebar-account">
					{auth.user ? (
						<>
							<div className="avatar-placeholder">
								{(auth.profile?.display_name ?? auth.user.email ?? "U")
									.slice(0, 1)
									.toUpperCase()}
							</div>
							<div className="truncate grow">
								<strong>
									{auth.profile?.display_name ?? auth.profile?.username}
								</strong>
								<span>
									{auth.profile?.role === "admin"
										? "Quản trị viên"
										: "Thành viên"}
								</span>
							</div>
							<button
								type="button"
								className="icon-button"
								onClick={async () => {
									await auth.signOut();
									await navigate({
										to: "/",
										search: { page: 1, genre: "", artist: "", album: "" },
									});
								}}
								aria-label="Đăng xuất"
							>
								<LogOut size={18} />
							</button>
						</>
					) : (
						<Link to="/login" className="button primary full" onClick={close}>
							<LogIn size={18} /> Đăng nhập
						</Link>
					)}
				</div>
			</aside>
			<main className="page-content">{children}</main>
		</div>
	);
}
