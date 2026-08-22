import {SITE,esc,getArticlePage,pageShell,pageNumber,pageUrl,pagination} from "./_lib/content.js";
export async function onRequestGet(context){
 const type="news",base="/news",page=pageNumber(context.request),limit=6,title="ข่าวฟุตบอล",desc="อัปเดตข่าวฟุตบอลจาก HN FOOTBALL SCORE พร้อมบริบทและข้อมูลสำคัญของแต่ละเหตุการณ์";
 const result=await getArticlePage(type,page,limit),totalPages=result.totalPages;
 if(page>totalPages)return new Response("ไม่พบหน้าที่ต้องการ",{status:404,headers:{"Content-Type":"text/plain; charset=UTF-8"}});
 const canonical=pageUrl(base,page),pageTitle=page>1?`${title} – หน้า ${page}`:title;
 const cards=result.items.map(a=>`<article class="hub-card">${a.image_url?`<img src="${esc(a.image_url)}" alt="${esc(a.title)}" loading="lazy">`:""}<div><span>${esc(a.league||title)}</span><h2><a href="/article?slug=${encodeURIComponent(a.slug)}">${esc(a.title)}</a></h2><p>${esc(a.excerpt||"")}</p></div></article>`).join("")||`<p class="empty">ยังไม่มีเนื้อหาเผยแพร่ในหมวดนี้</p>`;
 const schema={"@context":"https://schema.org","@type":"CollectionPage","name":pageTitle,"url":canonical,"description":desc,"isPartOf":{"@type":"WebSite","name":"HN FOOTBALL SCORE","url":`${SITE}/`}};
 const body=`<main class="article-shell"><a class="back" href="/">← กลับหน้าหลัก</a><section class="hub-head"><div class="kicker">HN FOOTBALL SCORE</div><h1>${pageTitle}</h1><p>${desc}</p></section><section class="hub-list">${cards}</section>${pagination(page,totalPages,base)}</main>`;
 return new Response(pageShell({title:`${pageTitle} | HN FOOTBALL SCORE`,description:desc,canonical,body,schema,prev:page>1?pageUrl(base,page-1):"",next:page<totalPages?pageUrl(base,page+1):""}),{headers:{"Content-Type":"text/html; charset=UTF-8","Cache-Control":"public, max-age=0, s-maxage=180"}})
}
