import { env } from "@/lib/env";

/** Reject cross-site form posts to state-changing route handlers. */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return request.headers.get("sec-fetch-site") !== "cross-site";
  return origin === new URL(env().APP_URL).origin;
}

export function redirectTo(path: string, status = 303): Response {
  return Response.redirect(new URL(path, env().APP_URL), status);
}
