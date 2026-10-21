// Next's `server-only` package is not installed for the Vitest resolver.
// The real module only throws when a client bundle imports it. Tests need
// the import to resolve.
export {}
