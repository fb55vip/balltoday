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
export async function getArticlePage(type,page=1,limit=6){
  const q=new URLSearchParams({limit:String(limit),page:String(page)}); if(type)q.set("type",type);
  const r=await fetch(`${API}/api/articles?${q}`,{headers:{Accept:"application/json"},cf:{cacheTtl:120,cacheEverything:true}});
  if(!r.ok)return{items:[],total:0,totalPages:1};
  const d=await r.json();
  const total=Math.max(0,Number(d.total)||0),totalPages=Math.max(1,Number(d.total_pages)||Math.ceil(total/limit)||1);
  return{items:d.articles||[],total,totalPages};
}
export async function getArticle(slug){
  const r=await fetch(`${API}/api/articles/${encodeURIComponent(slug)}`,{headers:{Accept:"application/json"},cf:{cacheTtl:60,cacheEverything:true}});
  if(!r.ok)return null; const d=await r.json(); return d.article||null;
}
export function canonicalFor(a){return `${SITE}/article?slug=${encodeURIComponent(a.slug||"")}`}
export function pageNumber(request){const n=Number(new URL(request.url).searchParams.get("page")||1);return Number.isInteger(n)&&n>0?n:1}
export function pageUrl(base,page){return page<=1?`${SITE}${base}`:`${SITE}${base}?page=${page}`}
export function pagination(current,totalPages,base){
  if(totalPages<=1)return"";
  const pages=new Set([1,totalPages,current-1,current,current+1]);
  const ordered=[...pages].filter(n=>n>=1&&n<=totalPages).sort((a,b)=>a-b);
  let last=0,links="";
  for(const n of ordered){if(last&&n-last>1)links+=`<span class="page-gap" aria-hidden="true">…</span>`;links+=n===current?`<span class="page-link active" aria-current="page">${n}</span>`:`<a class="page-link" href="${base}${n===1?"":`?page=${n}`}">${n}</a>`;last=n}
  return `<nav class="pagination" aria-label="หน้ารายการบทความ">${current>1?`<a class="page-link page-nav" rel="prev" href="${base}${current-1===1?"":`?page=${current-1}`}">ก่อนหน้า</a>`:""}${links}${current<totalPages?`<a class="page-link page-nav" rel="next" href="${base}?page=${current+1}">ถัดไป</a>`:""}</nav>`;
}
export function pageShell({title,description,canonical,body,schema,type="website",prev="",next=""}){
return `<!doctype html><html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="robots" content="index,follow,max-image-preview:large"><meta name="theme-color" content="#07090d"><title>${esc(title)}</title><meta name="description" content="${esc(description)}"><link rel="canonical" href="${esc(canonical)}">${prev?`<link rel="prev" href="${esc(prev)}">`:""}${next?`<link rel="next" href="${esc(next)}">`:""}<meta property="og:type" content="${esc(type)}"><meta property="og:locale" content="th_TH"><meta property="og:site_name" content="HN FOOTBALL SCORE"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${esc(canonical)}"><meta property="og:image" content="${SITE}/assets/og-image.png"><meta name="twitter:card" content="summary_large_image"><link rel="stylesheet" href="/assets/css/article-v18.css?v=20260822-pagination">${schema?`<script type="application/ld+json">${jsonLd(schema)}</script>`:""}</head><body><header class="article-header"><a href="/">⚽ <strong>HN <span>FOOTBALL SCORE</span></strong></a></header>${body}</body></html>`}
