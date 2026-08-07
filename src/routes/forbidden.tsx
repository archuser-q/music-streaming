import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldX } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

export const Route = createFileRoute("/forbidden")({
	component: ForbiddenPage,
});

function ForbiddenPage() {
	return (
		<div className="center-page">
			<EmptyState
				icon={ShieldX}
				title="Không có quyền truy cập"
				description="Tài khoản của bạn không được phép mở khu vực này."
				action={
					<Link
						to="/"
						search={{ page: 1, genre: "", artist: "", album: "" }}
						className="button primary"
					>
						Về trang chủ
					</Link>
				}
			/>
		</div>
	);
}
