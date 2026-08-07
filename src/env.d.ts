/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_SUPABASE_URL: string;
	readonly VITE_SUPABASE_PUBLISHABLE_KEY: string;
	readonly VITE_APP_URL?: string;
}

declare namespace NodeJS {
	interface ProcessEnv {
		readonly SUPABASE_URL?: string;
		readonly SUPABASE_PUBLISHABLE_KEY?: string;
		readonly VITE_SUPABASE_URL?: string;
		readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
		readonly VITE_APP_URL?: string;
	}
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
