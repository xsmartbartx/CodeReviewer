import type { MetadataRoute } from "next";
import { operator } from "@/lib/site";

export const dynamic = "force-dynamic";

export default function sitemap(): MetadataRoute.Sitemap {
  const { appUrl } = operator();
  return ["", "/pricing", "/docs", "/terms", "/privacy"].map((path) => ({
    url: `${appUrl}${path}`,
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1 : 0.6,
  }));
}
