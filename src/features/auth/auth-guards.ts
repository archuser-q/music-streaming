import type { AuthSnapshot } from "./auth-types";

export type MemberAccess = "allowed" | "login" | "forbidden";

export function getMemberAccess(auth: AuthSnapshot): MemberAccess {
	if (!auth.user) return "login";
	if (!auth.profile?.is_active) return "forbidden";
	return "allowed";
}

export function hasAdminAccess(auth: AuthSnapshot) {
	return getMemberAccess(auth) === "allowed" && auth.profile?.role === "admin";
}
