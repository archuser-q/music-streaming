import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { hasAdminAccess } from "@/features/auth/auth-guards";

export const Route = createFileRoute("/_authenticated/admin")({
	beforeLoad: ({ context }) => {
		if (!hasAdminAccess(context.auth)) throw redirect({ to: "/forbidden" });
		return { admin: context.profile };
	},
	component: Outlet,
});
