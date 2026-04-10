import "@testing-library/jest-dom"

// Provide stub env vars so @t3-oss/env-nextjs validation passes during tests
// eslint-disable-next-line no-restricted-properties
process.env.NEXT_PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001"
// eslint-disable-next-line no-restricted-properties
process.env.NEXT_PUBLIC_API_BASE_URL =
	// eslint-disable-next-line no-restricted-properties
	process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3000"
// eslint-disable-next-line no-restricted-properties
process.env.NEXT_PUBLIC_API_VERSION = process.env.NEXT_PUBLIC_API_VERSION ?? "v1"
