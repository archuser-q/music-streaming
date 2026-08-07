import { Link } from "@tanstack/react-router";
import { BarChart3, Disc3, LibraryBig, Mic2, Tags, Users } from "lucide-react";

const links = [
	{ to: "/admin", label: "Dashboard", icon: BarChart3 },
	{ to: "/admin/songs", label: "Bài hát", icon: Disc3 },
	{ to: "/admin/artists", label: "Nghệ sĩ", icon: Mic2 },
	{ to: "/admin/albums", label: "Album", icon: LibraryBig },
	{ to: "/admin/genres", label: "Thể loại", icon: Tags },
	{ to: "/admin/users", label: "Người dùng", icon: Users },
] as const;

export function AdminNav() {
	return (
		<nav className="admin-tabs">
			{links.map(({ to, label, icon: Icon }) => (
				<Link
					key={to}
					to={to}
					activeProps={{ className: "active" }}
					activeOptions={{ exact: to === "/admin" }}
				>
					<Icon size={17} /> {label}
				</Link>
			))}
		</nav>
	);
}
