import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const config = defineConfig(async ({ command, isPreview }) => {
	const cloudflarePlugins =
		command === "build" || isPreview
			? [
					(await import("@cloudflare/vite-plugin")).cloudflare({
						viteEnvironment: { name: "ssr" },
					}),
				]
			: [];

	return {
		resolve: { tsconfigPaths: true },
		plugins: [
			...cloudflarePlugins,
			tailwindcss(),
			tanstackStart(),
			viteReact(),
		],
	};
});

export default config;
