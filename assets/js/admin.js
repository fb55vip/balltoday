"use strict";

const SOCIAL_ICONS={facebook:"f",line:"L",instagram:"◎",tiktok:"♪",youtube:"▶",x:"X",other:"↗"};
let socialLinks=[];

function proMessage(id,text,ok=false){const el=document.getElementById(id);if(!el)return;el.textContent=text||"";el.classList.toggle("success",ok)}
function safeExternalUrl(value){try{const url=new URL(value);return ["http:","https:"].includes(url.protocol)?url.toString():""}catch{return""}}

function resetSocialForm(){
  $("#socialLinkForm")?.reset();$("#socialLinkId").value="";$("#socialActive").checked=true;$("#socialShowFooter").checked=true;$("#socialShowArticle").checked=true;$("#socialSortOrder").value="0";$("#saveSocialLink").textContent="บันทึกลิงก์";proMessage("socialMessage","");
}

function renderSocialLinks(){
  const box=$("#socialLinksList");if(!box)return;
  if(!socialLinks.length){box.innerHTML='<div class="empty">ยังไม่มีลิงก์ Social Media</div>';return}
  box.innerHTML=socialLinks.map(item=>`<article class="social-link-card"><div><h3><span class="platform-icon">${SOCIAL_ICONS[item.platform]||"↗"}</span>${esc(item.label||item.platform)}</h3><p>${esc(item.url)}</p><p>${item.active?"เปิดใช้งาน":"ปิดใช้งาน"} • ลำดับ ${Number(item.sort_order||0)} • ${item.show_footer?"Footer":""} ${item.show_article?"บทความ":""}</p></div><div class="social-link-actions"><button class="ghost" type="button" data-social-edit="${item.id}">แก้ไข</button><button class="ghost danger" type="button" data-social-delete="${item.id}">ลบ</button></div></article>`).join("");
}

async function loadSocialLinks(){
  if(!signedInUser||signedInUser.role!=="owner")return;
  try{const data=await accountApi("/api/admin/social-links");socialLinks=data.links||[];renderSocialLinks();proMessage("socialMessage","")}catch(error){proMessage("socialMessage",error.message)}
}

$("#socialLinkForm")?.addEventListener("submit",async event=>{
  event.preventDefault();const id=$("#socialLinkId").value,button=$("#saveSocialLink");button.disabled=true;
  try{
    const url=safeExternalUrl($("#socialUrl").value.trim());if(!url)throw new Error("URL ไม่ถูกต้อง");
    const payload={platform:$("#socialPlatform").value,label:$("#socialLabel").value.trim(),url,sort_order:Number($("#socialSortOrder").value||0),active:$("#socialActive").checked,show_footer:$("#socialShowFooter").checked,show_article:$("#socialShowArticle").checked};
    await accountApi(id?`/api/admin/social-links/${id}`:"/api/admin/social-links",{method:id?"PUT":"POST",body:JSON.stringify(payload)});
    resetSocialForm();proMessage("socialMessage","บันทึกลิงก์เรียบร้อย",true);await loadSocialLinks();
  }catch(error){proMessage("socialMessage",error.message)}finally{button.disabled=false}
});
$("#resetSocialLink")?.addEventListener("click",resetSocialForm);
$("#refreshSocialLinks")?.addEventListener("click",loadSocialLinks);
$("#socialLinksList")?.addEventListener("click",async event=>{
  const edit=event.target.closest("[data-social-edit]"),del=event.target.closest("[data-social-delete]");
  if(edit){const item=socialLinks.find(x=>String(x.id)===edit.dataset.socialEdit);if(!item)return;$("#socialLinkId").value=item.id;$("#socialPlatform").value=item.platform;$("#socialLabel").value=item.label;$("#socialUrl").value=item.url;$("#socialSortOrder").value=item.sort_order||0;$("#socialActive").checked=!!item.active;$("#socialShowFooter").checked=!!item.show_footer;$("#socialShowArticle").checked=!!item.show_article;$("#saveSocialLink").textContent="บันทึกการแก้ไข";window.scrollTo({top:0,behavior:"smooth"})}
  if(del&&confirm("ยืนยันลบลิงก์นี้?")){try{await accountApi(`/api/admin/social-links/${del.dataset.socialDelete}`,{method:"DELETE"});await loadSocialLinks()}catch(error){proMessage("socialMessage",error.message)}}
});

function renderAudit(items=[]){
  const box=$("#auditList");if(!box)return;
  if(!items.length){box.innerHTML='<div class="empty">ยังไม่มีประวัติการทำงาน</div>';return}
  box.innerHTML=items.map(item=>`<article class="audit-item"><h3>${esc(item.display_name||item.username||"ระบบ")} • ${esc(item.action)}</h3><p>${esc(item.entity_type)} ${item.entity_id?`#${esc(item.entity_id)}`:""}${item.detail?` • ${esc(item.detail)}`:""}</p><p class="audit-time">${esc(item.created_at||"")}</p></article>`).join("");
}
async function loadAudit(){if(!signedInUser||signedInUser.role!=="owner")return;try{const data=await accountApi("/api/admin/audit?limit=100");renderAudit(data.items||[]);proMessage("auditMessage","")}catch(error){proMessage("auditMessage",error.message)}}
$("#refreshAudit")?.addEventListener("click",loadAudit);

function updateSharePack(){
  const title=$("#title")?.value.trim()||"บทความใหม่",excerpt=$("#excerpt")?.value.trim(),slug=$("#slug")?.value.trim()||slugify(title),type=$("#contentType")?.value||"analysis";
  const source=type==="news"?"news":type==="evergreen"?"knowledge":"analysis";
  const url=`${SITE_URL}/article?slug=${encodeURIComponent(slug)}&utm_source=social&utm_medium=share&utm_campaign=${encodeURIComponent(source)}`;
  $("#shareUrl").value=url;
  if(!$("#shareCaption").dataset.edited)$("#shareCaption").value=[title,excerpt,url,"#HNFOOTBALLSCORE"].filter(Boolean).join("\n\n");
}
async function copyValue(selector,message){const value=$(selector)?.value||"";if(!value)return;try{await navigator.clipboard.writeText(value);proMessage("shareMessage",message,true)}catch{proMessage("shareMessage","คัดลอกไม่สำเร็จ กรุณาเลือกข้อความแล้วคัดลอกเอง")}}
$("#copyShareCaption")?.addEventListener("click",()=>copyValue("#shareCaption","คัดลอกข้อความแล้ว"));
$("#copyShareUrl")?.addEventListener("click",()=>copyValue("#shareUrl","คัดลอกลิงก์แล้ว"));
$("#openFacebookShare")?.addEventListener("click",()=>window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent($("#shareUrl").value)}`,"_blank","noopener"));
$("#openLineShare")?.addEventListener("click",()=>window.open(`https://social-plugins.line.me/lineit/share?url=${encodeURIComponent($("#shareUrl").value)}`,"_blank","noopener"));
$("#shareCaption")?.addEventListener("input",event=>event.currentTarget.dataset.edited="1");
["title","excerpt","slug","contentType"].forEach(id=>document.addEventListener("input",event=>{if(event.target?.id===id)updateSharePack()}));

function renderSeoHealth(){
  const welcome=$(".dashboard-welcome");if(!welcome||$("#seoHealth"))return;
  welcome.insertAdjacentHTML("beforeend",'<div id="seoHealth" class="seo-health"><div><strong id="healthArticles">0</strong><span>บทความทั้งหมด</span></div><div><strong id="healthImages">0</strong><span>มีรูปครบ</span></div><div><strong id="healthMeta">0</strong><span>Meta ครบ</span></div><div><strong id="healthAuthors">0</strong><span>มีผู้เขียน</span></div></div>');
}
function refreshSeoHealth(){renderSeoHealth();const total=articles.length,images=articles.filter(a=>a.image_url||a.cover_image).length,meta=articles.filter(a=>a.seo_title&&a.meta_description&&a.canonical_url).length,authors=articles.filter(a=>a.author&&a.author_user_id).length;$("#healthArticles").textContent=total;$("#healthImages").textContent=`${images}/${total}`;$("#healthMeta").textContent=`${meta}/${total}`;$("#healthAuthors").textContent=`${authors}/${total}`}

document.addEventListener("click",event=>{if(event.target.closest('[data-admin-tab="social"]'))loadSocialLinks();if(event.target.closest('[data-admin-tab="audit"]'))loadAudit();if(event.target.closest('[data-admin-tab="dashboard"]'))refreshSeoHealth()});
$("#refreshArticles")?.addEventListener("click",()=>setTimeout(refreshSeoHealth,500));
setTimeout(()=>{updateSharePack();refreshSeoHealth()},700);
