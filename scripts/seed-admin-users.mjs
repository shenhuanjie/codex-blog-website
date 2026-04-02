import postgres from "postgres";

const connectionString = process.env.POSTGRES_URL;
const adminLogins = (process.env.ADMIN_GITHUB_LOGINS ?? "")
  .split(",")
  .map((item) => item.trim().toLowerCase())
  .filter(Boolean);

if (!connectionString) {
  console.error("Missing POSTGRES_URL");
  process.exit(1);
}

if (adminLogins.length === 0) {
  console.error("Missing ADMIN_GITHUB_LOGINS");
  process.exit(1);
}

const sql = postgres(connectionString, {
  prepare: false,
  max: 1,
});

await sql`
  create table if not exists admin_users (
    id serial primary key,
    github_login varchar(120) unique not null,
    created_at timestamptz not null default now()
  );
`;

for (const githubLogin of adminLogins) {
  await sql`
    insert into admin_users (github_login)
    values (${githubLogin})
    on conflict (github_login) do nothing
  `;
}

await sql.end();

console.log(`Seeded ${adminLogins.length} admin login(s).`);
