"use strict";

const API_BASE="https://balltoday-content-api.noppdsoma.workers.dev";
const SITE_URL="https://www.fb55vip.com";
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];

let token=sessionStorage.getItem("balltoday_admin_token")||"";
let articles=[];
let currentType="analysis";
let seoTouched=false;

const ANALYSIS_CATEGORIES=["","พรีเมียร์ลีก","ลาลีกา","เซเรียอา","บุนเดสลีกา","ลีกเอิง","ยูฟ่า แชมเปียนส์ลีก","ยูฟ่า ยูโรปาลีก","ไทยลีก","ฟุตบอลทีมชาติ","อื่น ๆ"];
const NEWS_CATEGORIES=["","ข่าวล่าสุด","พรีเมียร์ลีก","ลาลีกา","เซเรียอา","บุนเดสลีกา","ลีกเอิง","ยูฟ่า แชมเปียนส์ลีก","ฟุตบอลไทย","ตลาดซื้อขาย","ทีมชาติ","ข่าวนักเตะ","อื่น ๆ"];
const EVERGREEN_CATEGORIES=["","กฎฟุตบอล","ศัพท์ฟุตบอล","สถิติฟุตบอล","รายการแข่งขัน","พื้นฐานฟุตบอล","ประวัติฟุตบอล","อื่น ๆ"];

function esc(v=""){return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function localInput(v){if(!v)return"";const d=new Date(v);if(Number.isNaN(d.getTime()))return String(v).slice(0,16);const p=n=>String(n).padStart(2,"0");return`${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`}
function isoOrNull(v){if(!v)return null;const d=new Date(v);return Number.isNaN(d.getTime())?null:d.toISOString()}
function setMessage(el,text,ok=false){if(!el)return;el.textContent=text||"";el.classList.toggle("success",ok)}
function slugify(v){return String(v||"").trim().toLowerCase().normalize("NFKD").replace(/[^\p{L}\p{N}]+/gu,"-").replace(/^-+|-+$/g,"").slice(0,120)}
function shortText(v,max=155){const s=String(v||"").replace(/\s+/g," ").trim();return s.length<=max?s:s.slice(0,max-1).trim()+"…"}

async function api(path,options={}){
  const headers={...(options.headers||{})};
  if(!(options.body instanceof FormData))headers["Content-Type"]="application/json";
  if(token)headers.Authorization=`Bearer ${token}`;
  const res=await fetch(`${API_BASE}${path}`,{...options,headers,cache:"no-store"});
  const data=await res.json().catch(()=>({}));
  if(!res.ok)throw new Error(data.message||`HTTP ${res.status}`);
  return data;
}

function setCategoryOptions(type,selected=""){
  const select=$("#league"); if(!select)return;
  const list=type==="news"?NEWS_CATEGORIES:type==="evergreen"?EVERGREEN_CATEGORIES:ANALYSIS_CATEGORIES;
  select.innerHTML=list.map((v,i)=>`<option value="${esc(v)}">${i===0?(type==="news"?"เลือกหมวดข่าว":type==="evergreen"?"เลือกหมวดความรู้":"เลือกลีก"):esc(v)}</option>`).join("");
  select.value=list.includes(selected)?selected:(selected?"อื่น ๆ":"");
}

function getTeamKeywords(){
  const m=$("#matchName").value.trim();
  if(!m)return[];
  return m.split(/\s+(?:พบ|vs\.?|v)\s+/i).map(x=>x.trim()).filter(Boolean);
}

function buildSeo(force=false){
  if(!$("#seoAuto").checked && !force){updateSeoPreview();return}
  const news=currentType==="news", evergreen=currentType==="evergreen";
  const title=$("#title").value.trim();
  const excerpt=$("#excerpt").value.trim();
  const category=$("#league").value.trim();
  const match=$("#matchName").value.trim();
  const teams=getTeamKeywords();

  const primary=news?"ข่าวฟุตบอล":evergreen?"ความรู้ฟุตบอล":"วิเคราะห์ฟุตบอล";
  const secondary=[news?"ข่าวฟุตบอลวันนี้":evergreen?"กติกาและความรู้ฟุตบอล":"วิเคราะห์ก่อนเกม",news?"ข่าวบอลล่าสุด":evergreen?"คู่มือฟุตบอล":"พรีวิวฟุตบอล",category,...teams].filter(Boolean);
  const unique=[...new Set(secondary)];
  const seoTitle=title?(title.includes("HN FOOTBALL SCORE")?title:`${title} | HN FOOTBALL SCORE`):(news?"ข่าวฟุตบอลล่าสุด | HN FOOTBALL SCORE":evergreen?"ความรู้ฟุตบอล | HN FOOTBALL SCORE":"บทวิเคราะห์ฟุตบอล | HN FOOTBALL SCORE");
  const description=shortText(excerpt||(
    news?`ติดตาม${title||"ข่าวฟุตบอลล่าสุด"} พร้อมรายละเอียดสำคัญกับ HN FOOTBALL SCORE`:evergreen?`${title||"ความรู้ฟุตบอล"} อธิบายหลักการและข้อมูลสำคัญแบบอ่านง่ายจาก HN FOOTBALL SCORE`:
    `วิเคราะห์ก่อนเกม ${match||title||"ฟุตบอลวันนี้"} เจาะรูปเกม จุดชี้ขาด และมุมมอง HN FOOTBALL SCORE`
  ),155);
  const slug=slugify(title||match||`${news?"news":evergreen?"knowledge":"analysis"}-${Date.now()}`);
  const canonical=slug?`${SITE_URL}/article?slug=${encodeURIComponent(slug)}`:"";

  $("#primaryKeyword").value=primary;
  $("#secondaryKeywords").value=unique.join(", ");
  $("#seoTitle").value=seoTitle.slice(0,160);
  $("#metaDescription").value=description;
  $("#slug").value=slug;
  $("#canonicalUrl").value=canonical;
  $("#ogTitle").value=seoTitle.slice(0,160);
  $("#ogDescription").value=description;
  if(!$("#ogImage").value.trim())$("#ogImage").value=$("#imageUrl").value.trim();
  updateSeoPreview();
}

function updateSeoPreview(){
  $("#seoPreviewTitle").textContent=$("#seoTitle").value.trim()||"HN FOOTBALL SCORE";
  $("#seoPreviewUrl").textContent=$("#canonicalUrl").value.trim()||"www.fb55vip.com";
  $("#seoPreviewDescription").textContent=$("#metaDescription").value.trim()||"ตัวอย่างผลค้นหา Google จะแสดงตรงนี้";
  renderSeoGuard();
}

["title","matchName","excerpt","league","imageUrl"].forEach(id=>{
  document.addEventListener("input",e=>{if(e.target?.id===id && $("#seoAuto")?.checked)buildSeo()});
  document.addEventListener("change",e=>{if(e.target?.id===id && $("#seoAuto")?.checked)buildSeo()});
});
["primaryKeyword","secondaryKeywords","seoTitle","metaDescription","slug","canonicalUrl","ogTitle","ogDescription","ogImage"].forEach(id=>{
  document.addEventListener("input",e=>{if(e.target?.id===id){seoTouched=true;updateSeoPreview()}});
});
document.addEventListener("change",e=>{if(e.target?.id==="seoAuto"){if(e.target.checked)buildSeo(true)}});


function normalizeForCompare(v){
  return String(v||"").toLowerCase().replace(/\s+/g," ").trim();
}

function keywordStuffingScore(text, keywords){
  const hay=normalizeForCompare(text);
  if(!hay)return 0;
  const words=hay.split(/\s+/).length||1;
  let hits=0;
  for(const k of keywords){
    const key=normalizeForCompare(k);
    if(!key)continue;
    let pos=0;
    while((pos=hay.indexOf(key,pos))!==-1){hits++;pos+=Math.max(1,key.length)}
  }
  return (hits/words)*100;
}

function getSeoGuardResult(){
  const currentId=String($("#articleId").value||"");
  const title=$("#title").value.trim();
  const seoTitle=$("#seoTitle").value.trim();
  const desc=$("#metaDescription").value.trim();
  const slug=$("#slug").value.trim();
  const primary=$("#primaryKeyword").value.trim();
  const secondary=$("#secondaryKeywords").value.split(",").map(x=>x.trim()).filter(Boolean);
  const content=[$("#title").value,$("#excerpt").value,$("#content").value].join(" ");
  const list=[];
  let score=100;

  const add=(status,text,penalty=0)=>{
    list.push({status,text});
    if(status!=="ok")score-=penalty;
  };

  if(!title)add("bad","ยังไม่มีหัวข้อบทความ",20);
  else add("ok","มีหัวข้อบทความ");

  if(seoTitle.length>=35 && seoTitle.length<=65)add("ok","SEO Title อยู่ในช่วงที่อ่านง่าย");
  else if(seoTitle.length>0)add("warn",`SEO Title ยาว ${seoTitle.length} ตัวอักษร แนะนำประมาณ 35–65`,8);
  else add("bad","ยังไม่มี SEO Title",15);

  if(desc.length>=110 && desc.length<=165)add("ok","Meta Description อยู่ในช่วงเหมาะสม");
  else if(desc.length>0)add("warn",`Meta Description ยาว ${desc.length} ตัวอักษร แนะนำประมาณ 110–165`,8);
  else add("bad","ยังไม่มี Meta Description",15);

  if(slug)add("ok","มี URL Slug");
  else add("bad","ยังไม่มี URL Slug",12);

  const sameSlug=articles.some(a=>String(a.id)!==currentId && normalizeForCompare(a.slug)===normalizeForCompare(slug) && slug);
  if(sameSlug)add("bad","Slug ซ้ำกับบทความอื่น ระบบ Worker จะเปลี่ยนให้อัตโนมัติ แต่ควรแก้ก่อนเผยแพร่",12);
  else if(slug)add("ok","Slug ไม่ซ้ำในรายการที่โหลดอยู่");

  const sameTitle=articles.some(a=>String(a.id)!==currentId && normalizeForCompare(a.seo_title||a.title)===normalizeForCompare(seoTitle) && seoTitle);
  if(sameTitle)add("bad","SEO Title ซ้ำกับบทความอื่น",12);
  else if(seoTitle)add("ok","SEO Title ไม่ซ้ำในรายการที่โหลดอยู่");

  const sameDesc=articles.some(a=>String(a.id)!==currentId && normalizeForCompare(a.meta_description)===normalizeForCompare(desc) && desc);
  if(sameDesc)add("warn","Meta Description ซ้ำกับบทความอื่น",8);
  else if(desc)add("ok","Meta Description ไม่ซ้ำในรายการที่โหลดอยู่");

  if(primary)add("ok",`คีย์หลัก: ${primary}`);
  else add("warn","ยังไม่มีคีย์หลัก",6);

  const kwDensity=keywordStuffingScore(content,[primary,...secondary]);
  if(kwDensity>10)add("bad","คีย์เวิร์ดซ้ำถี่เกินไปในเนื้อหา ควรเขียนให้เป็นธรรมชาติ",15);
  else if(kwDensity>6)add("warn","คีย์เวิร์ดค่อนข้างถี่ ควรตรวจภาษาก่อนเผยแพร่",8);
  else add("ok","ไม่พบสัญญาณยัดคีย์เวิร์ดมากเกินไป");

  if($("#content").value.trim().length>=350)add("ok","เนื้อหามีความยาวเพียงพอสำหรับบทความ");
  else add("warn","เนื้อหาค่อนข้างสั้น ควรเพิ่มรายละเอียดที่มีประโยชน์",7);

  score=Math.max(0,Math.min(100,Math.round(score)));
  return{score,list,blocked:list.some(x=>x.status==="bad")};
}

function renderSeoGuard(){
  const box=$("#seoGuardList"),scoreEl=$("#seoGuardScore");
  if(!box||!scoreEl)return;
  const r=getSeoGuardResult();
  box.innerHTML=r.list.map(x=>`<li class="${x.status}">${x.status==="ok"?"✓":x.status==="warn"?"⚠":"✕"} <span>${esc(x.text)}</span></li>`).join("");
  scoreEl.textContent=`${r.score}/100`;
  scoreEl.className="seo-score "+(r.score>=85?"good":r.score>=65?"warn":"bad");
}

function showLogin(){$("#dashboardView").hidden=true;$("#loginView").hidden=false}
async function showDashboard(){$("#loginView").hidden=true;$("#dashboardView").hidden=false;await loadArticles();setAdminTab("dashboard")}
function statusLabel(a){if(a.effective_status==="published"||a.status==="published")return["published","เผยแพร่"];if(a.status==="scheduled")return["scheduled","ตั้งเวลา"];return["draft","ฉบับร่าง"]}

function setEditorMode(type){
  currentType=["news","evergreen"].includes(type)?type:"analysis";
  $("#contentType").value=currentType;
  const news=currentType==="news", evergreen=currentType==="evergreen";
  $(".admin-grid").classList.toggle("news-mode",news||evergreen);
  $("#editorTitle").textContent=news?"เพิ่มข่าวฟุตบอลใหม่":evergreen?"เพิ่มบทความความรู้ใหม่":"เพิ่มบทวิเคราะห์ใหม่";
  $("#titleLabel").textContent=news?"หัวข้อข่าว":evergreen?"หัวข้อความรู้ฟุตบอล":"หัวข้อบทวิเคราะห์";
  $("#leagueLabel").textContent=news?"หมวดข่าว":evergreen?"หมวดความรู้":"ลีก";
  $("#excerptLabel").textContent=news?"คำโปรยข่าว":evergreen?"คำเกริ่นบทความ":"คำเกริ่น";
  $("#contentLabel").textContent=news?"เนื้อหาข่าว":evergreen?"เนื้อหาความรู้ฟุตบอล":"เนื้อหาบทวิเคราะห์";
  $("#featuredLabel").textContent=news?"ปักหมุดข่าวนี้":evergreen?"ปักหมุดบทความนี้":"ปักหมุดบทวิเคราะห์นี้";
  $("#saveButton").textContent=news?"บันทึกข่าว":evergreen?"บันทึกความรู้":"บันทึกบทวิเคราะห์";
  $("#libraryTitle").textContent=news?"ข่าวฟุตบอลทั้งหมด":evergreen?"ความรู้ฟุตบอลทั้งหมด":"บทวิเคราะห์ทั้งหมด";
  $("#searchInput").placeholder=news?"ค้นหาหัวข้อข่าวหรือหมวดข่าว":evergreen?"ค้นหาหัวข้อความรู้หรือหมวด":"ค้นหาหัวข้อ คู่แข่งขัน หรือลีก";
  setCategoryOptions(currentType);
  resetForm(false);
  renderCurrentStats();
  render();
}

function setAdminTab(name){
  $$("[data-admin-tab]").forEach(b=>b.classList.toggle("active",b.dataset.adminTab===name));
  $$("[data-admin-panel]").forEach(p=>p.hidden=p.dataset.adminPanel!==name);
  if(name==="analysis"){
    setEditorMode("analysis");
    const panel=$('[data-admin-panel="analysis"]');
    panel.hidden=false;
    const grid=$(".admin-grid");
    if(grid&&panel&&!panel.contains(grid))panel.appendChild(grid);
  }
  if(name==="news"){
    setEditorMode("news");
    const grid=$(".admin-grid"),mount=$("#newsAdminMount");
    if(grid&&mount)mount.appendChild(grid);
  }
  if(name==="evergreen"){
    setEditorMode("evergreen");
    const grid=$(".admin-grid"),mount=$("#evergreenAdminMount");
    if(grid&&mount)mount.appendChild(grid);
  }
  if(name==="popup")loadPopup();
}

$$("[data-admin-tab]").forEach(b=>b.addEventListener("click",()=>setAdminTab(b.dataset.adminTab)));
$$("[data-go-tab]").forEach(b=>b.addEventListener("click",()=>setAdminTab(b.dataset.goTab)));
$("#openNewsEditor")?.addEventListener("click",()=>{setAdminTab("news");window.scrollTo({top:0,behavior:"smooth"})});
$("#openEvergreenEditor")?.addEventListener("click",()=>{setAdminTab("evergreen");window.scrollTo({top:0,behavior:"smooth"})});

function renderStats(s={}){
  $("#statTotal").textContent=s.total||0;$("#statPublished").textContent=s.published||0;
  $("#statScheduled").textContent=s.scheduled||0;$("#statDraft").textContent=s.draft||0;$("#statFeatured").textContent=s.featured||0;
}
function renderCurrentStats(){
  const scoped=articles.filter(a=>(a.content_type||"analysis")===currentType);
  renderStats({
    total:scoped.length,
    published:scoped.filter(a=>a.effective_status==="published").length,
    scheduled:scoped.filter(a=>a.status==="scheduled"&&a.effective_status!=="published").length,
    draft:scoped.filter(a=>a.status==="draft").length,
    featured:scoped.filter(a=>a.featured).length
  });
}

function resetForm(clearMessage=true){
  $("#articleForm").reset();
  setCategoryOptions(currentType);
  $("#articleId").value="";
  $("#contentType").value=currentType;
  $("#confidence").value="70";
  $("#status").value="draft";
  $("#publishAtWrap").hidden=true;
  $("#coverPreview").hidden=true;$("#coverPreview").removeAttribute("src");
  $("#seoAuto").checked=true;seoTouched=false;
  ["primaryKeyword","secondaryKeywords","seoTitle","metaDescription","slug","canonicalUrl","ogTitle","ogDescription","ogImage"].forEach(id=>$("#"+id).value="");
  $("#editorTitle").textContent=currentType==="news"?"เพิ่มข่าวฟุตบอลใหม่":currentType==="evergreen"?"เพิ่มบทความความรู้ใหม่":"เพิ่มบทวิเคราะห์ใหม่";
  buildSeo(true);
  if(clearMessage)setMessage($("#editorMessage"),"");
}

function render(){
  const q=$("#searchInput").value.trim().toLowerCase(),f=$("#statusFilter").value;
  const list=articles.filter(a=>{
    const type=(a.content_type||"analysis");
    const text=`${a.title||""} ${a.league||""} ${a.match_name||""} ${a.primary_keyword||""} ${a.secondary_keywords||""}`.toLowerCase();
    return type===currentType&&(!q||text.includes(q))&&(!f||a.status===f);
  });
  const box=$("#articleList");
  if(!list.length){box.innerHTML=`<div class="empty">ยังไม่มี${currentType==="news"?"ข่าวฟุตบอล":currentType==="evergreen"?"บทความความรู้":"บทวิเคราะห์"}ที่ตรงกับตัวกรอง</div>`;return}
  box.innerHTML=list.map(a=>{
    const[s,l]=statusLabel(a);
    return `<article class="article-item">
      <div class="article-top"><div>
        <div class="article-type">${(a.content_type||"analysis")==="news"?"📰 ข่าวฟุตบอล":(a.content_type||"analysis")==="evergreen"?"📚 ความรู้ฟุตบอล":"📝 บทวิเคราะห์"}</div>
        <h3>${esc(a.title)}</h3>
        <div class="article-meta"><span class="badge ${s}">${l}</span>${a.featured?'<span class="badge featured">📌 ปักหมุด</span>':""}<span>${esc(a.league||"ไม่ระบุหมวด")}</span>${a.match_name?`<span>${esc(a.match_name)}</span>`:""}</div>
        ${a.primary_keyword?`<div class="article-meta seo-meta">SEO: ${esc(a.primary_keyword)} • ${esc(a.slug||"")}</div>`:""}
      </div>${currentType==="analysis"?`<strong>${Number(a.confidence||0)}%</strong>`:""}</div>
      <div class="article-meta"><span>แก้ไขล่าสุด: ${esc(a.updated_at||"")}</span>${a.publish_at?`<span>เผยแพร่: ${esc(a.publish_at)}</span>`:""}</div>
      <div class="article-actions"><button class="ghost" data-preview="${a.id}">ดูตัวอย่าง</button><button class="ghost" data-edit="${a.id}">แก้ไข</button><button class="ghost danger" data-delete="${a.id}">ลบ</button></div>
    </article>`;
  }).join("");
}

async function loadArticles(){
  try{
    $("#articleList").innerHTML='<div class="spinner"></div>';
    const d=await api("/api/admin/articles");
    articles=d.articles||[];
    renderCurrentStats();render();renderSeoGuard();
  }catch(e){
    if(/เข้าสู่ระบบ|session|unauthorized/i.test(e.message)){token="";sessionStorage.removeItem("balltoday_admin_token");showLogin()}
    else setMessage($("#editorMessage"),e.message);
  }
}

function articleFromForm(){
  const news=currentType==="news", evergreen=currentType==="evergreen";
  if($("#seoAuto").checked && !seoTouched)buildSeo(true);
  return{
    content_type:currentType,
    title:$("#title").value.trim(),league:$("#league").value,
    match_name:(news||evergreen)?null:$("#matchName").value.trim(),
    match_time:(news||evergreen)?null:isoOrNull($("#matchTime").value),
    confidence:(news||evergreen)?0:Number($("#confidence").value||0),
    image_url:$("#imageUrl").value.trim(),
    excerpt:$("#excerpt").value.trim(),content:$("#content").value.trim(),
    status:$("#status").value,publish_at:isoOrNull($("#publishAt").value),featured:$("#featured").checked,
    primary_keyword:$("#primaryKeyword").value.trim(),
    secondary_keywords:$("#secondaryKeywords").value.trim(),
    seo_title:$("#seoTitle").value.trim(),
    meta_description:$("#metaDescription").value.trim(),
    slug:$("#slug").value.trim(),
    canonical_url:$("#canonicalUrl").value.trim(),
    og_title:$("#ogTitle").value.trim(),
    og_description:$("#ogDescription").value.trim(),
    og_image:$("#ogImage").value.trim()||$("#imageUrl").value.trim()
  };
}

function fillForm(a){
  currentType=["news","evergreen"].includes(a.content_type)?a.content_type:"analysis";
  $("#contentType").value=currentType;$(".admin-grid").classList.toggle("news-mode",currentType!=="analysis");
  $("#articleId").value=a.id;$("#title").value=a.title||"";setCategoryOptions(currentType,a.league||"");
  $("#matchName").value=a.match_name||"";$("#matchTime").value=localInput(a.match_time);$("#confidence").value=a.confidence||0;
  $("#imageUrl").value=a.image_url||"";$("#excerpt").value=a.excerpt||"";$("#content").value=a.content||"";
  $("#status").value=a.status||"draft";$("#publishAt").value=localInput(a.publish_at);$("#publishAtWrap").hidden=a.status!=="scheduled";$("#featured").checked=!!a.featured;
  $("#primaryKeyword").value=a.primary_keyword||"";$("#secondaryKeywords").value=a.secondary_keywords||"";
  $("#seoTitle").value=a.seo_title||"";$("#metaDescription").value=a.meta_description||"";$("#slug").value=a.slug||"";
  $("#canonicalUrl").value=a.canonical_url||"";$("#ogTitle").value=a.og_title||"";$("#ogDescription").value=a.og_description||"";$("#ogImage").value=a.og_image||a.image_url||"";
  $("#seoAuto").checked=!(a.seo_title||a.primary_keyword);seoTouched=!!(a.seo_title||a.primary_keyword);
  $("#editorTitle").textContent=currentType==="news"?"แก้ไขข่าวฟุตบอล":currentType==="evergreen"?"แก้ไขความรู้ฟุตบอล":"แก้ไขบทวิเคราะห์";
  updateCoverPreview();updateSeoPreview();window.scrollTo({top:0,behavior:"smooth"});
}

function openPreview(a){
  const image=a.image_url||"";
  $("#previewImage").hidden=!image;if(image)$("#previewImage").src=image;
  $("#previewLeague").textContent=a.league||(currentType==="news"?"ข่าวฟุตบอล":currentType==="evergreen"?"ความรู้ฟุตบอล":"บทวิเคราะห์");
  $("#previewTitle").textContent=a.title||"ตัวอย่าง";
  $("#previewMeta").textContent=currentType==="news"?"ข่าวฟุตบอล":currentType==="evergreen"?"ความรู้ฟุตบอล":[a.match_name,a.match_time?new Date(a.match_time).toLocaleString("th-TH"):"",`ความมั่นใจ ${Number(a.confidence||0)}%`].filter(Boolean).join(" • ");
  $("#previewExcerpt").textContent=a.excerpt||"";$("#previewContent").textContent=a.content||"";$("#previewModal").showModal();
}
function updateCoverPreview(){const u=$("#imageUrl").value.trim(),img=$("#coverPreview");img.hidden=!u;if(u)img.src=u}

$("#loginForm").addEventListener("submit",async e=>{e.preventDefault();const b=$("#loginButton");b.disabled=true;try{const d=await api("/api/admin/login",{method:"POST",body:JSON.stringify({username:$("#username").value,password:$("#password").value})});token=d.token;sessionStorage.setItem("balltoday_admin_token",token);setMessage($("#loginMessage"),"");await showDashboard()}catch(err){setMessage($("#loginMessage"),err.message)}finally{b.disabled=false}});
$("#logoutButton").onclick=()=>{token="";sessionStorage.removeItem("balltoday_admin_token");showLogin()};
$("#refreshArticles").onclick=loadArticles;$("#resetButton").onclick=()=>resetForm();
$("#searchInput").oninput=render;$("#statusFilter").onchange=render;
$("#status").onchange=()=>{$("#publishAtWrap").hidden=$("#status").value!=="scheduled"};
$("#imageUrl").oninput=()=>{updateCoverPreview();if($("#seoAuto").checked&&!seoTouched)buildSeo()};
$("#previewButton").onclick=()=>openPreview(articleFromForm());
$("#closePreview").onclick=()=>$("#previewModal").close();
$("#previewModal").addEventListener("click",e=>{if(e.target===$("#previewModal"))$("#previewModal").close()});

$("#articleList").addEventListener("click",async e=>{
  const p=e.target.closest("[data-preview]"),ed=e.target.closest("[data-edit]"),del=e.target.closest("[data-delete]");
  if(p){const a=articles.find(x=>String(x.id)===p.dataset.preview);if(a)openPreview(a)}
  if(ed){const a=articles.find(x=>String(x.id)===ed.dataset.edit);if(a)fillForm(a)}
  if(del&&confirm("ยืนยันลบรายการนี้?")){try{await api(`/api/admin/articles/${del.dataset.delete}`,{method:"DELETE"});await loadArticles()}catch(err){alert(err.message)}}
});

$("#articleForm").addEventListener("submit",async e=>{
  e.preventDefault();
  const id=$("#articleId").value,payload=articleFromForm();
  renderSeoGuard();
  const guard=getSeoGuardResult();
  if(payload.status!=="draft" && guard.blocked){
    setMessage($("#editorMessage"),"SEO Guard พบจุดสำคัญที่ต้องแก้ก่อนเผยแพร่ กรุณาตรวจรายการสีแดง",false);
    return;
  }
  if(payload.status==="scheduled"&&!payload.publish_at){setMessage($("#editorMessage"),"กรุณาระบุเวลาเผยแพร่");return}
  const b=$("#saveButton");b.disabled=true;
  try{
    const d=await api(id?`/api/admin/articles/${id}`:"/api/admin/articles",{method:id?"PUT":"POST",body:JSON.stringify(payload)});
    setMessage($("#editorMessage"),currentType==="news"?"บันทึกข่าว + SEO เรียบร้อย":currentType==="evergreen"?"บันทึกความรู้ + SEO เรียบร้อย":"บันทึกบทวิเคราะห์ + SEO เรียบร้อย",true);
    resetForm(false);await loadArticles();
  }catch(err){setMessage($("#editorMessage"),err.message)}
  finally{b.disabled=false}
});

/* Popup ทีเด็ดวันนี้ — คง logic เดิม */
function popupFromForm(){return{enabled:$("#popupEnabled").checked,title:$("#popupTitle").value.trim(),image_url:$("#popupImageUrl").value.trim(),link_url:$("#popupLinkUrl").value.trim(),start_at:isoOrNull($("#popupStartAt").value),end_at:isoOrNull($("#popupEndAt").value),once_per_session:$("#popupOncePerSession").checked}}
function updatePopupPreview(){const u=$("#popupImageUrl").value.trim(),img=$("#popupImagePreview");img.hidden=!u;if(u)img.src=u}
async function loadPopup(){try{const d=await api("/api/admin/popup"),p=d.popup||{};$("#popupEnabled").checked=!!p.enabled;$("#popupTitle").value=p.title||"";$("#popupImageUrl").value=p.image_url||"";$("#popupLinkUrl").value=p.link_url||"";$("#popupStartAt").value=localInput(p.start_at);$("#popupEndAt").value=localInput(p.end_at);$("#popupOncePerSession").checked=p.once_per_session!==false;updatePopupPreview();setMessage($("#popupMessage"),"")}catch(e){setMessage($("#popupMessage"),e.message)}}
$("#popupImageUrl").oninput=updatePopupPreview;$("#refreshPopup").onclick=loadPopup;
$("#popupPreviewButton").onclick=()=>{const u=$("#popupImageUrl").value.trim();if(u)window.open(u,"_blank","noopener");else setMessage($("#popupMessage"),"กรุณาใส่ URL รูปก่อน")};
$("#popupForm").addEventListener("submit",async e=>{e.preventDefault();const p=popupFromForm();if(p.enabled&&!p.image_url){setMessage($("#popupMessage"),"กรุณาใส่ URL รูป Popup");return}const b=$("#savePopupButton");b.disabled=true;try{await api("/api/admin/popup",{method:"PUT",body:JSON.stringify(p)});setMessage($("#popupMessage"),"บันทึก Popup เรียบร้อย",true)}catch(err){setMessage($("#popupMessage"),err.message)}finally{b.disabled=false}});

if(token)showDashboard();else showLogin();
