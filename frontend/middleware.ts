export { default } from "next-auth/middleware"

export const config = {
  // Protect all routes except login and NextAuth API routes
  matcher: ["/((?!login|api/auth|_next/static|_next/image|favicon.ico).*)"],
}
