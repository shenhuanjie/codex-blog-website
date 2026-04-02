# Neon Stack Blog

Cyberpunk-styled personal technical blog built with `Next.js 16`, `TypeScript`, `Tailwind CSS v4`, and `MDX`.

## Features

- Cyberpunk / glitch visual system
- MDX blog posts with Shiki-based code blocks
- Client-side search with FlexSearch
- Giscus comments
- Upstash page views
- Admin console with `Auth.js + GitHub OAuth`
- `Postgres` content source via `Drizzle`

## Scripts

```bash
npm run dev
npm run build
npm run lint
npm run mcp:blog
npm run db:import
npm run db:seed-admins
```

## Environment Variables

Copy [/.env.example](/Users/shenhuanjie/Documents/Projects/codex/codex-blog-website/.env.example) and fill the values you need.

### Required for the public blog

- `POSTGRES_URL`

If `POSTGRES_URL` is missing, the app falls back to local `content/posts/*.mdx`.

### Required for admin

- `POSTGRES_URL`
- `AUTH_SECRET`
- `AUTH_GITHUB_ID`
- `AUTH_GITHUB_SECRET`
- `ADMIN_GITHUB_LOGINS`

GitHub OAuth callback URLs:

- Production: `https://codex-blog-website.vercel.app/api/auth/callback/github`
- Local: `http://localhost:3000/api/auth/callback/github`

### Required for comments

- `NEXT_PUBLIC_GISCUS_REPO`
- `NEXT_PUBLIC_GISCUS_REPO_ID`
- `NEXT_PUBLIC_GISCUS_CATEGORY`
- `NEXT_PUBLIC_GISCUS_CATEGORY_ID`

### Required for page views

- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

## Neon Setup

1. Create a free Neon project.
2. Copy the `pooled` Postgres connection string.
3. Set it as `POSTGRES_URL` locally and in Vercel.
4. Import the local MDX posts:

```bash
POSTGRES_URL="your-neon-url" npm run db:import
```

## Local MCP Publishing

This repo includes a local MCP server for direct post publishing from local agents or MCP-capable clients.

### What it can do

- `list_posts`
- `search_posts`
- `get_post`
- `create_post`
- `update_post`
- `publish_post`
- `save_draft`
- `unpublish_post`
- `delete_post`
- `preview_markdown_article`
- `save_markdown_draft`
- `publish_markdown_article`
- `list_tags`

### Included MCP prompts

- `draft-technical-post`
- `publish-existing-article`

### Start the server

```bash
npm run mcp:blog
```

The server uses `stdio`, so it is intended for local-only use.

### Auth / token expectations

- Local `stdio` use: no extra token is required
- Remote or HTTP exposure: add your own token/auth layer before exposing it outside your machine

### Requirements

- `POSTGRES_URL` must be set
- The server loads local `.env*` files via `@next/env`, so your existing app env setup can be reused

### Example client config

Use this command in your MCP client:

```bash
npm run mcp:blog
```

Claude Desktop example config:

File: [mcp/claude-desktop.example.json](/Users/shenhuanjie/Documents/Projects/codex/codex-blog-website/mcp/claude-desktop.example.json)

```json
{
  "mcpServers": {
    "neonstack-blog-local": {
      "command": "npm",
      "args": ["run", "mcp:blog"],
      "cwd": "/Users/shenhuanjie/Documents/Projects/codex/codex-blog-website"
    }
  }
}
```

### Recommended agent flow

- Use `search_posts` to avoid duplicate topics or slugs
- Use `preview_markdown_article` to inspect slug, summary, tag suggestions, and warnings before writing anything
- `preview_markdown_article` also returns `duplicateCandidates`, per-item `relevanceScore`, `slugAlternatives`, quality checks, and a top-level `recommendation`
- Use `create_post` when you want a draft-first workflow
- Use `save_markdown_draft` when you already have the full article body but want to keep it unpublished
- Use `publish_markdown_article` when you already have the full article and want a one-shot publish
- Use `save_draft` and `publish_post` to switch states explicitly
- Use `delete_post` only for cleanup or mistaken drafts

## Vercel Deployment

The site is already configured for Vercel. Deploy with:

```bash
npx vercel --prod --yes --archive=tgz
```

The repo includes [/.vercelignore](/Users/shenhuanjie/Documents/Projects/codex/codex-blog-website/.vercelignore) to keep deployment uploads small.

## Admin Launch Checklist

1. Add `POSTGRES_URL` in Vercel.
2. Create a GitHub OAuth app and set the callback URL.
3. Add `AUTH_SECRET`, `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET`, and `ADMIN_GITHUB_LOGINS`.
4. Redeploy the site.
5. Visit `/admin` and sign in with the allowlisted GitHub account.

If you want the database to participate in admin access checks too:

```bash
POSTGRES_URL="your-neon-url" ADMIN_GITHUB_LOGINS="your-github-login" npm run db:seed-admins
```

## Comments And Views Checklist

1. Create a Giscus discussion category and add the four `NEXT_PUBLIC_GISCUS_*` variables.
2. Create an Upstash Redis database and add the two `UPSTASH_REDIS_*` variables.
3. Redeploy the site.
4. Open a post page and verify comments and `PV` both render.
