"use server";

import { createClient } from "@supabase/supabase-js";

export type JoinWaitlistResult = {
  ok: boolean;
  message: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function joinWaitlist(
  _prev: JoinWaitlistResult,
  formData: FormData,
): Promise<JoinWaitlistResult> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  if (!EMAIL_RE.test(email)) {
    return { ok: false, message: "Please enter a valid email." };
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    return { ok: false, message: "Server is misconfigured." };
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error } = await supabase
    .from("waitlist")
    .upsert({ email }, { onConflict: "email", ignoreDuplicates: true });

  if (error) {
    return { ok: false, message: "Something went wrong. Try again?" };
  }

  return { ok: true, message: "You're on the list." };
}
