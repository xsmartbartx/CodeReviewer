import type { MetadataRoute } from "next";
import { operator } from "@/lib/site";

export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  const { appUrl } = operator();
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/dashboard", "/api/"] },
    sitemap: `${appUrl}/sitemap.xml`,
  };
}
