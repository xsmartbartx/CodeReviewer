import { NextResponse, type NextRequest } from "next/server";
import { destroySession, SESSION_COOKIE } from "@/lib/auth/session";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  await destroySession(request.cookies.get(SESSION_COOKIE)?.value);
  const response = NextResponse.redirect(new URL("/", env().APP_URL), { status: 303 });
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
