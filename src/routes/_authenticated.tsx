import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getMemberAccess } from "@/features/auth/auth-guards";

export const Route = createFileRoute("/_authenticated")({
	beforeLoad: ({ context, location }) => {
		const access = getMemberAccess(context.auth);
		if (access === "login") {
			throw redirect({
				to: "/login",
				search: { redirect: location.href },
			});
		}
		if (access === "forbidden") throw redirect({ to: "/forbidden" });
		const { user, profile } = context.auth;
		if (!user || !profile) throw redirect({ to: "/forbidden" });
		return {
			authenticatedUser: user,
			profile,
		};
	},
	component: Outlet,
});
