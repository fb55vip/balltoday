"use strict";

const ALLOWED_ORIGINS = new Set([
  "https://fb55vip.com",
  "https://www.fb55vip.com"
]);

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = makeCors(request);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    try {
      if (url.pathname === "/" && request.method === "GET") {
        return json({ success: true, service: "HN FOOTBALL SCORE Content API", status: "online" }, 200, cors);
      }

      if (url.pathname === "/api/admin/login" && request.method === "POST") {
        return handleLogin(request, env, cors);
      }

      if (url.pathname === "/api/admin/articles" && request.method === "GET") {
        await requireAdmin(request, env);
        const { results } = await env.DB.prepare(`
          SELECT * FROM articles ORDER BY featured DESC, updated_at DESC, id DESC
        `).all();
        const articles = (results || []).map(normalizeArticle);
        return json({ success: true, articles, stats: calculateStats(articles) }, 200, cors);
      }

      if (url.pathname === "/api/admin/articles" && request.method === "POST") {
        await requireAdmin(request, env);
        const data = await readJson(request);
        validateArticle(data);
        const slug = await createUniqueSlug(env.DB, data.slug || data.title);
        const status = normalizeStatus(data.status);
        const publishedAt = getPublicationTime(status, data.publish_at);
        const result = await env.DB.prepare(`
          INSERT INTO articles (
            title, slug, league, match_name, match_time, confidence,
            cover_image, excerpt, content, author, status, featured,
            created_at, updated_at, published_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), ?)
        `).bind(
          cleanText(data.title), slug, nullableText(data.league), nullableText(data.match_name),
          nullableText(data.match_time), normalizeConfidence(data.confidence),
          nullableText(data.image_url || data.cover_image), nullableText(data.excerpt),
          cleanText(data.content), "บอส สิทธิกร", status, data.featured ? 1 : 0, publishedAt
        ).run();
        return json({ success: true, id: result.meta?.last_row_id, message: "บันทึกบทความเรียบร้อย" }, 201, cors);
      }

      const adminMatch = url.pathname.match(/^\/api\/admin\/articles\/(\d+)$/);
      if (adminMatch) {
        await requireAdmin(request, env);
        const id = Number(adminMatch[1]);
        if (request.method === "PUT") {
          const existing = await env.DB.prepare("SELECT * FROM articles WHERE id = ? LIMIT 1").bind(id).first();
          if (!existing) throw new HttpError(404, "ไม่พบบทความ");
          const data = await readJson(request);
          validateArticle(data);
          const status = normalizeStatus(data.status);
          const publishedAt = getPublicationTime(status, data.publish_at);
          await env.DB.prepare(`
            UPDATE articles SET
              title=?, league=?, match_name=?, match_time=?, confidence=?, cover_image=?,
              excerpt=?, content=?, status=?, featured=?, updated_at=datetime('now'), published_at=?
            WHERE id=?
          `).bind(
            cleanText(data.title), nullableText(data.league), nullableText(data.match_name),
            nullableText(data.match_time), normalizeConfidence(data.confidence),
            nullableText(data.image_url || data.cover_image), nullableText(data.excerpt),
            cleanText(data.content), status, data.featured ? 1 : 0, publishedAt, id
          ).run();
          return json({ success: true, message: "แก้ไขบทความเรียบร้อย" }, 200, cors);
        }
        if (request.method === "DELETE") {
          const result = await env.DB.prepare("DELETE FROM articles WHERE id = ?").bind(id).run();
          if (!result.meta?.changes) throw new HttpError(404, "ไม่พบบทความ");
          return json({ success: true, message: "ลบบทความเรียบร้อย" }, 200, cors);
        }
      }

      if (url.pathname === "/api/articles" && request.method === "GET") {
        const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit")) || 12));
        const now = new Date().toISOString();
        const { results } = await env.DB.prepare(`
          SELECT * FROM articles
          WHERE status = 'published'
             OR (status = 'scheduled' AND published_at IS NOT NULL AND published_at <= ?)
          ORDER BY featured DESC, COALESCE(published_at, created_at) DESC, id DESC
          LIMIT ?
        `).bind(now, limit).all();
        return json({ success: true, articles: (results || []).map(normalizeArticle) }, 200, cors);
      }

      const publicMatch = url.pathname.match(/^\/api\/articles\/([^/]+)$/);
      if (publicMatch && request.method === "GET") {
        const slug = decodeURIComponent(publicMatch[1]);
        const now = new Date().toISOString();
        const article = await env.DB.prepare(`
          SELECT * FROM articles
          WHERE slug = ? AND (
            status = 'published' OR
            (status = 'scheduled' AND published_at IS NOT NULL AND published_at <= ?)
          ) LIMIT 1
        `).bind(slug, now).first();
        if (!article) throw new HttpError(404, "ไม่พบบทความ");
        await env.DB.prepare("UPDATE articles SET views = views + 1 WHERE id = ?").bind(article.id).run();
        return json({ success: true, article: normalizeArticle({ ...article, views: Number(article.views || 0) + 1 }) }, 200, cors);
      }

      return json({ success: false, message: "Endpoint not found" }, 404, cors);
    } catch (error) {
      if (error instanceof HttpError) return json({ success: false, message: error.message }, error.status, cors);
      console.error(error);
      return json({ success: false, message: "เกิดข้อผิดพลาดในระบบ" }, 500, cors);
    }
  }
};

async function handleLogin(request, env, cors) {
  const body = await readJson(request);
  if (!timingSafeEqual(body.username || "", env.ADMIN_USERNAME || "") ||
      !timingSafeEqual(body.password || "", env.ADMIN_PASSWORD || "")) {
    throw new HttpError(401, "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
  }
  return json({ success: true, token: await createToken(env.SESSION_SECRET), expiresIn: 28800 }, 200, cors);
}

async function requireAdmin(request, env) {
  const match = (request.headers.get("Authorization") || "").match(/^Bearer\s+(.+)$/i);
  if (!match || !(await verifyToken(match[1], env.SESSION_SECRET))) {
    throw new HttpError(401, "Session หมดอายุ กรุณาเข้าสู่ระบบใหม่");
  }
}

function normalizeStatus(value) {
  return ["draft", "published", "scheduled"].includes(value) ? value : "draft";
}

function getPublicationTime(status, publishAt) {
  if (status === "draft") return null;
  if (status === "published") return new Date().toISOString();
  const date = new Date(publishAt || "");
  if (Number.isNaN(date.getTime())) throw new HttpError(400, "กรุณาระบุเวลาเผยแพร่ที่ถูกต้อง");
  return date.toISOString();
}

function normalizeArticle(a) {
  const effective = a.status === "scheduled" && a.published_at && new Date(a.published_at) <= new Date()
    ? "published" : a.status;
  return {
    ...a,
    image_url: a.cover_image || "",
    publish_at: a.published_at || null,
    published: effective === "published",
    effective_status: effective,
    featured: Boolean(a.featured),
    confidence: Number(a.confidence || 0),
    views: Number(a.views || 0)
  };
}

function calculateStats(articles) {
  return {
    total: articles.length,
    published: articles.filter(a => a.effective_status === "published").length,
    scheduled: articles.filter(a => a.status === "scheduled" && a.effective_status !== "published").length,
    draft: articles.filter(a => a.status === "draft").length,
    featured: articles.filter(a => a.featured).length
  };
}

function validateArticle(data) {
  if (!cleanText(data.title)) throw new HttpError(400, "กรุณากรอกหัวข้อบทความ");
  if (!cleanText(data.content)) throw new HttpError(400, "กรุณากรอกเนื้อหาบทความ");
  if (String(data.title).length > 160) throw new HttpError(400, "หัวข้อบทความยาวเกินไป");
}

async function createUniqueSlug(db, source) {
  const base = slugify(source) || `article-${Date.now()}`;
  let slug = base;
  for (let n = 2; ; n++) {
    const row = await db.prepare("SELECT id FROM articles WHERE slug = ? LIMIT 1").bind(slug).first();
    if (!row) return slug;
    slug = `${base}-${n}`;
  }
}

function slugify(value) {
  return String(value || "").trim().toLowerCase().normalize("NFKD")
    .replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "").slice(0, 120);
}

async function createToken(secret) {
  if (!secret) throw new Error("SESSION_SECRET is not configured");
  const payload = base64UrlEncode(JSON.stringify({ role: "admin", exp: Math.floor(Date.now()/1000) + 28800 }));
  return `${payload}.${await sign(payload, secret)}`;
}

async function verifyToken(token, secret) {
  if (!token || !secret) return false;
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra) return false;
  if (!timingSafeEqual(signature, await sign(payload, secret))) return false;
  try {
    const data = JSON.parse(base64UrlDecode(payload));
    return data.role === "admin" && Number(data.exp) > Math.floor(Date.now()/1000);
  } catch { return false; }
}

async function sign(value, secret) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name:"HMAC", hash:"SHA-256" }, false, ["sign"]);
  return bytesToBase64Url(new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(value))));
}

async function readJson(request) {
  try { return await request.json(); }
  catch { throw new HttpError(400, "รูปแบบข้อมูลไม่ถูกต้อง"); }
}

function makeCors(request) {
  const origin = request.headers.get("Origin") || "";
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.has(origin) ? origin : "https://fb55vip.com",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin"
  };
}

function json(data, status=200, extra={}) {
  const headers = new Headers(extra);
  headers.set("Content-Type", "application/json; charset=UTF-8");
  headers.set("Cache-Control", "no-store");
  headers.set("X-Content-Type-Options", "nosniff");
  return new Response(JSON.stringify(data), { status, headers });
}

function cleanText(v) { return String(v ?? "").trim(); }
function nullableText(v) { const s=cleanText(v); return s || null; }
function normalizeConfidence(v) { const n=Number(v); return Number.isFinite(n) ? Math.max(0,Math.min(100,Math.round(n))) : 0; }
function timingSafeEqual(a,b) { a=String(a);b=String(b);if(a.length!==b.length)return false;let r=0;for(let i=0;i<a.length;i++)r|=a.charCodeAt(i)^b.charCodeAt(i);return r===0; }
function base64UrlEncode(v) { return bytesToBase64Url(new TextEncoder().encode(v)); }
function base64UrlDecode(v) { const b=v.replace(/-/g,"+").replace(/_/g,"/").padEnd(Math.ceil(v.length/4)*4,"="); return decodeURIComponent([...atob(b)].map(c=>`%${c.charCodeAt(0).toString(16).padStart(2,"0")}`).join("")); }
function bytesToBase64Url(bytes) { let s="";for(const b of bytes)s+=String.fromCharCode(b);return btoa(s).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/g,""); }
class HttpError extends Error { constructor(status,message){super(message);this.status=status;} }
