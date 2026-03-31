import "@testing-library/jest-dom"

// Provide stub env vars so @t3-oss/env-nextjs validation passes during tests
process.env.NEXT_PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001"
process.env.NEXT_PUBLIC_API_BASE_URL =
	process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3000"
process.env.NEXT_PUBLIC_API_VERSION = process.env.NEXT_PUBLIC_API_VERSION ?? "v1"
