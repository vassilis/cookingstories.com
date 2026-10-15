// Makes an existing user an admin. They need to have signed in at least once.
//
//   node scripts/grant-admin.mjs you@example.com
//
// New users listed in ADMIN_EMAILS become admins automatically on first sign-in.
import postgres from "postgres";

const email = process.argv[2]?.trim().toLowerCase();
if (!email) {
  console.error("Usage: node scripts/grant-admin.mjs <email>");
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL, { max: 1 });
try {
  const rows = await sql`update "user" set role = 'admin' where lower(email) = ${email} returning email`;
  if (rows.length === 0) {
    console.error(`No user with email ${email}. Sign in once first, then run this again.`);
    process.exitCode = 1;
  } else {
    console.log(`${rows[0].email} is now an admin. Sign out and in again if you were already signed in.`);
  }
} finally {
  await sql.end();
}
