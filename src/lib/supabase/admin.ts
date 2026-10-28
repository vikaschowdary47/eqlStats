import "server-only";
import { createClient } from "@supabase/supabase-js";
import { publicEnv, serverEnv } from "../env";

// Bypasses Row Level Security. Only for: scheduled checks, reading secrets to
// run a check, resolving public share links, and account deletion.
// Every query made with it must scope by an id the caller is allowed to use.
export function createAdminClient() {
  return createClient(publicEnv.supabaseUrl, serverEnv().serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
