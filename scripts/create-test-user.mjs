import { createClient } from "@supabase/supabase-js";

const url =
  process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const key =
  process.env.SUPABASE_SECRET_KEY ??
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  "";

if (!url || !key) {
  console.error(
    "Missing SUPABASE_URL / SUPABASE_SECRET_KEY. Run with: node --env-file=.env.local scripts/create-test-user.mjs",
  );
  process.exit(1);
}

const email = process.env.TEST_USER_EMAIL ?? "test@example.com";
const password = process.env.TEST_USER_PASSWORD ?? "testpassword123";

const admin = createClient(url, key, { auth: { persistSession: false } });

const { data: list, error: listErr } = await admin.auth.admin.listUsers({
  perPage: 200,
});
if (listErr) {
  console.error("Failed to list users:", listErr.message);
  process.exit(1);
}

const existing = list.users.find(
  (u) => u.email?.toLowerCase() === email.toLowerCase(),
);

if (existing) {
  const { error: updErr } = await admin.auth.admin.updateUserById(existing.id, {
    password,
    email_confirm: true,
  });
  if (updErr) {
    console.error("Failed to update test user:", updErr.message);
    process.exit(1);
  }
  console.log(`Updated existing test user: ${email} (id: ${existing.id})`);
} else {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) {
    console.error("Failed to create test user:", error.message);
    process.exit(1);
  }
  console.log(`Created test user: ${email} (id: ${data.user.id})`);
}

console.log("");
console.log("Log in at http://localhost:3000/login");
console.log(`  Email:    ${email}`);
console.log(`  Password: ${password}`);
