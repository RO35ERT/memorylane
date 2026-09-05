import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"
import type { NextAuthRequest } from "next-auth"

export default auth((req: NextAuthRequest) => {
  const session = req.auth
  const isLoggedIn = !!session

  const { pathname } = req.nextUrl
  const isAuthPage = pathname.startsWith("/auth/")
  const isApiRoute = pathname.startsWith("/api/")

  // Always allow API routes through
  if (isApiRoute) return NextResponse.next()

  // If on an auth page and already logged in, go to home
  if (isAuthPage && isLoggedIn) {
    return NextResponse.redirect(new URL("/", req.url))
  }

  // If not on an auth page and not logged in, go to sign in
  if (!isAuthPage && !isLoggedIn) {
    return NextResponse.redirect(new URL("/auth/signin", req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
