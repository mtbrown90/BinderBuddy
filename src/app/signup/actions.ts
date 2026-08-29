"use server";

import { createClient } from "@/lib/supabase/server";

export async function signup(
  _prevState: { error?: string; success?: boolean } | undefined,
  formData: FormData
) {
  const supabase = await createClient();
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const { error } = await supabase.auth.signUp({ email, password });
  if (error) return { error: error.message };

  return { success: true };
}
