import fs from "node:fs";
import path from "node:path";

import matter from "gray-matter";
import postgres from "postgres";

const connectionString = process.env.POSTGRES_URL;

if (!connectionString) {
  console.error("Missing POSTGRES_URL");
  process.exit(1);
}

const sql = postgres(connectionString, {
  prepare: false,
  max: 1,
});

const contentDir = path.join(process.cwd(), "content/posts");

function slugify(value) {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-\u4e00-\u9fa5]/g, "");
}

async function ensureTables() {
  await sql`
    create table if not exists posts (
      id serial primary key,
      slug varchar(180) unique not null,
      title text not null,
      summary text not null,
      content text not null,
      cover text,
      status varchar(16) not null default 'draft',
      published_at timestamptz,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
  `;

  await sql`
    create table if not exists tags (
      id serial primary key,
      name varchar(80) unique not null,
      slug varchar(80) unique not null,
      created_at timestamptz not null default now()
    );
  `;

  await sql`
    create table if not exists post_tags (
      post_id integer not null references posts(id) on delete cascade,
      tag_id integer not null references tags(id) on delete cascade,
      primary key(post_id, tag_id)
    );
  `;

  await sql`
    create table if not exists admin_users (
      id serial primary key,
      github_login varchar(120) unique not null,
      created_at timestamptz not null default now()
    );
  `;
}

async function importPosts() {
  const filenames = fs.readdirSync(contentDir).filter((file) => file.endsWith(".mdx"));

  for (const filename of filenames) {
    const slug = filename.replace(/\.mdx$/, "");
    const source = fs.readFileSync(path.join(contentDir, filename), "utf8");
    const { data, content } = matter(source);
    const title = String(data.title ?? slug);
    const summary = String(data.summary ?? "");
    const cover = data.cover ? String(data.cover) : null;
    const date = data.date ? new Date(String(data.date)) : new Date();
    const tagNames = Array.isArray(data.tags)
      ? data.tags.map((tag) => String(tag).trim()).filter(Boolean)
      : [];

    const [post] = await sql`
      insert into posts (slug, title, summary, content, cover, status, published_at, updated_at)
      values (${slug}, ${title}, ${summary}, ${content}, ${cover}, ${"published"}, ${date}, now())
      on conflict (slug) do update set
        title = excluded.title,
        summary = excluded.summary,
        content = excluded.content,
        cover = excluded.cover,
        status = excluded.status,
        published_at = excluded.published_at,
        updated_at = now()
      returning id
    `;

    await sql`delete from post_tags where post_id = ${post.id}`;

    for (const tagName of tagNames) {
      const tagSlug = slugify(tagName);
      const [tag] = await sql`
        insert into tags (name, slug)
        values (${tagName}, ${tagSlug})
        on conflict (slug) do update set name = excluded.name
        returning id
      `;

      await sql`
        insert into post_tags (post_id, tag_id)
        values (${post.id}, ${tag.id})
        on conflict do nothing
      `;
    }
  }
}

await ensureTables();
await importPosts();
await sql.end();

console.log("Imported MDX posts into Postgres.");
