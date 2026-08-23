import {SITE,esc,pageShell} from "../_lib/content.js";
const LEAGUES={
  "premier-league":{name:"พรีเมียร์ลีก",desc:"ศูนย์รวมข้อมูลพรีเมียร์ลีกอังกฤษ"},
  "la-liga":{name:"ลาลีกา",desc:"ศูนย์รวมข้อมูลลาลีกาสเปน"},
  "serie-a":{name:"เซเรียอา",desc:"ศูนย์รวมข้อมูลเซเรียอาอิตาลี"},
  "bundesliga":{name:"บุนเดสลีกา",desc:"ศูนย์รวมข้อมูลบุนเดสลีกาเยอรมนี"},
  "ligue-1":{name:"ลีกเอิง",desc:"ศูนย์รวมข้อมูลลีกเอิงฝรั่งเศส"},
  "champions-league":{name:"Champions League",desc:"ศูนย์รวมข้อมูลยูฟ่า Champions League"}
};
export async function onRequestGet(context){
  const slug=String(context.params.slug||"");const league=LEAGUES[slug];
  if(!league)return new Response("ไม่พบลีกที่ต้องการ",{status:404,headers:{"Content-Type":"text/plain; charset=UTF-8"}});
  const canonical=`${SITE}/leagues/${slug}`,title=`${league.name} | HN FOOTBALL SCORE`;
  const schema={"@context":"https://schema.org","@graph":[{"@type":"CollectionPage","name":league.name,"url":canonical,"description":league.desc,"isPartOf":{"@type":"WebSite","name":"HN FOOTBALL SCORE","url":`${SITE}/`}},{"@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"หน้าแรก","item":`${SITE}/`},{"@type":"ListItem","position":2,"name":"ลีกฟุตบอล","item":`${SITE}/leagues`},{"@type":"ListItem","position":3,"name":league.name,"item":canonical}]}]};
  const body=`<main class="article-shell"><nav class="breadcrumbs"><a href="/">หน้าแรก</a> › <a href="/leagues">ลีกฟุตบอล</a> › <span>${esc(league.name)}</span></nav><section class="hub-head"><div class="kicker">FOOTBALL LEAGUE HUB</div><h1>${esc(league.name)}</h1><p>${esc(league.desc)} เชื่อมไปยังเนื้อหาหลักของเว็บไซต์โดยไม่สร้างหน้าซ้ำหรือบทความบาง</p></section><section class="hub-list"><article class="hub-card"><div><span>LIVE & SCHEDULE</span><h2><a href="/#live">ผลบอลสดและโปรแกรมการแข่งขัน</a></h2><p>ดูการแข่งขันที่กำลังแข่งและโปรแกรมล่าสุดจากหน้าหลัก</p></div></article><article class="hub-card"><div><span>NEWS</span><h2><a href="/news">ข่าวฟุตบอล</a></h2><p>ติดตามข่าวพร้อมเลือกอ่านหัวข้อของ ${esc(league.name)}</p></div></article><article class="hub-card"><div><span>ANALYSIS</span><h2><a href="/analysis">บทวิเคราะห์ฟุตบอล</a></h2><p>บทวิเคราะห์เชิงกีฬา ฟอร์มทีม สถิติ และบริบทก่อนการแข่งขัน</p></div></article><article class="hub-card"><div><span>KNOWLEDGE</span><h2><a href="/knowledge">ความรู้ฟุตบอล</a></h2><p>กติกา ตารางคะแนน สถิติ และรูปแบบการแข่งขันที่เกี่ยวข้อง</p></div></article></section></main>`;
  return new Response(pageShell({title,description:`${league.desc} พร้อมข่าว โปรแกรม สถิติ บทวิเคราะห์ และความรู้ฟุตบอล`,canonical,body,schema}),{headers:{"Content-Type":"text/html; charset=UTF-8","Cache-Control":"public, max-age=0, s-maxage=300"}});
}
