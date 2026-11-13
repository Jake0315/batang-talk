// Batang 푸시 알림 함수
// 1) DB 웹훅(messages INSERT)이 부르면 → 알림 받을 사람을 계산해 웹 푸시 발송
// 2) 앱의 '테스트 알림' 버튼이 부르면 → 본인에게만 테스트 알림
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendPush, type Sub } from "./webpush.ts";

const env = (k: string) => Deno.env.get(k) ?? "";
const admin = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));
const vapid = {
  publicKey: env("VAPID_PUBLIC_KEY"),
  privateKey: env("VAPID_PRIVATE_KEY"),
  subject: env("VAPID_SUBJECT") || "mailto:admin@example.com",
};
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (o: unknown, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { ...cors, "Content-Type": "application/json" } });

async function deliver(memberIds: string[], data: Record<string, unknown>) {
  if (!memberIds.length) return 0;
  const { data: subs } = await admin.from("push_subscriptions")
    .select("id,endpoint,p256dh,auth").in("member_id", memberIds);
  let sent = 0;
  await Promise.allSettled((subs ?? []).map(async (s: Sub & { id: string }) => {
    const status = await sendPush(s, data, vapid);
    if (status === 404 || status === 410) await admin.from("push_subscriptions").delete().eq("id", s.id);
    else if (status >= 200 && status < 300) sent++;
    else console.error("push failed", status, s.endpoint.slice(0, 60));
  }));
  return sent;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const body = await req.json();

    // --- 테스트 알림: 로그인한 본인에게만 ---
    if (body?.test) {
      const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer /, "");
      const { data: { user } } = await admin.auth.getUser(token);
      if (!user) return json({ error: "unauthorized" }, 401);
      const sent = await deliver([user.id], { title: "Batang", body: "알림이 켜졌어요 🎉", url: "#/", tag: "test" });
      return json({ sent });
    }

    // --- DB 웹훅 ---
    const secret = env("WEBHOOK_SECRET");
    if (!secret || req.headers.get("x-webhook-secret") !== secret) return json({ error: "forbidden" }, 403);
    if (body?.type !== "INSERT" || body?.table !== "messages") return json({ skip: true });
    const m = body.record;

    const [{ data: ch }, { data: sender }, { data: files }, { data: cms }] = await Promise.all([
      admin.from("channels").select("name").eq("id", m.channel_id).single(),
      admin.from("members").select("name").eq("id", m.sender_id).single(),
      admin.from("attachments").select("name").eq("message_id", m.id),
      admin.from("channel_members").select("member_id,notify").eq("channel_id", m.channel_id),
    ]);
    const inChannel = new Map<string, string>((cms ?? []).map((c) => [c.member_id, c.notify]));
    const mentioned = new Set<string>(m.mention_ids ?? []);
    const targets = new Map<string, boolean>(); // 회원 → 멘션 여부

    if (!m.parent_id || m.also_to_channel) {
      for (const [id, notify] of inChannel) {
        const isMention = m.mention_all || mentioned.has(id);
        if (notify === "all" || isMention) targets.set(id, isMention);
      }
    }
    if (m.parent_id) {
      const { data: tr } = await admin.from("thread_reads")
        .select("member_id").eq("root_id", m.parent_id).eq("following", true);
      for (const r of tr ?? []) {
        if (inChannel.has(r.member_id)) targets.set(r.member_id, targets.get(r.member_id) || mentioned.has(r.member_id));
      }
      for (const id of mentioned) if (inChannel.has(id)) targets.set(id, true);
    }
    targets.delete(m.sender_id);
    if (!targets.size) return json({ sent: 0 });

    // 명단에서 빠진 사람 제외 + 방해 금지(한국 시간 0~8시, 멘션은 통과)
    const [{ data: people }, { data: allow }] = await Promise.all([
      admin.from("members").select("id,email,quiet").in("id", [...targets.keys()]),
      admin.from("allowlist").select("email"),
    ]);
    const allowed = new Set((allow ?? []).map((a) => a.email));
    const quietNow = (new Date().getUTCHours() + 9) % 24 < 8;
    const ids = (people ?? [])
      .filter((p) => allowed.has(p.email) && !(quietNow && p.quiet && !targets.get(p.id)))
      .map((p) => p.id);

    const text = (m.body ?? "").trim() || (files?.length ? "📎 " + files.map((f) => f.name).join(", ") : "새 메시지");
    const sent = await deliver(ids, {
      title: `${ch?.name ? "#" + ch.name : "Batang"}${m.parent_id ? " 스레드" : ""} · ${sender?.name ?? ""}`,
      body: text.length > 120 ? text.slice(0, 120) + "…" : text,
      url: `#/c/${m.channel_id}` + (m.parent_id ? `/t/${m.parent_id}` : ""),
      tag: m.parent_id ?? m.channel_id,
    });
    return json({ sent });
  } catch (e) {
    console.error(e);
    return json({ error: String(e) }, 500);
  }
});
