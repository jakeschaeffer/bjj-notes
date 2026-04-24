import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
const admin = createClient(url, key, { auth: { persistSession: false } });

const email = "test@example.com";
const { data: list } = await admin.auth.admin.listUsers({ perPage: 200 });
const user = list.users.find((u) => u.email === email);
if (!user) {
  console.log("no test user");
  process.exit(1);
}

const { data } = await admin
  .from("user_taxonomy")
  .select("data")
  .eq("user_id", user.id)
  .maybeSingle();

const partners = data?.data?.partners ?? [];
const positions = (data?.data?.positions ?? []).map((p) => p.name);
const techniques = (data?.data?.techniques ?? []).map((t) => t.name);
console.log("partners (" + partners.length + "):", partners);
console.log("custom positions (" + positions.length + "):", positions);
console.log("custom techniques (" + techniques.length + "):", techniques);
