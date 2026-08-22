import {SITE,esc,getArticlePage,pageShell,pageNumber,pageUrl,pagination} from "./_lib/content.js";

const STATIC_ARTICLES=[
 {slug:"var-football",category:"กฎฟุตบอล",title:"VAR คืออะไร ทำงานอย่างไร",excerpt:"VAR ย่อมาจาก Video Assistant Referee หรือผู้ช่วยผู้ตัดสินวิดีโอ เป็นระบบที่ช่วยให้ทีมผู้ตัดสินตรวจสอบเหตุการณ์สำคัญจากภาพวิดีโอ เพื่อลดความผิดพลาดที่ชัดเจนในการตัดสิน"},
 {slug:"offside-rule",category:"กฎฟุตบอล",title:"กฎล้ำหน้าฟุตบอลฉบับเข้าใจง่าย",excerpt:"การอยู่ในตำแหน่งล้ำหน้าเพียงอย่างเดียวยังไม่ถือว่าเป็นความผิด ผู้เล่นจะถูกลงโทษเมื่อเข้ามามีส่วนร่วมกับการเล่นตามเงื่อนไขของกติกา"},
 {slug:"football-table-points",category:"พื้นฐานฟุตบอล",title:"ตารางคะแนนฟุตบอลคิดคะแนนอย่างไร",excerpt:"ลีกฟุตบอลส่วนใหญ่ใช้ระบบคะแนนพื้นฐาน: ชนะได้ 3 คะแนน เสมอได้ 1 คะแนน และแพ้ได้ 0 คะแนน"},
 {slug:"goal-difference",category:"สถิติฟุตบอล",title:"ผลต่างประตูได้เสียคืออะไร",excerpt:"ผลต่างประตูได้เสีย หรือ Goal Difference คำนวณจากจำนวนประตูที่ทีมยิงได้ลบด้วยจำนวนประตูที่เสีย"},
 {slug:"champions-league-format",category:"รายการแข่งขัน",title:"Champions League รูปแบบการแข่งขันเป็นอย่างไร",excerpt:"ยูฟ่า แชมเปียนส์ลีกมีทั้งรอบคัดเลือก ลีกเฟส และรอบน็อกเอาต์ โดยรายละเอียดอาจเปลี่ยนไปตามฤดูกาล"},
 {slug:"yellow-red-cards",category:"กฎฟุตบอล",title:"ใบเหลืองและใบแดงมีกฎอย่างไร",excerpt:"ใบเหลืองใช้เป็นการคาดโทษ ส่วนใบแดงให้ผู้เล่นออกจากสนามตามเงื่อนไขที่กำหนดในกติกา"},
 {slug:"extra-time-penalty-shootout",category:"กฎฟุตบอล",title:"Extra Time กับการดวลจุดโทษต่างกันอย่างไร",excerpt:"การต่อเวลาพิเศษเป็นช่วงแข่งขันเพิ่มเติม ส่วนการดวลจุดโทษใช้ตัดสินผู้ชนะตามระเบียบการแข่งขัน"},
 {slug:"how-to-read-football-stats",category:"สถิติฟุตบอล",title:"วิธีอ่านสถิติฟุตบอลก่อนการแข่งขัน",excerpt:"ควรอ่านฟอร์ม ประตูได้เสีย คุณภาพคู่แข่ง และผลงานเหย้าเยือนร่วมกัน ไม่ตัดสินจากตัวเลขค่าเดียว"}
];

const staticCard=a=>`<article class="hub-card"><img src="/assets/knowledge/${a.slug}.webp" alt="${esc(a.title)}" loading="lazy" width="1440" height="960"><div><span>${esc(a.category)}</span><h2><a href="/knowledge/${a.slug}.html">${esc(a.title)}</a></h2><p>${esc(a.excerpt)}</p></div></article>`;
const dynamicCard=(a,title)=>`<article class="hub-card">${a.image_url?`<img src="${esc(a.image_url)}" alt="${esc(a.title)}" loading="lazy">`:""}<div><span>${esc(a.league||title)}</span><h2><a href="/article?slug=${encodeURIComponent(a.slug)}">${esc(a.title)}</a></h2><p>${esc(a.excerpt||"")}</p></div></article>`;

export async function onRequestGet(context){
 const type="evergreen",base="/knowledge",page=pageNumber(context.request),limit=6,title="ความรู้ฟุตบอล",desc="คลังความรู้ฟุตบอล กติกา ศัพท์ สถิติ และรูปแบบการแข่งขัน อธิบายแบบอ่านง่ายและใช้เป็นข้อมูลอ้างอิงได้";
 const result=await getArticlePage(type,page,limit),total=result.total+STATIC_ARTICLES.length,totalPages=Math.max(1,Math.ceil(total/limit)),start=(page-1)*limit;
 if(page>totalPages)return new Response("ไม่พบหน้าที่ต้องการ",{status:404,headers:{"Content-Type":"text/plain; charset=UTF-8"}});
 const dynamicItems=result.items.filter(a=>String(a.content_type||a.type||"").toLowerCase()==="evergreen");
 const staticStart=Math.max(0,start-result.total),remaining=Math.max(0,limit-dynamicItems.length),staticItems=STATIC_ARTICLES.slice(staticStart,staticStart+remaining);
 const cards=dynamicItems.map(a=>dynamicCard(a,title)).join("")+staticItems.map(staticCard).join("");
 const canonical=pageUrl(base,page),pageTitle=page>1?`${title} – หน้า ${page}`:title;
 const schema={"@context":"https://schema.org","@type":"CollectionPage","name":pageTitle,"url":canonical,"description":desc,"isPartOf":{"@type":"WebSite","name":"HN FOOTBALL SCORE","url":`${SITE}/`}};
 const body=`<main class="article-shell"><a class="back" href="/">← กลับหน้าหลัก</a><section class="hub-head"><div class="kicker">HN FOOTBALL SCORE</div><h1>${pageTitle}</h1><p>${desc}</p></section><section class="hub-list">${cards}</section>${pagination(page,totalPages,base)}</main>`;
 return new Response(pageShell({title:`${pageTitle} | HN FOOTBALL SCORE`,description:desc,canonical,body,schema,prev:page>1?pageUrl(base,page-1):"",next:page<totalPages?pageUrl(base,page+1):""}),{headers:{"Content-Type":"text/html; charset=UTF-8","Cache-Control":"public, max-age=0, s-maxage=180"}})
}
