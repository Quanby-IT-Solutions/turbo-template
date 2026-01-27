import "dotenv/config"

import type { NextConfig } from "next"

import "./env"

/** @type {import("next").NextConfig} */
const config: NextConfig = {
	// output: "standalone",
	// /** Enables hot reloading for local packages without a build step */
	// transpilePackages: [
	// 	"@repo/auth",
	// 	"@repo/backend",
	// 	"@repo/contracts",
	// 	"@repo/db",
	// 	"@t3-oss/env-core",
	// 	"@t3-oss/env-nextjs",
	// ],

	typescript: { ignoreBuildErrors: true },
	reactCompiler: true,

	images: {
		remotePatterns: [
			{
				protocol: "https",
				hostname: "api.qrserver.com",
			},
		],
	},

	// Serve static files from uploads folder when using local storage
	// Also rewrite SDK files to root for all nested paths (SDK uses relative publicPath "./")
	async rewrites() {
		return [
			{
				source: "/uploads/:path*",
				destination: "/uploads/:path*",
			},
			// BiosenseSignal SDK rewrites - the SDK uses relative paths ("./")
			// so when page is at /patient/self-check/, it tries to fetch ./a.wasm.gz
			// which becomes /patient/self-check/a.wasm.gz - we need to redirect to root
			{
				source: "/:path*/a.wasm.gz",
				destination: "/a.wasm.gz",
			},
			{
				source: "/:path*/a.wasm",
				destination: "/a.wasm",
			},
			{
				source: "/:path*/a.js",
				destination: "/a.js",
			},
			{
				source: "/:path*/a.worker.js",
				destination: "/a.worker.js",
			},
			{
				source: "/:path*/799.js",
				destination: "/799.js",
			},
			{
				source: "/:path*/models/:model*",
				destination: "/models/:model*",
			},
		]
	},

	// Configure for BiosenseSignal SDK - requires webpack for WASM support
	// Note: Use --webpack flag when running dev server (e.g., pnpm dev)
	webpack: (config, { isServer }) => {
		if (!isServer) {
			// Handle WASM files
			config.experiments = {
				...config.experiments,
				asyncWebAssembly: true,
			}

			// Handle .wasm.gz files - SDK will fetch these from public directory
			config.module.rules.push({
				test: /\.wasm\.gz$/,
				type: "asset/resource",
			})

			// Handle worker files - SDK will fetch these from public directory
			config.module.rules.push({
				test: /\.worker\.js$/,
				type: "asset/resource",
			})

			// Resolve fallbacks for Node.js modules (if needed by SDK)
			config.resolve.fallback = {
				...config.resolve.fallback,
				fs: false,
				net: false,
				tls: false,
			}
			
			// Ensure SDK files are copied to public directory during build
			config.resolve.alias = {
				...config.resolve.alias,
				'@biosensesignal/web-sdk/dist/a.wasm.gz$': '/a.wasm.gz',
				'@biosensesignal/web-sdk/dist/a.worker.js$': '/a.worker.js',
			}
		}
		return config
	},

	// Copy SDK dist files to public directory
	async headers() {
		return [
			{
				source: "/:path*",
				headers: [
					{
						key: "Cross-Origin-Opener-Policy",
						value: "same-origin",
					},
					{
						key: "Cross-Origin-Embedder-Policy",
						value: "require-corp",
					},
				],
			},
			{
				// Add proper content-type for WASM files
				source: "/a.wasm.gz",
				headers: [
					{
						key: "Content-Type",
						value: "application/wasm",
					},
					{
						key: "Content-Encoding",
						value: "gzip",
					},
					{
						key: "Cross-Origin-Resource-Policy",
						value: "cross-origin",
					},
					{
						key: "Access-Control-Allow-Origin",
						value: "*",
					},
				],
			},
			{
				// Add proper content-type for worker files (worker scripts need COEP per SDK docs)
				source: "/a.worker.js",
				headers: [
					{
						key: "Content-Type",
						value: "application/javascript",
					},
					{
						key: "Cross-Origin-Embedder-Policy",
						value: "require-corp",
					},
					{
						key: "Cross-Origin-Resource-Policy",
						value: "cross-origin",
					},
					{
						key: "Access-Control-Allow-Origin",
						value: "*",
					},
				],
			},
			{
				// Add headers for all SDK files
				source: "/a.js",
				headers: [
					{
						key: "Content-Type",
						value: "application/javascript",
					},
					{
						key: "Cross-Origin-Resource-Policy",
						value: "cross-origin",
					},
				],
			},
			{
				// Add headers for models directory
				source: "/models/:path*",
				headers: [
					{
						key: "Cross-Origin-Resource-Policy",
						value: "cross-origin",
					},
				],
			},
		]
	},
}

export default config
