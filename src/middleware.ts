import NextAuth from "next-auth"
import { auth } from "./auth"

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isAuthPage = req.nextUrl.pathname.startsWith('/api/auth');
  
  if (!isLoggedIn && !isAuthPage && req.nextUrl.pathname !== '/') {
    // Redirect unauthenticated users to the home page if they try to access protected routes
    // return Response.redirect(new URL('/', req.nextUrl));
  }
})

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
