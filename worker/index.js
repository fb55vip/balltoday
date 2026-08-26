"use strict";

const ALLOWED_ORIGINS = new Set([
  "https://www.fb55vip.com",
  "https://fb55vip.com",
  "https://balltoday.pages.dev"
]);

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = makeCors(request);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    try {
      if (url.pathname.startsWith("/media/") && request.method === "GET") {
        return serveMedia(request, env, cors);
      }
      if ((url.pathname === "/" || url.pathname === "/api/health") && request.method === "GET") {
        const bindings = {
          database: Boolean(env.DB),
          media: Boolean(env.MEDIA),
          session: Boolean(env.SESSION_SECRET)
        };
        return json({
          success: true,
          service: "HN FOOTBALL SCORE Content API",
          status: Object.values(bindings).every(Boolean) ? "ready" : "configuration-required",
          version: "v20-complete",
          bindings
        }, 200, cors);
      }

      if (url.pathname === "/api/admin/login" && request.method === "POST") {
        return handleLogin(request, env, cors);
      }

      if (url.pathname === "/api/admin/me" && request.method === "GET") {
        const session = await requireAdmin(request, env);
        return json({ success:true, user:publicUser(session) }, 200, cors);
      }

      if (url.pathname === "/api/admin/me" && request.method === "PUT") {
        const session = await requireAdmin(request, env);
        const data = await readJson(request);
        const username = normalizeUsername(data.username);
        const displayName = cleanText(data.display_name);
        if (!username || !displayName) throw new HttpError(400, "กรุณากรอกชื่อผู้ใช้และชื่อที่แสดง");
        const wiki = normalizeWikimedia(data.wikimedia_username, data.wikimedia_url);
        const profile = normalizeProfile(data);
        const fields = [username, displayName, profile.bio, profile.avatar_url, wiki.username, wiki.url, profile.facebook_url, profile.tiktok_url, profile.youtube_url, profile.x_url];
        let sql = "UPDATE admin_users SET username=?, display_name=?, bio=?, avatar_url=?, wikimedia_username=?, wikimedia_url=?, facebook_url=?, tiktok_url=?, youtube_url=?, x_url=?, updated_at=datetime('now')";
        if (cleanText(data.password)) {
          validatePassword(data.password);
          const password = await hashPassword(data.password);
          sql += ", password_hash=?, password_salt=?";
          fields.push(password.hash, password.salt);
        }
        sql += " WHERE id=?"; fields.push(session.id);
        try { await env.DB.prepare(sql).bind(...fields).run(); }
        catch (error) { if (/unique/i.test(String(error))) throw new HttpError(409,"ชื่อผู้ใช้นี้มีอยู่แล้ว");throw error; }
        const user = await env.DB.prepare("SELECT * FROM admin_users WHERE id=?").bind(session.id).first();
        await writeAudit(env.DB, session, "update_profile", "user", session.id, displayName);
        return json({ success:true, user:publicUser(user), message:"บันทึกโปรไฟล์เรียบร้อย" }, 200, cors);
      }

      if (url.pathname === "/api/admin/users" && request.method === "GET") {
        const session = await requireOwner(request, env);
        const { results } = await env.DB.prepare("SELECT * FROM admin_users ORDER BY id").all();
        return json({ success:true, users:(results||[]).map(publicUser), current_user_id:session.id }, 200, cors);
      }

      if (url.pathname === "/api/admin/users" && request.method === "POST") {
        await requireOwner(request, env);
        const data = await readJson(request);
        const username = normalizeUsername(data.username);
        const displayName = cleanText(data.display_name);
        validatePassword(data.password);
        if (!username || !displayName) throw new HttpError(400, "กรุณากรอกชื่อผู้ใช้และชื่อที่แสดง");
        const password = await hashPassword(data.password);
        try {
          const result = await env.DB.prepare("INSERT INTO admin_users(username,display_name,password_hash,password_salt,role,active,created_at,updated_at) VALUES(?,?,?,?,?,1,datetime('now'),datetime('now'))")
            .bind(username, displayName, password.hash, password.salt, normalizeRole(data.role)).run();
          await writeAudit(env.DB, await requireOwner(request, env), "create_user", "user", result.meta?.last_row_id, username);
          return json({ success:true, id:result.meta?.last_row_id, message:"สร้างบัญชีเรียบร้อย" }, 201, cors);
        } catch (error) {
          if (/unique/i.test(String(error))) throw new HttpError(409, "ชื่อผู้ใช้นี้มีอยู่แล้ว");
          throw error;
        }
      }

      const userMatch = url.pathname.match(/^\/api\/admin\/users\/(\d+)$/);
      if (userMatch && request.method === "PUT") {
        const session = await requireOwner(request, env);
        const id = Number(userMatch[1]);
        const target = await env.DB.prepare("SELECT * FROM admin_users WHERE id=?").bind(id).first();
        if (!target) throw new HttpError(404, "ไม่พบบัญชีผู้ใช้");
        const data = await readJson(request);
        if (target.role === "owner" && ((data.role!==undefined && normalizeRole(data.role)!=="owner") || data.active===false)) {
          const owners = await env.DB.prepare("SELECT COUNT(*) AS total FROM admin_users WHERE role='owner' AND active=1").first();
          if (Number(owners?.total||0)<=1) throw new HttpError(400,"ต้องมีผู้ดูแลหลักที่เปิดใช้งานอย่างน้อย 1 บัญชี");
        }
        const fields = [], values = [];
        if (data.display_name !== undefined) { const v=cleanText(data.display_name);if(!v)throw new HttpError(400,"ชื่อที่แสดงห้ามว่าง");fields.push("display_name=?");values.push(v); }
        if (data.role !== undefined) { fields.push("role=?");values.push(normalizeRole(data.role)); }
        if (data.active !== undefined) {
          if (id===session.id && !data.active) throw new HttpError(400,"ปิดบัญชีที่กำลังใช้งานไม่ได้");
          fields.push("active=?");values.push(data.active?1:0);
        }
        if (cleanText(data.password)) { validatePassword(data.password);const password=await hashPassword(data.password);fields.push("password_hash=?","password_salt=?");values.push(password.hash,password.salt); }
        if (!fields.length) throw new HttpError(400, "ไม่มีข้อมูลที่ต้องแก้ไข");
        fields.push("updated_at=datetime('now')");values.push(id);
        await env.DB.prepare(`UPDATE admin_users SET ${fields.join(",")} WHERE id=?`).bind(...values).run();
        await writeAudit(env.DB, session, "update_user", "user", id, target.username);
        return json({ success:true, message:"แก้ไขบัญชีเรียบร้อย" }, 200, cors);
      }

      if (userMatch && request.method === "DELETE") {
        const session = await requireOwner(request, env);
        const id = Number(userMatch[1]);
        if (id === Number(session.id)) throw new HttpError(400, "ลบบัญชีที่กำลังใช้งานไม่ได้");
        const target = await env.DB.prepare("SELECT * FROM admin_users WHERE id=?").bind(id).first();
        if (!target) throw new HttpError(404, "ไม่พบบัญชีผู้ใช้");
        if (target.role === "owner" && target.active) {
          const owners = await env.DB.prepare("SELECT COUNT(*) AS total FROM admin_users WHERE role='owner' AND active=1").first();
          if (Number(owners?.total || 0) <= 1) throw new HttpError(400, "ลบผู้ดูแลหลักที่เปิดใช้งานคนสุดท้ายไม่ได้");
        }
        await env.DB.prepare("UPDATE articles SET author_user_id=NULL WHERE author_user_id=?").bind(id).run();
        await env.DB.prepare("DELETE FROM admin_users WHERE id=?").bind(id).run();
        await writeAudit(env.DB, session, "delete_user", "user", id, target.username);
        return json({ success:true, message:"ลบบัญชีเรียบร้อย โดยบทความเดิมยังคงอยู่" }, 200, cors);
      }

      if (url.pathname === "/api/admin/upload" && request.method === "POST") {
        const session = await requireAdmin(request, env);
        return handleUpload(request, env, cors, session);
      }

      if (url.pathname === "/api/social-links" && request.method === "GET") {
        await ensureSocialLinks(env.DB);
        const { results } = await env.DB.prepare("SELECT * FROM site_social_links WHERE active=1 ORDER BY sort_order,id").all();
        return json({success:true,links:(results||[]).map(normalizeSocialLink)},200,cors);
      }

      if (url.pathname === "/api/admin/social-links" && request.method === "GET") {
        await requireOwner(request,env);await ensureSocialLinks(env.DB);
        const {results}=await env.DB.prepare("SELECT * FROM site_social_links ORDER BY sort_order,id").all();
        return json({success:true,links:(results||[]).map(normalizeSocialLink)},200,cors);
      }

      if (url.pathname === "/api/admin/social-links" && request.method === "POST") {
        const session=await requireOwner(request,env);await ensureSocialLinks(env.DB);const data=validateSocialLink(await readJson(request));
        const result=await env.DB.prepare("INSERT INTO site_social_links(platform,label,url,active,show_footer,show_article,sort_order,created_at,updated_at) VALUES(?,?,?,?,?,?,?,datetime('now'),datetime('now'))").bind(data.platform,data.label,data.url,data.active?1:0,data.show_footer?1:0,data.show_article?1:0,data.sort_order).run();
        await writeAudit(env.DB,session,"create_social_link","social_link",result.meta?.last_row_id,data.platform);
        return json({success:true,id:result.meta?.last_row_id,message:"บันทึกลิงก์เรียบร้อย"},201,cors);
      }

      const socialMatch=url.pathname.match(/^\/api\/admin\/social-links\/(\d+)$/);
      if(socialMatch){
        const session=await requireOwner(request,env);await ensureSocialLinks(env.DB);const id=Number(socialMatch[1]);
        if(request.method==="PUT"){const data=validateSocialLink(await readJson(request));const result=await env.DB.prepare("UPDATE site_social_links SET platform=?,label=?,url=?,active=?,show_footer=?,show_article=?,sort_order=?,updated_at=datetime('now') WHERE id=?").bind(data.platform,data.label,data.url,data.active?1:0,data.show_footer?1:0,data.show_article?1:0,data.sort_order,id).run();if(!result.meta?.changes)throw new HttpError(404,"ไม่พบลิงก์");await writeAudit(env.DB,session,"update_social_link","social_link",id,data.platform);return json({success:true,message:"แก้ไขลิงก์เรียบร้อย"},200,cors)}
        if(request.method==="DELETE"){const result=await env.DB.prepare("DELETE FROM site_social_links WHERE id=?").bind(id).run();if(!result.meta?.changes)throw new HttpError(404,"ไม่พบลิงก์");await writeAudit(env.DB,session,"delete_social_link","social_link",id,"");return json({success:true,message:"ลบลิงก์เรียบร้อย"},200,cors)}
      }

      if(url.pathname==="/api/admin/audit"&&request.method==="GET"){
        await requireOwner(request,env);await ensureAuditLog(env.DB);const limit=Math.min(200,Math.max(1,Number(url.searchParams.get("limit"))||100));
        const {results}=await env.DB.prepare("SELECT a.*,u.username,u.display_name FROM admin_audit_log a LEFT JOIN admin_users u ON u.id=a.user_id ORDER BY a.id DESC LIMIT ?").bind(limit).all();
        return json({success:true,items:results||[]},200,cors);
      }

      const authorMatch=url.pathname.match(/^\/api\/authors\/([^/]+)$/);
      if(authorMatch&&request.method==="GET"){
        await ensureAdminUsers(env.DB);await ensureContentColumns(env.DB);const username=decodeURIComponent(authorMatch[1]);
        const user=await env.DB.prepare("SELECT * FROM admin_users WHERE username=? COLLATE NOCASE AND active=1 LIMIT 1").bind(username).first();if(!user)throw new HttpError(404,"ไม่พบผู้เขียน");
        const now=new Date().toISOString();const {results}=await env.DB.prepare("SELECT * FROM articles WHERE author_user_id=? AND (status='published' OR (status='scheduled' AND published_at<=?)) ORDER BY COALESCE(published_at,created_at) DESC LIMIT 100").bind(user.id,now).all();
        return json({success:true,author:publicUser(user),articles:(results||[]).map(normalizeArticle)},200,cors);
      }

      if (url.pathname === "/api/admin/articles" && request.method === "GET") {
        await ensureContentColumns(env.DB);
        const session = await requireAdmin(request, env);
        const query = session.role === "owner"
          ? env.DB.prepare("SELECT * FROM articles ORDER BY featured DESC, updated_at DESC, id DESC")
          : env.DB.prepare("SELECT * FROM articles WHERE author_user_id=? ORDER BY featured DESC, updated_at DESC, id DESC").bind(session.id);
        const { results } = await query.all();
        const articles = (results || []).map(normalizeArticle);
        return json({ success: true, articles, stats: calculateStats(articles) }, 200, cors);
      }

      if (url.pathname === "/api/admin/articles" && request.method === "POST") {
        await ensureContentColumns(env.DB);
        const session = await requireAdmin(request, env);
        const data = await readJson(request);
        validateArticle(data);
        const slug = await createUniqueSlug(env.DB, data.slug || data.title);
        const status = normalizeStatus(data.status);
        const publishedAt = getPublicationTime(status, data.publish_at);
        const result = await env.DB.prepare(`
          INSERT INTO articles (
            title, slug, league, match_name, match_time, confidence,
            cover_image, excerpt, content, author, status, featured, content_type,
            primary_keyword, secondary_keywords, seo_title, meta_description, canonical_url,
            og_title, og_description, og_image, author_user_id, author_username, author_url,
            created_at, updated_at, published_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), ?)
        `).bind(
          cleanText(data.title), slug, nullableText(data.league), nullableText(data.match_name),
          nullableText(data.match_time), normalizeConfidence(data.confidence),
          nullableText(data.image_url || data.cover_image), nullableText(data.excerpt),
          cleanText(data.content), session.display_name, status, data.featured ? 1 : 0,
          normalizeContentType(data.content_type), nullableText(data.primary_keyword), nullableText(data.secondary_keywords),
          nullableText(data.seo_title), nullableText(data.meta_description), canonicalUrl(slug, data.canonical_url),
          nullableText(data.og_title), nullableText(data.og_description), nullableText(data.og_image || data.image_url || data.cover_image),
          session.id, nullableText(session.username), nullableText(session.wikimedia_url), publishedAt
        ).run();
        await writeAudit(env.DB,session,"create_article","article",result.meta?.last_row_id,cleanText(data.title));
        return json({ success: true, id: result.meta?.last_row_id, message: "บันทึกบทความเรียบร้อย" }, 201, cors);
      }

      const adminMatch = url.pathname.match(/^\/api\/admin\/articles\/(\d+)$/);
      if (adminMatch) {
        const session = await requireAdmin(request, env);
        const id = Number(adminMatch[1]);
        if (request.method === "PUT") {
          await ensureContentColumns(env.DB);
          const existing = await env.DB.prepare("SELECT * FROM articles WHERE id = ? LIMIT 1").bind(id).first();
          if (!existing) throw new HttpError(404, "ไม่พบบทความ");
          if (session.role !== "owner" && Number(existing.author_user_id)!==Number(session.id)) throw new HttpError(403, "แก้ไขได้เฉพาะบทความของตัวเอง");
          const data = await readJson(request);
          validateArticle(data);
          const status = normalizeStatus(data.status);
          const publishedAt = getPublicationTime(status, data.publish_at);
          const keepExistingAuthor = session.role === "owner" && existing.author_user_id && Number(existing.author_user_id)!==Number(session.id);
          const articleAuthor = keepExistingAuthor ? {
            id:existing.author_user_id,
            display_name:existing.author,
            wikimedia_username:existing.author_username,
            wikimedia_url:existing.author_url
          } : session;
          await env.DB.prepare(`
            UPDATE articles SET
              title=?, slug=?, league=?, match_name=?, match_time=?, confidence=?, cover_image=?,
              excerpt=?, content=?, author=?, status=?, featured=?, content_type=?,
              primary_keyword=?, secondary_keywords=?, seo_title=?, meta_description=?, canonical_url=?,
              og_title=?, og_description=?, og_image=?, author=?, author_user_id=?, author_username=?, author_url=?, updated_at=datetime('now'), published_at=?
            WHERE id=?
          `).bind(
            cleanText(data.title), await createUniqueSlugForUpdate(env.DB, data.slug || existing.slug || data.title, id), nullableText(data.league), nullableText(data.match_name),
            nullableText(data.match_time), normalizeConfidence(data.confidence),
            nullableText(data.image_url || data.cover_image), nullableText(data.excerpt),
            cleanText(data.content), articleAuthor.display_name, status, data.featured ? 1 : 0,
            normalizeContentType(data.content_type), nullableText(data.primary_keyword), nullableText(data.secondary_keywords),
            nullableText(data.seo_title), nullableText(data.meta_description), canonicalUrl(await createUniqueSlugForUpdate(env.DB, data.slug || existing.slug || data.title, id), data.canonical_url),
            nullableText(data.og_title), nullableText(data.og_description), nullableText(data.og_image || data.image_url || data.cover_image),
            articleAuthor.display_name, articleAuthor.id, nullableText(articleAuthor.username || articleAuthor.wikimedia_username), nullableText(articleAuthor.wikimedia_url), publishedAt, id
          ).run();
          await writeAudit(env.DB,session,"update_article","article",id,cleanText(data.title));
          return json({ success: true, message: "แก้ไขบทความเรียบร้อย" }, 200, cors);
        }
        if (request.method === "DELETE") {
          const existing = await env.DB.prepare("SELECT author_user_id FROM articles WHERE id=?").bind(id).first();
          if (existing && session.role !== "owner" && Number(existing.author_user_id)!==Number(session.id)) throw new HttpError(403, "ลบได้เฉพาะบทความของตัวเอง");
          const result = await env.DB.prepare("DELETE FROM articles WHERE id = ?").bind(id).run();
          if (!result.meta?.changes) throw new HttpError(404, "ไม่พบบทความ");
          await writeAudit(env.DB,session,"delete_article","article",id,"");
          return json({ success: true, message: "ลบบทความเรียบร้อย" }, 200, cors);
        }
      }


      if (url.pathname === "/api/admin/popup" && request.method === "GET") { await requireAdmin(request,env);await ensurePopupTable(env.DB);const row=await env.DB.prepare("SELECT * FROM site_popup WHERE id=1").first();return json({success:true,popup:normalizePopup(row)},200,cors); }
      if (url.pathname === "/api/admin/popup" && request.method === "PUT") { await requireAdmin(request,env);await ensurePopupTable(env.DB);const d=await readJson(request);if(d.enabled&&!cleanText(d.image_url))throw new HttpError(400,"กรุณาระบุ URL รูป Popup");const s=nullableIso(d.start_at),e=nullableIso(d.end_at);if(s&&e&&new Date(e)<=new Date(s))throw new HttpError(400,"เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่ม");await env.DB.prepare(`INSERT INTO site_popup(id,enabled,title,image_url,link_url,start_at,end_at,once_per_session,updated_at) VALUES(1,?,?,?,?,?,?,?,datetime('now')) ON CONFLICT(id) DO UPDATE SET enabled=excluded.enabled,title=excluded.title,image_url=excluded.image_url,link_url=excluded.link_url,start_at=excluded.start_at,end_at=excluded.end_at,once_per_session=excluded.once_per_session,updated_at=datetime('now')`).bind(d.enabled?1:0,nullableText(d.title),nullableText(d.image_url),nullableText(d.link_url),s,e,d.once_per_session===false?0:1).run();return json({success:true,message:"บันทึก Popup เรียบร้อย"},200,cors); }
      if (url.pathname === "/api/popup" && request.method === "GET") { await ensurePopupTable(env.DB);const p=normalizePopup(await env.DB.prepare("SELECT * FROM site_popup WHERE id=1").first()),n=Date.now();const active=p.enabled&&p.image_url&&(!p.start_at||new Date(p.start_at).getTime()<=n)&&(!p.end_at||new Date(p.end_at).getTime()>=n);return json({success:true,popup:active?p:null},200,cors); }

      if (url.pathname === "/api/articles" && request.method === "GET") {
        await ensureContentColumns(env.DB);
        const limit = Math.min(500, Math.max(1, Number(url.searchParams.get("limit")) || 12));
        const page = Math.max(1, Math.floor(Number(url.searchParams.get("page")) || 1));
        const offset = (page - 1) * limit;
        const now = new Date().toISOString();
        const type = url.searchParams.get("type");
        let results, totalRow;
        if (["analysis", "news", "evergreen"].includes(type)) {
          totalRow = await env.DB.prepare(`
            SELECT COUNT(*) AS total FROM articles
            WHERE COALESCE(content_type,'analysis') = ?
              AND (status = 'published'
               OR (status = 'scheduled' AND published_at IS NOT NULL AND published_at <= ?))
          `).bind(type, now).first();
          ({ results } = await env.DB.prepare(`
            SELECT * FROM articles
            WHERE COALESCE(content_type,'analysis') = ?
              AND (status = 'published'
               OR (status = 'scheduled' AND published_at IS NOT NULL AND published_at <= ?))
            ORDER BY featured DESC, COALESCE(published_at, created_at) DESC, id DESC
            LIMIT ? OFFSET ?
          `).bind(type, now, limit, offset).all());
        } else {
          totalRow = await env.DB.prepare(`
            SELECT COUNT(*) AS total FROM articles
            WHERE status = 'published'
               OR (status = 'scheduled' AND published_at IS NOT NULL AND published_at <= ?)
          `).bind(now).first();
          ({ results } = await env.DB.prepare(`
            SELECT * FROM articles
            WHERE status = 'published'
               OR (status = 'scheduled' AND published_at IS NOT NULL AND published_at <= ?)
            ORDER BY featured DESC, COALESCE(published_at, created_at) DESC, id DESC
            LIMIT ? OFFSET ?
          `).bind(now, limit, offset).all());
        }
        const total = Number(totalRow?.total || 0);
        return json({ success: true, articles: (results || []).map(normalizeArticle), page, limit, total, total_pages: Math.max(1, Math.ceil(total / limit)) }, 200, cors);
      }

      if (url.pathname === "/api/sitemap" && request.method === "GET") {
        await ensureContentColumns(env.DB);
        const now = new Date().toISOString();
        const { results } = await env.DB.prepare(`
          SELECT slug, title, content_type, cover_image, updated_at, published_at, created_at FROM articles
          WHERE status = 'published' OR (status = 'scheduled' AND published_at IS NOT NULL AND published_at <= ?)
          ORDER BY COALESCE(updated_at, published_at, created_at) DESC
        `).bind(now).all();
        return json({ success: true, articles: results || [] }, 200, cors);
      }

      const publicMatch = url.pathname.match(/^\/api\/articles\/([^/]+)$/);
      if (publicMatch && request.method === "GET") {
        await ensureContentColumns(env.DB);
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
        const authorUser=article.author_user_id?await env.DB.prepare("SELECT * FROM admin_users WHERE id=? AND active=1").bind(article.author_user_id).first():null;
        const authorData=authorUser?{author_profile_url:`https://www.fb55vip.com/author/${encodeURIComponent(authorUser.username)}`,author_same_as:userSameAs(authorUser),author_avatar:authorUser.avatar_url||"",author_bio:authorUser.bio||""}:{};
        return json({ success: true, article: normalizeArticle({ ...article,...authorData, views: Number(article.views || 0) + 1 }) }, 200, cors);
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
  await ensureAdminUsers(env.DB);
  const body = await readJson(request);
  const username = normalizeUsername(body.username);
  let user = await env.DB.prepare("SELECT * FROM admin_users WHERE username=? COLLATE NOCASE LIMIT 1").bind(username).first();
  if (!user && await bootstrapOwner(body, env)) {
    user = await env.DB.prepare("SELECT * FROM admin_users WHERE username=? COLLATE NOCASE LIMIT 1").bind(username).first();
  }
  if (!user || !user.active || !(await verifyPassword(body.password || "", user.password_salt, user.password_hash))) {
    throw new HttpError(401, "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
  }
  await writeAudit(env.DB,user,"login","session",null,"");
  return json({ success:true, token:await createToken(env.SESSION_SECRET, user), user:publicUser(user), expiresIn:28800 }, 200, cors);
}

async function requireAdmin(request, env) {
  await ensureAdminUsers(env.DB);
  const match = (request.headers.get("Authorization") || "").match(/^Bearer\s+(.+)$/i);
  const payload = match ? await verifyToken(match[1], env.SESSION_SECRET) : null;
  if (!payload?.sub) {
    throw new HttpError(401, "Session หมดอายุ กรุณาเข้าสู่ระบบใหม่");
  }
  const user = await env.DB.prepare("SELECT * FROM admin_users WHERE id=? LIMIT 1").bind(payload.sub).first();
  if (!user || !user.active) throw new HttpError(401, "บัญชีถูกปิดใช้งานหรือ Session หมดอายุ");
  return user;
}

async function requireOwner(request, env) {
  const user = await requireAdmin(request, env);
  if (user.role !== "owner") throw new HttpError(403, "สำหรับผู้ดูแลหลักเท่านั้น");
  return user;
}

async function ensureAdminUsers(db) {
  await db.prepare(`CREATE TABLE IF NOT EXISTS admin_users(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE COLLATE NOCASE,
    display_name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'editor',
    active INTEGER NOT NULL DEFAULT 1,
    bio TEXT,
    avatar_url TEXT,
    wikimedia_username TEXT,
    wikimedia_url TEXT,
    facebook_url TEXT,
    tiktok_url TEXT,
    youtube_url TEXT,
    x_url TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`).run();
  const info=await db.prepare("PRAGMA table_info(admin_users)").all();
  const names=new Set((info.results||[]).map(row=>row.name));
  const additions=[["bio","TEXT"],["avatar_url","TEXT"],["wikimedia_username","TEXT"],["wikimedia_url","TEXT"],["facebook_url","TEXT"],["tiktok_url","TEXT"],["youtube_url","TEXT"],["x_url","TEXT"]];
  for(const [name,definition] of additions)if(!names.has(name))await db.prepare(`ALTER TABLE admin_users ADD COLUMN ${name} ${definition}`).run();
}

async function bootstrapOwner(body, env) {
  const username = normalizeUsername(body.username);
  if (!timingSafeEqual(username, normalizeUsername(env.ADMIN_USERNAME || "")) || !timingSafeEqual(body.password || "", env.ADMIN_PASSWORD || "")) return false;
  const count = await env.DB.prepare("SELECT COUNT(*) AS total FROM admin_users").first();
  if (Number(count?.total || 0) > 0) return false;
  const password = await hashPassword(body.password);
  await env.DB.prepare("INSERT INTO admin_users(username,display_name,password_hash,password_salt,role,active) VALUES(?,?,?,?, 'owner',1)")
    .bind(username, cleanText(env.ADMIN_DISPLAY_NAME) || "HN FOOTBALL SCORE", password.hash, password.salt).run();
  return true;
}


async function ensureContentColumns(db) {
  await db.prepare(`CREATE TABLE IF NOT EXISTS articles(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    league TEXT,
    match_name TEXT,
    match_time TEXT,
    confidence INTEGER NOT NULL DEFAULT 0,
    cover_image TEXT,
    excerpt TEXT,
    content TEXT NOT NULL,
    author TEXT,
    status TEXT NOT NULL DEFAULT 'draft',
    featured INTEGER NOT NULL DEFAULT 0,
    content_type TEXT NOT NULL DEFAULT 'analysis',
    primary_keyword TEXT,
    secondary_keywords TEXT,
    seo_title TEXT,
    meta_description TEXT,
    canonical_url TEXT,
    og_title TEXT,
    og_description TEXT,
    og_image TEXT,
    author_user_id INTEGER,
    author_username TEXT,
    author_url TEXT,
    views INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    published_at TEXT
  )`).run();
  const info = await db.prepare("PRAGMA table_info(articles)").all();
  const names = new Set((info.results || []).map(r => r.name));
  const columns = [
    ["league", "TEXT"], ["match_name", "TEXT"], ["match_time", "TEXT"],
    ["confidence", "INTEGER NOT NULL DEFAULT 0"], ["cover_image", "TEXT"],
    ["excerpt", "TEXT"], ["author", "TEXT"], ["status", "TEXT NOT NULL DEFAULT 'draft'"],
    ["featured", "INTEGER NOT NULL DEFAULT 0"],
    ["content_type", "TEXT NOT NULL DEFAULT 'analysis'"],
    ["primary_keyword", "TEXT"], ["secondary_keywords", "TEXT"], ["seo_title", "TEXT"],
    ["meta_description", "TEXT"], ["canonical_url", "TEXT"], ["og_title", "TEXT"],
    ["og_description", "TEXT"], ["og_image", "TEXT"],
    ["author_user_id", "INTEGER"], ["author_username", "TEXT"], ["author_url", "TEXT"],
    ["views", "INTEGER NOT NULL DEFAULT 0"], ["created_at", "TEXT"],
    ["updated_at", "TEXT"], ["published_at", "TEXT"]
  ];
  for (const [name, def] of columns) if (!names.has(name)) await db.prepare(`ALTER TABLE articles ADD COLUMN ${name} ${def}`).run();
}
function normalizeContentType(value) {
  return ["news", "analysis", "evergreen"].includes(value) ? value : "analysis";
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
  const type = a.content_type || "analysis";
  const fallbackDesc = cleanText(a.excerpt) || (type === "news" ? "ข่าวฟุตบอลจาก HN FOOTBALL SCORE" : type === "evergreen" ? "ความรู้ฟุตบอลจาก HN FOOTBALL SCORE" : "บทวิเคราะห์ฟุตบอลจาก HN FOOTBALL SCORE");
  const canonical = canonicalUrl(a.slug || "", a.canonical_url);
  return {
    ...a,
    image_url: a.cover_image || "",
    publish_at: a.published_at || null,
    published: effective === "published",
    effective_status: effective,
    featured: Boolean(a.featured),
    confidence: Number(a.confidence || 0),
    content_type: type,
    seo_title: a.seo_title || (a.title ? `${a.title} | HN FOOTBALL SCORE` : "HN FOOTBALL SCORE"),
    meta_description: a.meta_description || fallbackDesc,
    canonical_url: canonical,
    og_title: a.og_title || a.seo_title || a.title || "HN FOOTBALL SCORE",
    og_description: a.og_description || a.meta_description || fallbackDesc,
    og_image: a.og_image || a.cover_image || "https://www.fb55vip.com/assets/og-image.jpg",
    author: a.author || "บอส สิทธิกร",
    author_user_id: a.author_user_id || null,
    author_username: a.author_username || "",
    author_url: a.author_url || "",
    author_profile_url:a.author_profile_url||(a.author_username?`https://www.fb55vip.com/author/${encodeURIComponent(a.author_username)}`:""),
    author_same_as:Array.isArray(a.author_same_as)?a.author_same_as:[],
    author_avatar:a.author_avatar||"",
    author_bio:a.author_bio||"",
    views: Number(a.views || 0)
  };
}

function calculateStats(articles) {
  return {
    total: articles.length,
    published: articles.filter(a => a.effective_status === "published").length,
    scheduled: articles.filter(a => a.status === "scheduled" && a.effective_status !== "published").length,
    draft: articles.filter(a => a.status === "draft").length,
    featured: articles.filter(a => a.featured).length,
    analysis: articles.filter(a => (a.content_type || "analysis") === "analysis").length,
    news: articles.filter(a => a.content_type === "news").length,
    evergreen: articles.filter(a => a.content_type === "evergreen").length
  };
}

function validateArticle(data) {
  if (!cleanText(data.title)) throw new HttpError(400, "กรุณากรอกหัวข้อบทความ");
  if (!cleanText(data.content)) throw new HttpError(400, "กรุณากรอกเนื้อหาบทความ");
  if (String(data.title).length > 160) throw new HttpError(400, "หัวข้อบทความยาวเกินไป");
}


function canonicalUrl(slug, supplied) {
  const expected = `https://www.fb55vip.com/article?slug=${encodeURIComponent(slug)}`;
  if (!supplied) return expected;
  try {
    const u = new URL(supplied);
    if (u.hostname === "fb55vip.com" || u.hostname === "www.fb55vip.com") return expected;
  } catch {}
  return expected;
}
async function createUniqueSlugForUpdate(db, source, id) {
  const base = slugify(source) || `article-${Date.now()}`; let slug = base;
  for (let n=2;;n++) { const row=await db.prepare("SELECT id FROM articles WHERE slug = ? AND id != ? LIMIT 1").bind(slug,id).first(); if(!row)return slug; slug=`${base}-${n}`; }
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

async function createToken(secret, user) {
  if (!secret) throw new Error("SESSION_SECRET is not configured");
  const payload = base64UrlEncode(JSON.stringify({ sub:Number(user.id), role:user.role, exp:Math.floor(Date.now()/1000)+28800 }));
  return `${payload}.${await sign(payload, secret)}`;
}

async function verifyToken(token, secret) {
  if (!token || !secret) return null;
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra) return null;
  if (!timingSafeEqual(signature, await sign(payload, secret))) return null;
  try {
    const data = JSON.parse(base64UrlDecode(payload));
    return Number(data.exp)>Math.floor(Date.now()/1000) ? data : null;
  } catch { return null; }
}

async function hashPassword(password, suppliedSalt="") {
  const salt = suppliedSalt ? base64UrlToBytes(suppliedSalt) : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(String(password)), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name:"PBKDF2", hash:"SHA-256", salt, iterations:100000 }, key, 256);
  return { hash:bytesToBase64Url(new Uint8Array(bits)), salt:bytesToBase64Url(salt) };
}
async function verifyPassword(password, salt, expected) {
  if (!salt || !expected) return false;
  const actual = await hashPassword(password, salt);
  return timingSafeEqual(actual.hash, expected);
}
function validatePassword(password) { if (String(password||"").length<8) throw new HttpError(400,"รหัสผ่านต้องมีอย่างน้อย 8 ตัว"); }
function normalizeUsername(value) { return cleanText(value).toLowerCase().replace(/[^\p{L}\p{N}._-]/gu,"").slice(0,60); }
function normalizeRole(value) { return value === "owner" ? "owner" : "editor"; }
function publicUser(user) { return { id:Number(user.id), username:user.username, display_name:user.display_name, role:user.role, active:Boolean(user.active), bio:user.bio||"", avatar_url:user.avatar_url||"", wikimedia_username:user.wikimedia_username||"", wikimedia_url:user.wikimedia_url||"", facebook_url:user.facebook_url||"", tiktok_url:user.tiktok_url||"", youtube_url:user.youtube_url||"", x_url:user.x_url||"", same_as:userSameAs(user) }; }
function userSameAs(user){return [user.wikimedia_url,user.facebook_url,user.tiktok_url,user.youtube_url,user.x_url].map(value=>safeHttpUrl(value)).filter(Boolean)}
function normalizeProfile(data){return{bio:cleanText(data.bio).slice(0,500),avatar_url:safeHttpUrl(data.avatar_url),facebook_url:safeHttpUrl(data.facebook_url),tiktok_url:safeHttpUrl(data.tiktok_url),youtube_url:safeHttpUrl(data.youtube_url),x_url:safeHttpUrl(data.x_url)}}
function safeHttpUrl(value){const raw=cleanText(value);if(!raw)return"";try{const url=new URL(raw);return ["http:","https:"].includes(url.protocol)?url.toString():""}catch{return""}}
function normalizeWikimedia(username, value) {
  const name=cleanText(username).slice(0,100), raw=cleanText(value);
  if (!raw) return {username:name,url:""};
  let url;try{url=new URL(raw)}catch{throw new HttpError(400,"ลิงก์ Wikimedia ไม่ถูกต้อง")}
  const host=url.hostname.toLowerCase();
  if (!(host.endsWith("wikimedia.org")||host.endsWith("wikipedia.org")||host.endsWith("wikidata.org"))) throw new HttpError(400,"กรุณาใช้ลิงก์ Wikimedia, Wikipedia หรือ Wikidata เท่านั้น");
  return {username:name,url:url.toString()};
}

async function ensureSocialLinks(db){await db.prepare(`CREATE TABLE IF NOT EXISTS site_social_links(id INTEGER PRIMARY KEY AUTOINCREMENT,platform TEXT NOT NULL,label TEXT NOT NULL,url TEXT NOT NULL,active INTEGER NOT NULL DEFAULT 1,show_footer INTEGER NOT NULL DEFAULT 1,show_article INTEGER NOT NULL DEFAULT 1,sort_order INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`).run()}
function normalizeSocialLink(row){return{id:Number(row.id),platform:row.platform||"other",label:row.label||row.platform||"Social",url:row.url||"",active:Boolean(row.active),show_footer:Boolean(row.show_footer),show_article:Boolean(row.show_article),sort_order:Number(row.sort_order||0)}}
function validateSocialLink(data){const platform=["facebook","line","instagram","tiktok","youtube","x","other"].includes(data.platform)?data.platform:"other",label=cleanText(data.label).slice(0,80),url=safeHttpUrl(data.url);if(!label||!url)throw new HttpError(400,"กรุณากรอกชื่อและ URL ให้ถูกต้อง");return{platform,label,url,active:data.active!==false,show_footer:data.show_footer!==false,show_article:data.show_article!==false,sort_order:Math.max(0,Math.min(999,Math.floor(Number(data.sort_order)||0)))}}
async function ensureAuditLog(db){await db.prepare(`CREATE TABLE IF NOT EXISTS admin_audit_log(id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER,action TEXT NOT NULL,entity_type TEXT NOT NULL,entity_id INTEGER,detail TEXT,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`).run()}
async function writeAudit(db,user,action,entityType,entityId,detail){try{await ensureAuditLog(db);await db.prepare("INSERT INTO admin_audit_log(user_id,action,entity_type,entity_id,detail,created_at) VALUES(?,?,?,?,?,datetime('now'))").bind(user?.id||null,cleanText(action),cleanText(entityType),entityId||null,cleanText(detail).slice(0,300)||null).run()}catch(error){console.error("Audit log error",error)}}

async function handleUpload(request, env, cors, session) {
  if (!env.MEDIA) throw new HttpError(500,"ยังไม่ได้ผูก R2 bucket ชื่อ MEDIA");
  const form=await request.formData();const file=form.get("file");
  if (!(file instanceof File)) throw new HttpError(400,"กรุณาเลือกรูป");
  const allowed={"image/jpeg":"jpg","image/png":"png","image/webp":"webp","image/gif":"gif"};
  const ext=allowed[file.type];if(!ext)throw new HttpError(400,"รองรับเฉพาะ JPG, PNG, WebP และ GIF");
  if(file.size>5*1024*1024)throw new HttpError(413,"รูปต้องมีขนาดไม่เกิน 5 MB");
  const date=new Date();const key=`articles/${date.getUTCFullYear()}/${String(date.getUTCMonth()+1).padStart(2,"0")}/${crypto.randomUUID()}.${ext}`;
  await env.MEDIA.put(key,file.stream(),{httpMetadata:{contentType:file.type},customMetadata:{uploadedBy:session.username}});
  return json({success:true,url:`${new URL(request.url).origin}/media/${key}`},201,cors);
}
async function serveMedia(request, env, cors) {
  if(!env.MEDIA)throw new HttpError(500,"MEDIA storage is not configured");
  const key=decodeURIComponent(new URL(request.url).pathname.slice(7));
  if(!key||key.includes(".."))throw new HttpError(400,"Invalid media key");
  const object=await env.MEDIA.get(key);if(!object)throw new HttpError(404,"ไม่พบรูป");
  const headers=new Headers(cors);object.writeHttpMetadata(headers);headers.set("etag",object.httpEtag);headers.set("Cache-Control","public, max-age=31536000, immutable");headers.set("X-Content-Type-Options","nosniff");
  return new Response(object.body,{headers});
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
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.has(origin) ? origin : "https://www.fb55vip.com",
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


async function ensurePopupTable(db){await db.prepare(`CREATE TABLE IF NOT EXISTS site_popup(id INTEGER PRIMARY KEY CHECK(id=1),enabled INTEGER NOT NULL DEFAULT 0,title TEXT,image_url TEXT,link_url TEXT,start_at TEXT,end_at TEXT,once_per_session INTEGER NOT NULL DEFAULT 1,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`).run();}
function normalizePopup(r){return r?{enabled:Boolean(r.enabled),title:r.title||"",image_url:r.image_url||"",link_url:r.link_url||"",start_at:r.start_at||null,end_at:r.end_at||null,once_per_session:Boolean(r.once_per_session),updated_at:r.updated_at||null}:{enabled:false,title:"",image_url:"",link_url:"",start_at:null,end_at:null,once_per_session:true};}
function nullableIso(v){if(!v)return null;const d=new Date(v);if(Number.isNaN(d.getTime()))throw new HttpError(400,"รูปแบบวันที่หรือเวลาไม่ถูกต้อง");return d.toISOString();}

function cleanText(v) { return String(v ?? "").trim(); }
function nullableText(v) { const s=cleanText(v); return s || null; }
function normalizeConfidence(v) { const n=Number(v); return Number.isFinite(n) ? Math.max(0,Math.min(100,Math.round(n))) : 0; }
function timingSafeEqual(a,b) { a=String(a);b=String(b);if(a.length!==b.length)return false;let r=0;for(let i=0;i<a.length;i++)r|=a.charCodeAt(i)^b.charCodeAt(i);return r===0; }
function base64UrlEncode(v) { return bytesToBase64Url(new TextEncoder().encode(v)); }
function base64UrlDecode(v) { const b=v.replace(/-/g,"+").replace(/_/g,"/").padEnd(Math.ceil(v.length/4)*4,"="); return decodeURIComponent([...atob(b)].map(c=>`%${c.charCodeAt(0).toString(16).padStart(2,"0")}`).join("")); }
function bytesToBase64Url(bytes) { let s="";for(const b of bytes)s+=String.fromCharCode(b);return btoa(s).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/g,""); }
function base64UrlToBytes(value) { const b=String(value).replace(/-/g,"+").replace(/_/g,"/").padEnd(Math.ceil(String(value).length/4)*4,"=");return Uint8Array.from(atob(b),c=>c.charCodeAt(0)); }
class HttpError extends Error { constructor(status,message){super(message);this.status=status;} }
