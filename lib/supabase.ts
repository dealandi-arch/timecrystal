import { createClient, SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

export function isBackendConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

// Server-only client using the service role key. Never import this file from
// client components -- it must stay inside app/api route handlers.
export function getSupabase(): SupabaseClient {
  if (!isBackendConfigured()) {
    throw new Error('Backend not configured: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  }
  if (!client) {
    client = createClient(process.env.SUPABASE_URL as string, process.env.SUPABASE_SERVICE_ROLE_KEY as string, {
      auth: { persistSession: false }
    });
  }
  return client;
}
