import {SITE,esc,formatDate,getArticle,getArticles,canonicalFor,pageShell} from "./_lib/content.js";
export async function onRequestGet({request}){
  const u=new URL(request.url),slug=u.searchParams.get("slug")||"";
  if(!slug)return Response.redirect(`${SITE}/`,302);
  const a=await getArticle(slug); if(!a)return new Response("ไม่พบบทความ",{status:404,headers:{"Content-Type":"text/plain; charset=UTF-8","X-Robots-Tag":"noindex"}});
  const canonical=canonicalFor(a), title=a.seo_title||a.title||"HN FOOTBALL SCORE", desc=a.meta_description||a.excerpt||"ข่าวฟุตบอลและบทวิเคราะห์ HN FOOTBALL SCORE";
  const image=a.og_image||a.image_url||`${SITE}/assets/og-image.png`;
  const all=await getArticles(a.content_type||"analysis",20);
  const related=all.filter(x=>x.slug&&x.slug!==a.slug).slice(0,4);
  const breadcrumb={"@type":"BreadcrumbList","itemListElement":[
    {"@type":"ListItem","position":1,"name":"หน้าแรก","item":`${SITE}/`},
    {"@type":"ListItem","position":2,"name":a.content_type==="news"?"ข่าวฟุตบอล":a.content_type==="evergreen"?"ความรู้ฟุตบอล":"บทวิเคราะห์","item":`${SITE}/${a.content_type==="news"?"news":a.content_type==="evergreen"?"knowledge":"analysis"}`},
    {"@type":"ListItem","position":3,"name":a.title,"item":canonical}
  ]};
  const article={"@type":a.content_type==="news"?"NewsArticle":"Article","@id":`${canonical}#article`,"headline":""};
  const schema={"@context":"https://schema.org","@graph":[
    {"@type":a.content_type==="news"?"NewsArticle":"Article","@id":`${canonical}#article","headline":a.title,"description":desc,"image":[image],"datePublished":a.publish_at||a.published_at||a.created_at,"dateModified":a.updated_at||a.publish_at||a.created_at,"author":{"@type":"Person","name":a.author||"บอส สิทธิกร","url":`${SITE}/about.html#author`},"publisher":{"@type":"Organization","name":"HN FOOTBALL SCORE","url":SITE,"logo":{"@type":"ImageObject","url":`${SITE}/assets/icons/icon.svg`}},"mainEntityOfPage":{"@type":"WebPage","@id":canonical},"inLanguage":"th-TH"},breadcrumb]};
  const rel=related.length?`<section class="related"><h2>เนื้อหาที่เกี่ยวข้อง</h2><div class="related-grid">${related.map(x=>`<a href="/article?slug=${encodeURIComponent(x.slug)}"><strong>${esc(x.title)}</strong><span>${esc(x.league||"")}</span></a>`).join("")}</div></section>`:"";
  const body=`<main class="article-shell"><nav class="breadcrumbs" aria-label="Breadcrumb"><a href="/">หน้าแรก</a> › <a href="/${a.content_type==="news"?"news":a.content_type==="evergreen"?"knowledge":"analysis"}">${a.content_type==="news"?"ข่าวฟุตบอล":a.content_type==="evergreen"?"ความรู้ฟุตบอล":"บทวิเคราะห์"}</a> › <span>${esc(a.title)}</span></nav><article class="article-card">${image?`<img class="cover" src="${esc(image)}" alt="${esc(a.title)}" loading="eager">`:""}<div class="body"><div class="kicker">${esc(a.league||(a.content_type==="news"?"ข่าวฟุตบอล":a.content_type==="evergreen"?"ความรู้ฟุตบอล":"บทวิเคราะห์"))}</div><h1>${esc(a.title)}</h1><div class="meta">${a.match_name?`<span>${esc(a.match_name)}</span>`:""}${a.match_time?`<span>${esc(formatDate(a.match_time))}</span>`:""}<span>โดย ${esc(a.author||"บอส สิทธิกร")}</span>${a.publish_at||a.published_at?`<span>เผยแพร่ ${esc(formatDate(a.publish_at||a.published_at))}</span>`:""}${a.updated_at?`<span>อัปเดต ${esc(formatDate(a.updated_at))}</span>`:""}</div>${a.excerpt?`<p class="lead">${esc(a.excerpt)}</p>`:""}<div class="content">${esc(a.content||"")}</div><div class="brand-foot">HN FOOTBALL SCORE • www.fb55vip.com</div></div></article>${rel}</main>`;
  let html=pageShell({title,description:desc,canonical,body,schema,type:"article"});
  html=html.replace(`<meta property="og:image" content="${SITE}/assets/og-image.png">`,`<meta property="og:image" content="${esc(image)}">`);
  return new Response(html,{headers:{"Content-Type":"text/html; charset=UTF-8","Cache-Control":"public, max-age=0, s-maxage=120"}});
}
