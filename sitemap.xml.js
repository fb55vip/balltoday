import {SITE,getArticles} from "./_lib/content.js";
function x(v){return String(v||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}
export async function onRequestGet(){
  const [analysis,news,evergreen]=await Promise.all([getArticles("analysis",500),getArticles("news",500),getArticles("evergreen",500)]);
  const base=[`${SITE}/`,`${SITE}/analysis`,`${SITE}/news`,`${SITE}/knowledge`,
    `${SITE}/knowledge/var-football.html`,`${SITE}/knowledge/offside-rule.html`,`${SITE}/knowledge/football-table-points.html`,`${SITE}/knowledge/goal-difference.html`,`${SITE}/knowledge/champions-league-format.html`,`${SITE}/knowledge/yellow-red-cards.html`,`${SITE}/knowledge/extra-time-penalty-shootout.html`,`${SITE}/knowledge/how-to-read-football-stats.html`];
  const rows=[...base.map(loc=>({loc,lastmod:null})),...[...analysis,...news,...evergreen].filter(a=>a.slug).map(a=>({loc:`${SITE}/article?slug=${encodeURIComponent(a.slug)}`,lastmod:a.updated_at||a.publish_at||a.created_at}))];
  const seen=new Set(),clean=rows.filter(r=>!seen.has(r.loc)&&(seen.add(r.loc),true));
  const body=`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${clean.map(r=>`  <url><loc>${x(r.loc)}</loc>${r.lastmod?`<lastmod>${x(new Date(r.lastmod).toISOString())}</lastmod>`:""}</url>`).join("\n")}\n</urlset>`;
  return new Response(body,{headers:{"Content-Type":"application/xml; charset=UTF-8","Cache-Control":"public, max-age=0, s-maxage=300"}})
}
