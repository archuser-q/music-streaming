import "@tanstack/react-start/server-only";

import { createServerClient } from "@supabase/ssr";
import {
	getCookies,
	setCookie,
	setResponseHeader,
} from "@tanstack/react-start/server";
import { env } from "cloudflare:workers";
import type { Database } from "./database.types";

export function createClient() {
	const url = env.SUPABASE_URL ?? env.VITE_SUPABASE_URL;
	const publishableKey =
		env.SUPABASE_PUBLISHABLE_KEY ??
		env.VITE_SUPABASE_PUBLISHABLE_KEY;

	if (!url || !publishableKey) {
		throw new Error("Thiếu cấu hình Supabase phía server");
	}

	return createServerClient<Database>(url, publishableKey, {
		cookies: {
			getAll() {
				return Object.entries(getCookies()).map(([name, value]) => ({
					name,
					value,
				}));
			},
			setAll(cookies, headers) {
				for (const { name, value, options } of cookies) {
					setCookie(name, value, options);
				}

				for (const [name, value] of Object.entries(headers)) {
					setResponseHeader(name, value);
				}
			},
		},
	});
}
