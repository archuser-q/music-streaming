import tailwindcss from "@tailwindcss/vite";

import { tanstackStart } from "@tanstack/react-start/plugin/vite";

import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { cloudflare } from '@cloudflare/vite-plugin'

const config = defineConfig({
	resolve: { tsconfigPaths: true },
	plugins: [
		tailwindcss(),
		cloudflare({ viteEnvironment: { name: 'ssr' } }),
		tanstackStart(),
		viteReact(),
	],
});

export default config;
