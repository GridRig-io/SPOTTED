// A small stand-in for Supabase for local checks: real Postgres (PGlite) running the real migrations + demo data,
// behind just enough of the Supabase REST and auth URLs for the website and app to work.
// Sign in with any phone or email, and the code 123456.   Run: node supabase/test/mock-supabase.mjs [port]
import { PGlite } from "@electric-sql/pglite";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";
import { readFileSync, readdirSync } from "node:fs";
import { createServer } from "node:http";
import { createHash } from "node:crypto";

const port = Number(process.argv[2] ?? 54321);
const dir = new URL("../migrations/", import.meta.url);
const db = await new PGlite({ extensions: { btree_gist } });
await db.exec(`
  create schema auth;
  create table auth.users (id uuid primary key default gen_random_uuid(), instance_id uuid, aud text, role text, email text, phone text, raw_user_meta_data jsonb default '{}'::jsonb, created_at timestamptz, updated_at timestamptz);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
  grant usage on schema public, auth to anon, authenticated, service_role;
`);
for (const f of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) await db.exec(readFileSync(new URL(f, dir), "utf8"));
await db.exec(readFileSync(new URL("../seed/demo.sql", import.meta.url), "utf8"));
console.log("mock supabase ready on", port);

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const uuidFor = (s) => { const h = createHash("md5").update(s).digest("hex"); return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`; };
const mkToken = (u) => `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: u.id, role: "authenticated", aud: "authenticated", email: u.email, phone: u.phone, exp: Math.floor(Date.now() / 1000) + 86400 })}.sig`;
const userOf = (req) => {
  const t = (req.headers.authorization ?? "").replace("Bearer ", "");
  if (t === "SERVICE") return { role: "service_role" };
  try { const p = JSON.parse(Buffer.from(t.split(".")[1], "base64url").toString()); if (p.sub) return { role: "authenticated", sub: p.sub, email: p.email, phone: p.phone }; } catch {}
  return { role: "anon" };
};
// PostgREST returns numeric columns as JSON numbers; PGlite gives strings.
const fix = (r) => { const dt = r.fields.filter((f) => f.dataTypeID === 1082).map((f) => f.name); if (dt.length) for (const row of r.rows) for (const n of dt) if (row[n] instanceof Date) row[n] = new Date(row[n].getTime() - row[n].getTimezoneOffset() * 60000).toISOString().slice(0, 10); const num = r.fields.filter((f) => f.dataTypeID === 1700).map((f) => f.name); if (num.length) for (const row of r.rows) for (const n of num) if (row[n] !== null) row[n] = Number(row[n]); return r; };
const qid = (s) => { if (!/^[a-z_][a-z0-9_]*$/.test(s)) throw new Error("bad identifier " + s); return s; };

async function asRole(who, fn) {
  await db.exec(`set role ${who.role}; select set_config('request.jwt.claim.sub', '${who.sub ?? ""}', false);`);
  try { return await fn(); } finally { await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false);`); }
}

function filters(url) {
  const where = [], params = [];
  for (const [k, v] of url.searchParams) {
    if (["select", "order", "limit", "offset", "on_conflict", "columns"].includes(k)) continue;
    const m = /^(eq|in|neq|gt|gte|lt|lte|is)\.(.*)$/.exec(v); if (!m) continue;
    const col = qid(k.includes(".") ? k.split(".").pop() : k);
    if (m[1] === "in") { const vals = m[2].replace(/^\(|\)$/g, "").split(",").map((x) => x.replace(/^"|"$/g, "")); params.push(vals); where.push(`${col}::text = any($${params.length}::text[])`); }
    else if (m[1] === "is") where.push(`${col} is ${m[2] === "null" ? "null" : m[2]}`);
    else { params.push(m[2]); const op = { eq: "=", neq: "<>", gt: ">", gte: ">=", lt: "<", lte: "<=" }[m[1]]; where.push(`${col}::text ${op} $${params.length}`); }
  }
  return { where: where.length ? " where " + where.join(" and ") : "", params };
}

const EMBEDS = {
  properties: (sel) => sel.includes("area:areas") ? { join: " left join lateral (select jsonb_build_object('name', a.name, 'slug', a.slug) as area from areas a where a.id = t.area_id) ar on true", extra: ", ar.area" } : null,
  bookings: (sel) => sel.includes("room:rooms") ? { join: ` left join lateral (select jsonb_build_object('name', r.name, 'kind', r.kind) as room from rooms r where r.id = t.room_id) rr on true
      left join lateral (select jsonb_build_object('name', p.name, 'slug', p.slug, 'area_hint', p.area_hint, 'check_in_from', p.check_in_from, 'check_out_by', p.check_out_by, 'area', (select jsonb_build_object('name', a.name) from areas a where a.id = p.area_id)) as property from properties p where p.id = t.property_id) pp on true`, extra: ", rr.room, pp.property" } : null,
};

createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  const send = (code, body, extra = {}) => { res.writeHead(code, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "*", ...extra }); res.end(body === undefined ? "" : JSON.stringify(body)); };
  if (req.method === "OPTIONS") return send(204);
  let raw = ""; for await (const c of req) raw += c;
  const body = raw ? JSON.parse(raw) : {};
  const who = userOf(req);
  try {
    // ───── auth ─────
    if (url.pathname === "/auth/v1/otp") return send(200, {});
    if (url.pathname === "/auth/v1/verify") {
      if (body.token !== "123456") return send(400, { code: 400, error_code: "otp_expired", msg: "Token has expired or is invalid" });
      const key = body.email ?? body.phone; const id = uuidFor(key);
      await db.query(`insert into auth.users (id, aud, role, email, phone, raw_user_meta_data) values ($1,'authenticated','authenticated',$2,$3,'{}') on conflict (id) do nothing`, [id, body.email ?? null, body.phone ?? null]);
      const u = { id, aud: "authenticated", role: "authenticated", email: body.email ?? "", phone: body.phone ?? "", app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() };
      const tok = mkToken(u);
      return send(200, { access_token: tok, refresh_token: tok, token_type: "bearer", expires_in: 86400, expires_at: Math.floor(Date.now() / 1000) + 86400, user: u });
    }
    if (url.pathname === "/auth/v1/user") {
      if (who.role !== "authenticated") return send(401, { msg: "invalid" });
      return send(200, { id: who.sub, aud: "authenticated", role: "authenticated", email: who.email ?? "", phone: who.phone ?? "", app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() });
    }
    if (url.pathname === "/auth/v1/token") { const t = (req.headers.authorization ?? "").replace("Bearer ", ""); return send(200, { access_token: t, refresh_token: t, token_type: "bearer", expires_in: 86400 }); }
    if (url.pathname === "/auth/v1/logout") return send(204);

    // ───── rpc ─────
    let m = /^\/rest\/v1\/rpc\/([a-z_]+)$/.exec(url.pathname);
    if (m) {
      const fn = qid(m[1]); const keys = Object.keys(body);
      const sql = `select * from ${fn}(${keys.map((k, i) => `${qid(k)} => $${i + 1}`).join(", ")})`;
      const r = fix(await asRole(who, () => db.query(sql, keys.map((k) => body[k]))));
      const cols = r.fields.map((f) => f.name);
      if (cols.length === 1 && cols[0] === fn) return send(200, r.rows[0]?.[fn] ?? null);
      // functions returning a single composite row (create_booking) come back as columns
      const single = ["create_booking", "cancel_booking", "start_payment", "confirm_payment"].includes(fn);
      return send(200, single ? r.rows[0] : r.rows);
    }
    // ───── tables ─────
    m = /^\/rest\/v1\/([a-z_]+)$/.exec(url.pathname);
    if (m) {
      const t = qid(m[1]);
      if (req.method === "GET") {
        const sel = url.searchParams.get("select") ?? "*";
        const emb = EMBEDS[t]?.(sel);
        const { where, params } = filters(url);
        let order = ""; const o = url.searchParams.get("order");
        if (o) order = " order by " + o.split(",").map((p) => { const [c, d] = p.split("."); return `t.${qid(c)} ${d === "desc" ? "desc" : "asc"}`; }).join(", ");
        const lim = url.searchParams.get("limit") ? ` limit ${Number(url.searchParams.get("limit"))}` : "";
        const sql = `select t.*${emb?.extra ?? ""} from ${t} t${emb?.join ?? ""}${where.replace(/\b([a-z_]+)(::text)/g, "t.$1$2").replace(/ where ([a-z_]+) is/, " where t.$1 is")}${order}${lim}`;
        const r = fix(await asRole(who, () => db.query(sql, params)));
        if ((req.headers.accept ?? "").includes("vnd.pgrst.object")) return r.rows.length === 1 ? send(200, r.rows[0]) : send(406, { code: "PGRST116", message: "JSON object requested, multiple (or no) rows returned" });
        return send(200, r.rows);
      }
      if (req.method === "POST") {
        const rows = Array.isArray(body) ? body : [body];
        const cols = Object.keys(rows[0]).map(qid);
        const conflict = url.searchParams.get("on_conflict");
        for (const row of rows) await asRole(who, () => db.query(`insert into ${t} (${cols.join(",")}) values (${cols.map((_, i) => `$${i + 1}`).join(",")})${conflict ? ` on conflict (${conflict}) do nothing` : ""}`, cols.map((c) => row[c])));
        return send(201);
      }
      if (req.method === "DELETE" || req.method === "PATCH") {
        const { where, params } = filters(url);
        if (req.method === "DELETE") await asRole(who, () => db.query(`delete from ${t}${where}`, params));
        else { const cols = Object.keys(body).map(qid); await asRole(who, () => db.query(`update ${t} set ${cols.map((c, i) => `${c} = $${i + 1}`).join(", ")}${where.replace(/\$(\d+)/g, (_, n) => `$${Number(n) + cols.length}`)}`, [...cols.map((c) => body[c]), ...params])); }
        return send(204);
      }
    }
    send(404, { message: "not mocked: " + url.pathname });
  } catch (e) {
    send(400, { code: e.code ?? "P0001", message: e.message, details: null, hint: null });
  }
}).listen(port);
