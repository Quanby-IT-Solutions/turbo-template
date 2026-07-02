import type { MetadataRoute } from "next"

import {
	APP_BACKGROUND_COLOR,
	APP_DESCRIPTION,
	APP_NAME,
	APP_SHORT_NAME,
	APP_THEME_COLOR,
} from "@/core/lib/app-config"

export default function manifest(): MetadataRoute.Manifest {
	return {
		name: APP_NAME,
		short_name: APP_SHORT_NAME,
		description: APP_DESCRIPTION,
		id: "/",
		start_url: "/",
		scope: "/",
		display: "standalone",
		orientation: "portrait",
		background_color: APP_BACKGROUND_COLOR,
		theme_color: APP_THEME_COLOR,
		categories: ["productivity"],
		icons: [
			{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
			{ src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
			{
				src: "/icons/icon-512-maskable.png",
				sizes: "512x512",
				type: "image/png",
				purpose: "maskable",
			},
		],
	}
}
