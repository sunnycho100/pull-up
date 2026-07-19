import { createClient } from "@supabase/supabase-js";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const svc = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.argv[2];
const supa = createClient(url, svc, { auth: { autoRefreshToken: false, persistSession: false } });
const { data, error } = await supa.auth.admin.generateLink({ type: "magiclink", email });
if (error) { console.error("ERR", error.message); process.exit(1); }
console.log(`http://localhost:3000/auth/callback?token_hash=${data.properties.hashed_token}&type=magiclink`);
