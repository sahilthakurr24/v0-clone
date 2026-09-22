import {clerkMiddleware} from "@repo/auth/nextjs"

export default clerkMiddleware(async (auth, request) => {
  if (request.nextUrl.pathname === "/") {
    await auth.protect();
  }
}, {
  signInUrl: "/signin",
  signUpUrl: "/signup",
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for Clerk-specific frontend API routes
    "/__clerk/(.*)",
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
