import { z } from "zod";

export const catalogSearchSchema = z.object({
	page: z.coerce.number().int().min(1).catch(1),
	genre: z.string().catch(""),
	artist: z.string().catch(""),
	album: z.string().catch(""),
});

export const emptyCatalogSearch = {
	page: 1,
	genre: "",
	artist: "",
	album: "",
} as const;
