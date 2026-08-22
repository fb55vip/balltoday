export const API = "https://balltoday-content-api.noppdsoma.workers.dev";
export const SITE = "https://www.fb55vip.com";
export function esc(v=""){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
export function jsonLd(obj){return JSON.stringify(obj).replace(/</g,"\\u003c");}
export function formatDate(v){if(!v)return"";try{return new Intl.DateTimeFormat("th-TH",{dateStyle:"medium",timeStyle:"short",timeZone:"Asia/Bangkok"}).format(new Date(v));}catch{return String(v)}}
export async function getArticles(type="",limit=100){
  const q=new URLSearchParams({limit:String(limit)}); if(type)q.set("type",type);
  const r=await fetch(`${API}/api/articles?${q}`,{headers:{Accept:"application/json"},cf:{cacheTtl:120,cacheEverything:true}});
  if(!r.ok)return[]; const d=await r.json(); return d.articles||[];
}
export async function getArticle(slug){
  const r=await fetch(`${API}/api/articles/${encodeURIComponent(slug)}`,{headers:{Accept:"application/json"},cf:{cacheTtl:60,cacheEverything:true}});
  if(!r.ok)return null; const d=await r.json(); return d.article||null;
}
export function canonicalFor(a){return `${SITE}/article?slug=${encodeURIComponent(a.slug||"")}`}
export function pageShell({title,description,canonical,body,schema,type="website"}){
return `<!doctype html><html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="robots" content="index,follow,max-image-preview:large"><meta name="theme-color" content="#07090d"><title>${esc(title)}</title><meta name="description" content="${esc(description)}"><link rel="canonical" href="${esc(canonical)}"><meta property="og:type" content="${esc(type)}"><meta property="og:locale" content="th_TH"><meta property="og:site_name" content="HN FOOTBALL SCORE"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${esc(canonical)}"><meta property="og:image" content="${SITE}/assets/og-image.png"><meta name="twitter:card" content="summary_large_image"><link rel="stylesheet" href="/assets/css/article-v18.css?v=20260822-seo">${schema?`<script type="application/ld+json">${jsonLd(schema)}</script>`:""}</head><body><header class="article-header"><a href="/">⚽ <strong>HN <span>FOOTBALL SCORE</span></strong></a></header>${body}</body></html>`}
