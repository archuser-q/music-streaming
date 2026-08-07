import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";

let browserClient: ReturnType<typeof createBrowserClient<Database>> | undefined;

function getBrowserConfig() {
	const url = import.meta.env.VITE_SUPABASE_URL;
	const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

	if (!url || !publishableKey) {
		throw new Error(
			"Thiếu VITE_SUPABASE_URL hoặc VITE_SUPABASE_PUBLISHABLE_KEY",
		);
	}

	return { publishableKey, url };
}

export function createClient() {
	if (browserClient) return browserClient;

	const { publishableKey, url } = getBrowserConfig();
	browserClient = createBrowserClient<Database>(url, publishableKey);
	return browserClient;
}
