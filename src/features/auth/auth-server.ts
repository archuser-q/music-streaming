import { createServerFn } from "@tanstack/react-start";
import type { AuthSnapshot } from "./auth-types";

export const getAuthSnapshot = createServerFn({ method: "GET" }).handler(
	async (): Promise<AuthSnapshot> => {
		const { createClient } = await import("@/lib/supabase/server");
		const supabase = createClient();
		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (!user) return { user: null, profile: null };

		const { data: profile } = await supabase
			.from("profiles")
			.select("*")
			.eq("id", user.id)
			.maybeSingle();

		return {
			user: {
				id: user.id,
				email: user.email,
				created_at: user.created_at,
			},
			profile,
		};
	},
);
