import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Define public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/import(.*)", // Admin routes (will check auth inside)
]);

// Check if the path is a public stack page (individual stack views)
const isPublicStackPage = (pathname: string) => {
  // Match /stacks/{id}/{name}/review, /stacks/{id}/{name}/test, etc.
  const stackPagePattern = /^\/stacks\/\d+\/[^/]+\/(review|test|tutor|stats)$/;
  return stackPagePattern.test(pathname);
};

// Check if the path is a public stack API (read-only access)
const isPublicStackAPI = (pathname: string) => {
  // Match /api/stacks/{id} and /api/stacks/{id}/cards (GET only)
  const stackAPIPattern = /^\/api\/stacks\/\d+(\/cards)?$/;
  return stackAPIPattern.test(pathname);
};

export default clerkMiddleware(async (auth, request) => {
  const { pathname } = new URL(request.url);
  
  // Protect all routes except public ones, public stack pages, and public stack APIs
  if (!isPublicRoute(request) && !isPublicStackPage(pathname) && !isPublicStackAPI(pathname)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
