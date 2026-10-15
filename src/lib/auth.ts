import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { admin, magicLink } from "better-auth/plugins";
import { db, schema } from "@/db";
import { sendEmail } from "@/lib/email/brevo";
import { magicLinkEmail } from "@/lib/email/magic-link";

/** Emails that become admins when they first sign in (comma separated in ADMIN_EMAILS). */
const adminEmails = () =>
  (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

function createAuth() {
  const google =
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          },
        }
      : undefined;

  return betterAuth({
    database: drizzleAdapter(db(), { provider: "pg", schema }),
    socialProviders: google,
    databaseHooks: {
      user: {
        create: {
          before: async (user) => ({
            data: { ...user, role: adminEmails().includes(user.email.toLowerCase()) ? "admin" : "user" },
          }),
        },
      },
    },
    plugins: [
      magicLink({
        expiresIn: 60 * 10,
        sendMagicLink: async ({ email, url }) => {
          // EMAIL_DELIVERY=log (end-to-end tests) or a dev machine without a real Brevo key:
          // print the link instead of sending it. Never set EMAIL_DELIVERY in production.
          const dev = process.env.NODE_ENV === "development";
          const logOnly =
            process.env.EMAIL_DELIVERY === "log" || (dev && !process.env.BREVO_API_KEY?.startsWith("xkeysib-"));
          if (dev || logOnly) console.log(`\n  Magic link for ${email}:\n  ${url}\n`);
          if (logOnly) return;
          await sendEmail({ to: email, ...magicLinkEmail(url) });
        },
      }),
      // Roles: "user" by default, "admin" can review public stories.
      admin(),
      // Must be last: lets server actions set auth cookies.
      nextCookies(),
    ],
  });
}

type Auth = ReturnType<typeof createAuth>;
// A module variable rather than globalThis, so edits to this file take effect on hot reload.
// (The database pool is the part worth keeping across reloads, and src/db does that.)
let instance: Auth | undefined;

/** Created on first use so that importing this module never needs env vars or a database. */
export function auth(): Auth {
  instance ??= createAuth();
  return instance;
}
