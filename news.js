import {SITE,esc,getArticles,pageShell} from "./_lib/content.js";
export async function onRequestGet(){
 const type="news", title="ข่าวฟุตบอล", desc="อัปเดตข่าวฟุตบอลจาก HN FOOTBALL SCORE พร้อมบริบทและข้อมูลสำคัญของแต่ละเหตุการณ์", canonical=`${SITE}/news`;
 const items=await getArticles(type,100);
 const cards=items.map(a=>`<article class="hub-card">${a.image_url?`<img src="${esc(a.image_url)}" alt="${esc(a.title)}" loading="lazy">`:""}<div><span>${esc(a.league||title)}</span><h2><a href="/article?slug=${encodeURIComponent(a.slug)}">${esc(a.title)}</a></h2><p>${esc(a.excerpt||"")}</p></div></article>`).join("")||`<p class="empty">ยังไม่มีเนื้อหาเผยแพร่ในหมวดนี้</p>`;
 const schema={"@context":"https://schema.org","@type":"CollectionPage","name":title,"url":canonical,"description":desc,"isPartOf":{"@type":"WebSite","name":"HN FOOTBALL SCORE","url":`${SITE}/`}};
 const body=`<main class="article-shell"><a class="back" href="/">← กลับหน้าหลัก</a><section class="hub-head"><div class="kicker">HN FOOTBALL SCORE</div><h1>${title}</h1><p>${desc}</p></section><section class="hub-list">${cards}</section></main>`;
 return new Response(pageShell({title:`${title} | HN FOOTBALL SCORE`,description:desc,canonical,body,schema}),{headers:{"Content-Type":"text/html; charset=UTF-8","Cache-Control":"public, max-age=0, s-maxage=180"}})
}
