import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { clerk, env } from "@/lib/env";

/**
 * NEXORA sign-in (Clerk) reads its session here, server-side only: no Clerk script runs in
 * the browser, and an expired session token is refreshed by Clerk's handshake redirect. Pages
 * decide what needs a sign-in (see src/lib/auth/viewer.ts). Until both Clerk keys are set this
 * does nothing, so a self-hosted install never talks to Clerk.
 */
const withClerk = clerkMiddleware(
  async () => undefined,
  () => {
    const config = clerk()!;
    return {
      secretKey: config.secretKey,
      publishableKey: config.publishableKey,
      signInUrl: `${config.accountUrl}/sign-in`,
      // Only tokens minted for this app's origin are accepted.
      authorizedParties: [new URL(env().APP_URL).origin],
    };
  },
);

export default function proxy(request: NextRequest, event: NextFetchEvent) {
  if (!clerk()) return NextResponse.next();
  return withClerk(request, event);
}

export const config = {
  // Pages and the dashboard's own routes. Machine endpoints (webhooks, Core's plan updates,
  // health) and static files never carry a NEXORA session.
  matcher: [
    "/((?!_next|api/github|api/stripe|api/internal|api/health|schema\\.json|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|txt|xml|webmanifest)).*)",
  ],
};
