import {SITE,esc,pageShell} from "./_lib/content.js";
const LEAGUES=[
  ["premier-league","พรีเมียร์ลีก"],["la-liga","ลาลีกา"],["serie-a","เซเรียอา"],
  ["bundesliga","บุนเดสลีกา"],["ligue-1","ลีกเอิง"],["champions-league","Champions League"]
];
export async function onRequestGet(){
  const canonical=`${SITE}/leagues`;
  const cards=LEAGUES.map(([slug,name])=>`<article class="hub-card"><div><span>FOOTBALL LEAGUE</span><h2><a href="/leagues/${slug}">${esc(name)}</a></h2><p>ข่าว โปรแกรม สถิติ บทวิเคราะห์ และความรู้ที่เกี่ยวข้องกับ${esc(name)}</p></div></article>`).join("");
  const schema={"@context":"https://schema.org","@type":"CollectionPage","name":"ศูนย์รวมลีกฟุตบอล","url":canonical,"isPartOf":{"@type":"WebSite","name":"HN FOOTBALL SCORE","url":`${SITE}/`}};
  const body=`<main class="article-shell"><a class="back" href="/">← กลับหน้าหลัก</a><section class="hub-head"><div class="kicker">FOOTBALL LEAGUES</div><h1>ศูนย์รวมลีกฟุตบอล</h1><p>เลือกลีกเพื่อเข้าถึงข่าว โปรแกรม สถิติ บทวิเคราะห์ และบทความความรู้ที่เกี่ยวข้อง</p></section><section class="hub-list">${cards}</section></main>`;
  return new Response(pageShell({title:"ศูนย์รวมลีกฟุตบอล | HN FOOTBALL SCORE",description:"รวมหน้าลีกฟุตบอลสำคัญ ข่าว โปรแกรม สถิติ และบทวิเคราะห์",canonical,body,schema}),{headers:{"Content-Type":"text/html; charset=UTF-8"}});
}
