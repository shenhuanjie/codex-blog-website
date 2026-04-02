const resolvedSiteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "https://example.com");

export const siteConfig = {
  name: "霓虹栈 · 个人技术博客",
  description:
    "记录前端工程、系统设计和开发思考的个人技术博客，风格来自赛博朋克终端美学。",
  url: resolvedSiteUrl,
  author: "Shen Huanjie",
  email: "hello@example.com",
};
