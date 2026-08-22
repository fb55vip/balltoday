"use strict";
const API="https://balltoday-content-api.noppdsoma.workers.dev";
const SITE="https://www.fb55vip.com";
const esc=(v="")=>String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function meta(sel,attr,val){let n=document.querySelector(sel);if(!n){n=document.createElement("meta");if(attr==="name")n.name=sel.replace(/^meta\[name=['"]?|['"]?\]$/g,"");document.head.appendChild(n)}n.setAttribute("content",val||"")}
function setAttr(selector,attr,value){const n=document.querySelector(selector);if(n)n.setAttribute(attr,value||"")}
function date(v){if(!v)return"";const d=new Date(v);return Number.isNaN(d)?v:d.toLocaleString("th-TH",{dateStyle:"long",timeStyle:"short"})}
(async()=>{
  const box=document.getElementById("articleView");
  const slug=new URLSearchParams(location.search).get("slug")||"";
  if(!slug){box.innerHTML='<div class="error">ไม่พบบทความ</div>';return}
  try{
    const r=await fetch(`${API}/api/articles/${encodeURIComponent(slug)}`,{headers:{Accept:"application/json"},cache:"no-store"});
    const d=await r.json();if(!r.ok)throw new Error(d.message||"โหลดไม่สำเร็จ");
    const a=d.article||{};
    const title=a.seo_title||a.title||"HN FOOTBALL SCORE";
    const desc=a.meta_description||a.excerpt||"ข่าวฟุตบอลและบทวิเคราะห์ HN FOOTBALL SCORE";
    const canonical=a.canonical_url||`${SITE}/article?slug=${encodeURIComponent(a.slug||slug)}`;
    const image=a.og_image||a.image_url||`${SITE}/assets/og-image.png`;
    document.title=title;
    document.querySelector('meta[name="description"]').content=desc;
    const twTitle=document.querySelector('meta[name="twitter:title"]')||document.head.appendChild(Object.assign(document.createElement("meta"),{name:"twitter:title"})); twTitle.content=a.og_title||title;
    const twDesc=document.querySelector('meta[name="twitter:description"]')||document.head.appendChild(Object.assign(document.createElement("meta"),{name:"twitter:description"})); twDesc.content=a.og_description||desc;
    const twImg=document.querySelector('meta[name="twitter:image"]')||document.head.appendChild(Object.assign(document.createElement("meta"),{name:"twitter:image"})); twImg.content=image;
    document.querySelector('link[rel="canonical"]').href=canonical;
    ["og:title","og:description","og:url","og:image"].forEach(p=>{
      const n=document.querySelector(`meta[property="${p}"]`);
      if(n)n.content=({["og:title"]:a.og_title||title,["og:description"]:a.og_description||desc,["og:url"]:canonical,["og:image"]:image})[p];
    });
    const schema={"@context":"https://schema.org","@type":a.content_type==="news"?"NewsArticle":"Article","headline":a.title,"description":desc,"image":image?[image]:[],"datePublished":a.publish_at||a.published_at||a.created_at,"dateModified":a.updated_at||a.publish_at||a.created_at,"author":{"@type":"Person","name":a.author||"บอส สิทธิกร"},"publisher":{"@type":"Organization","name":"HN FOOTBALL SCORE","url":SITE},"mainEntityOfPage":canonical};
    document.getElementById("articleSchema").textContent=JSON.stringify(schema);
    box.innerHTML=`${image?`<img class="cover" src="${esc(image)}" alt="${esc(a.title||"")}">`:""}<div class="body"><div class="kicker">${esc(a.league||(a.content_type==="news"?"ข่าวฟุตบอล":"บทวิเคราะห์"))}</div><h1>${esc(a.title||"")}</h1><div class="meta">${a.match_name?`<span>${esc(a.match_name)}</span>`:""}${a.match_time?`<span>${esc(date(a.match_time))}</span>`:""}${a.content_type!=="news"&&a.confidence?`<span>ความมั่นใจ ${Number(a.confidence)}%</span>`:""}${a.publish_at||a.published_at?`<span>เผยแพร่ ${esc(date(a.publish_at||a.published_at))}</span>`:""}</div>${a.excerpt?`<p class="lead">${esc(a.excerpt)}</p>`:""}<div class="content">${esc(a.content||"")}</div><div class="brand-foot">HN FOOTBALL SCORE • www.fb55vip.com</div></div>`;
  }catch(e){box.innerHTML=`<div class="error">${esc(e.message||"โหลดบทความไม่สำเร็จ")}</div>`}
})();
