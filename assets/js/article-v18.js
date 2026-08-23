"use strict";
const API="https://balltoday-content-api.noppdsoma.workers.dev";
const SITE="https://www.fb55vip.com";
const esc=(v="")=>String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function meta(sel,attr,val){let n=document.querySelector(sel);if(!n){n=document.createElement("meta");if(attr==="name")n.name=sel.replace(/^meta\[name=['"]?|['"]?\]$/g,"");document.head.appendChild(n)}n.setAttribute("content",val||"")}
function setAttr(selector,attr,value){const n=document.querySelector(selector);if(n)n.setAttribute(attr,value||"")}
function date(v){if(!v)return"";const d=new Date(v);return Number.isNaN(d)?v:d.toLocaleString("th-TH",{dateStyle:"long",timeStyle:"short"})}
function canonicalUrl(value,slug){try{const u=new URL(value||`${SITE}/article?slug=${encodeURIComponent(slug)}`,SITE);if(u.hostname==="fb55vip.com")u.hostname="www.fb55vip.com";if(u.origin===SITE)return u.href}catch{}return `${SITE}/article?slug=${encodeURIComponent(slug)}`}
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
    const canonical=canonicalUrl(a.canonical_url,a.slug||slug);
    const image=a.og_image||a.image_url||`${SITE}/assets/og-image.jpg`;
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
    const section=a.content_type==="news"?{name:"ข่าวฟุตบอล",url:`${SITE}/news`}:a.content_type==="evergreen"?{name:"ความรู้ฟุตบอล",url:`${SITE}/knowledge`}:{name:"บทวิเคราะห์",url:`${SITE}/analysis`};
    const schema={"@context":"https://schema.org","@type":a.content_type==="news"?"NewsArticle":"Article","headline":a.title,"description":desc,"image":image?[image]:[],"datePublished":a.publish_at||a.published_at||a.created_at,"dateModified":a.updated_at||a.publish_at||a.created_at,"author":{"@type":"Person","name":a.author||"บอส สิทธิกร","url":`${SITE}/author.html`},"publisher":{"@type":"Organization","name":"HN FOOTBALL SCORE","url":SITE,"logo":{"@type":"ImageObject","url":`${SITE}/assets/icons/icon.svg`}},"mainEntityOfPage":{"@type":"WebPage","@id":canonical}};
    document.getElementById("articleSchema").textContent=JSON.stringify(schema);
    const breadcrumb={"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"หน้าแรก","item":`${SITE}/`},{"@type":"ListItem","position":2,"name":section.name,"item":section.url},{"@type":"ListItem","position":3,"name":a.title,"item":canonical}]};
    const breadcrumbNode=document.createElement("script");breadcrumbNode.type="application/ld+json";breadcrumbNode.textContent=JSON.stringify(breadcrumb);document.head.appendChild(breadcrumbNode);
    box.innerHTML=`${image?`<img class="cover" src="${esc(image)}" alt="${esc(a.title||"")}">`:""}<div class="body"><div class="kicker">${esc(a.league||section.name)}</div><h1>${esc(a.title||"")}</h1><div class="meta"><span>โดย <a href="/author.html" rel="author">${esc(a.author||"บอส สิทธิกร")}</a></span><span aria-hidden="true">•</span>${a.match_name?`<span>${esc(a.match_name)}</span>`:""}${a.match_time?`<span>${esc(date(a.match_time))}</span>`:""}${a.content_type!=="news"&&a.confidence?`<span>ความมั่นใจ ${Number(a.confidence)}%</span>`:""}${a.publish_at||a.published_at?`<span>เผยแพร่ ${esc(date(a.publish_at||a.published_at))}</span>`:""}</div>${a.excerpt?`<p class="lead">${esc(a.excerpt)}</p>`:""}<div class="content">${esc(a.content||"")}</div><div class="brand-foot">HN FOOTBALL SCORE • www.fb55vip.com</div></div>`;
  }catch(e){box.innerHTML=`<div class="error">${esc(e.message||"โหลดบทความไม่สำเร็จ")}</div>`}
})();
