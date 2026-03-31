import type { SupabaseClient } from "@supabase/supabase-js";

export const DEFAULT_PLATFORM_FEE_PERCENT = 30;

type PlatformSettingRow = {
  key: string;
  value: string | null;
  updated_at?: string;
};

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return DEFAULT_PLATFORM_FEE_PERCENT;
  return Math.max(0, Math.min(95, Math.floor(value)));
}

export async function getPlatformFeePercent(supabaseAdmin: SupabaseClient) {
  try {
    const { data } = await supabaseAdmin
      .from("platform_settings")
      .select("key, value")
      .eq("key", "platform_fee_percent")
      .maybeSingle();

    const row = data as PlatformSettingRow | null;
    if (row?.value != null) {
      const parsed = Number(row.value);
      if (Number.isFinite(parsed)) return clampPercent(parsed);
    }
  } catch {
    // Fallback to env/default when table is missing or inaccessible.
  }

  return clampPercent(Number(process.env.PLATFORM_FEE_PERCENT ?? DEFAULT_PLATFORM_FEE_PERCENT));
}

