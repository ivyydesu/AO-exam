type SupabaseLike = {
  from: (table: string) => {
    insert: (values: Record<string, unknown>) => unknown;
  };
};

export async function writeSecurityAudit(
  supabaseAdmin: SupabaseLike,
  payload: {
    actor_id: string | null;
    event_type: string;
    resource_type?: string | null;
    resource_id?: string | null;
    result: "success" | "failure";
    detail?: string | null;
    ip?: string | null;
    user_agent?: string | null;
  }
) {
  try {
    const row = {
      actor_id: payload.actor_id,
      event_type: payload.event_type,
      resource_type: payload.resource_type ?? null,
      resource_id: payload.resource_id ?? null,
      result: payload.result,
      detail: payload.detail ?? null,
      ip: payload.ip ?? null,
      user_agent: payload.user_agent ?? null
    };
    await Promise.resolve(supabaseAdmin.from("security_audit_logs").insert(row));
  } catch {
    // 監査テーブル未作成環境では無視（本番では作成必須）
  }
}
