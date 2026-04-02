import { getAllPosts } from "@/lib/content";
import { siteConfig } from "@/lib/site";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const posts = await getAllPosts();

  const items = posts
    .map((post) => {
      const link = `${siteConfig.url}/blog/${post.slug}`;

      return `\n      <item>\n        <title>${escapeXml(post.title)}</title>\n        <link>${link}</link>\n        <guid>${link}</guid>\n        <pubDate>${new Date(post.date).toUTCString()}</pubDate>\n        <description>${escapeXml(post.summary)}</description>\n      </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8" ?>\n<rss version="2.0">\n  <channel>\n    <title>${escapeXml(siteConfig.name)}</title>\n    <link>${siteConfig.url}</link>\n    <description>${escapeXml(siteConfig.description)}</description>\n    ${items}\n  </channel>\n</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
