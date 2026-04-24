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

const { data: sessionRows } = await admin
  .from("sessions")
  .select("id, date, payload")
  .eq("user_id", user.id)
  .order("date", { ascending: false });

const { data: taxRow } = await admin
  .from("user_taxonomy")
  .select("data")
  .eq("user_id", user.id)
  .maybeSingle();

const taxTechs = (taxRow?.data?.techniques ?? []).map((t) => ({
  id: t.id,
  name: t.name,
}));
const taxPoss = (taxRow?.data?.positions ?? []).map((p) => ({
  id: p.id,
  name: p.name,
}));

console.log("=== Custom taxonomy entries ===");
console.log("positions:", taxPoss);
console.log("techniques:", taxTechs);
console.log();

console.log("=== Session technique ids referenced ===");
const techIdsInSessions = new Set();
for (const s of sessionRows ?? []) {
  for (const t of s.payload?.techniques ?? []) {
    techIdsInSessions.add(t.techniqueId);
  }
}
for (const id of techIdsInSessions) {
  if (id.startsWith("custom:")) {
    const inTax = taxTechs.find((t) => t.id === id);
    console.log(`  ${id} -- ${inTax ? `FOUND in user_taxonomy (${inTax.name})` : "MISSING from user_taxonomy"}`);
  }
}
