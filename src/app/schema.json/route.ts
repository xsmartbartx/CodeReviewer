import { configJsonSchema } from "@/lib/config/json-schema";

export const dynamic = "force-static";

export function GET() {
  return Response.json(configJsonSchema(), { headers: { "Cache-Control": "public, max-age=3600" } });
}
