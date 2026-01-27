import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const response = NextResponse.next()

  // Set COOP and COEP headers for all routes
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin')
  response.headers.set('Cross-Origin-Embedder-Policy', 'require-corp')

  // Special handling for WASM files
  if (request.nextUrl.pathname.endsWith('.wasm.gz')) {
    response.headers.set('Content-Type', 'application/wasm')
    response.headers.set('Content-Encoding', 'gzip')
    response.headers.set('Cross-Origin-Resource-Policy', 'cross-origin')
    response.headers.set('Access-Control-Allow-Origin', '*')
  }

  // Special handling for worker files
  if (request.nextUrl.pathname.endsWith('.worker.js')) {
    response.headers.set('Content-Type', 'application/javascript')
    response.headers.set('Cross-Origin-Embedder-Policy', 'require-corp')
  }

  // Handle model files
  if (request.nextUrl.pathname.startsWith('/models/')) {
    response.headers.set('Cross-Origin-Resource-Policy', 'cross-origin')
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
