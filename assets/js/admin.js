"use strict";

const API_BASE="https://balltoday-content-api.noppdsoma.workers.dev";
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];

let token=sessionStorage.getItem("balltoday_admin_token")||"";
let articles=[];
let currentType="analysis";


const ANALYSIS_CATEGORIES = [
  "", "พรีเมียร์ลีก", "ลาลีกา", "เซเรียอา", "บุนเดสลีกา", "ลีกเอิง",
  "ยูฟ่า แชมเปียนส์ลีก", "ยูฟ่า ยูโรปาลีก", "ไทยลีก", "ฟุตบอลทีมชาติ", "อื่น ๆ"
];
const NEWS_CATEGORIES = [
  "", "ข่าวล่าสุด", "พรีเมียร์ลีก", "ลาลีกา", "เซเรียอา", "บุนเดสลีกา", "ลีกเอิง",
  "ยูฟ่า แชมเปียนส์ลีก", "ฟุตบอลไทย", "ตลาดซื้อขาย", "ทีมชาติ", "ข่าวนักเตะ", "อื่น ๆ"
];
function setCategoryOptions(type, selected=""){
  const select=$("#league");
  if(!select)return;
  const list=type==="news"?NEWS_CATEGORIES:ANALYSIS_CATEGORIES;
  select.innerHTML=list.map((v,i)=>`<option value="${esc(v)}">${i===0?(type==="news"?"เลือกหมวดข่าว":"เลือกลีก"):esc(v)}</option>`).join("");
  select.value=list.includes(selected)?selected:(selected?"อื่น ๆ":"");
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

async function api(path,options={}){
  const headers={...(options.headers||{})};
  if(!(options.body instanceof FormData))headers["Content-Type"]="application/json";
  if(token)headers.Authorization=`Bearer ${token}`;
  const res=await fetch(`${API_BASE}${path}`,{...options,headers,cache:"no-store"});
  const data=await res.json().catch(()=>({}));
  if(!res.ok)throw new Error(data.message||`HTTP ${res.status}`);
  return data;
}
function esc(v=""){return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function localInput(v){if(!v)return"";const d=new Date(v);if(Number.isNaN(d.getTime()))return String(v).slice(0,16);const p=n=>String(n).padStart(2,"0");return`${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`}
function isoOrNull(v){if(!v)return null;const d=new Date(v);return Number.isNaN(d.getTime())?null:d.toISOString()}
function setMessage(el,text,ok=false){if(!el)return;el.textContent=text||"";el.classList.toggle("success",ok)}
function showLogin(){$("#dashboardView").hidden=true;$("#loginView").hidden=false}
async function showDashboard(){$("#loginView").hidden=true;$("#dashboardView").hidden=false;await loadArticles();setAdminTab("dashboard")}
function statusLabel(a){if(a.effective_status==="published"||a.status==="published")return["published","เผยแพร่"];if(a.status==="scheduled")return["scheduled","ตั้งเวลา"];return["draft","ฉบับร่าง"]}

function setEditorMode(type){
  currentType=type==="news"?"news":"analysis";
  $("#contentType").value=currentType;
  const news=currentType==="news";
  $(".admin-grid").classList.toggle("news-mode",news);
  $("#editorTitle").textContent=news?"เพิ่มข่าวฟุตบอลใหม่":"เพิ่มบทวิเคราะห์ใหม่";
  $("#titleLabel").textContent=news?"หัวข้อข่าว":"หัวข้อบทวิเคราะห์";
  $("#leagueLabel").textContent=news?"หมวดข่าว":"ลีก";
  $("#excerptLabel").textContent=news?"คำโปรยข่าว":"คำเกริ่น";
  $("#contentLabel").textContent=news?"เนื้อหาข่าว":"เนื้อหาบทวิเคราะห์";
  $("#featuredLabel").textContent=news?"ปักหมุดข่าวนี้":"ปักหมุดบทวิเคราะห์นี้";
  $("#saveButton").textContent=news?"บันทึกข่าว":"บันทึกบทวิเคราะห์";
  $("#libraryTitle").textContent=news?"ข่าวฟุตบอลทั้งหมด":"บทวิเคราะห์ทั้งหมด";
  $("#searchInput").placeholder=news?"ค้นหาหัวข้อข่าวหรือหมวดข่าว":"ค้นหาหัวข้อ คู่แข่งขัน หรือลีก";
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
  }
  if(name==="news"){
    // Reuse the same editor/list visually by moving it into news mount
    setEditorMode("news");
    const grid=$(".admin-grid");
    const mount=$("#newsAdminMount");
    if(grid&&mount)mount.appendChild(grid);
  }
  if(name==="analysis"){
    const grid=$(".admin-grid");
    const panel=$('[data-admin-panel="analysis"]');
    if(grid&&panel&&!panel.contains(grid))panel.appendChild(grid);
  }
  if(name==="popup")loadPopup();
}
$$("[data-admin-tab]").forEach(b=>b.addEventListener("click",()=>setAdminTab(b.dataset.adminTab)));
$$("[data-go-tab]").forEach(b=>b.addEventListener("click",()=>setAdminTab(b.dataset.goTab)));
$("#openNewsEditor")?.addEventListener("click",()=>{setAdminTab("news");window.scrollTo({top:0,behavior:"smooth"})});

function renderStats(s={}){
  $("#statTotal").textContent=s.total||0;
  $("#statPublished").textContent=s.published||0;
  $("#statScheduled").textContent=s.scheduled||0;
  $("#statDraft").textContent=s.draft||0;
  $("#statFeatured").textContent=s.featured||0;
}

function resetForm(clearMessage=true){
  $("#articleForm").reset();
  setCategoryOptions(currentType);
  $("#articleId").value="";
  $("#contentType").value=currentType;
  $("#confidence").value="70";
  $("#status").value="draft";
  $("#publishAtWrap").hidden=true;
  $("#coverPreview").hidden=true;
  $("#coverPreview").removeAttribute("src");
  const news=currentType==="news";
  $("#editorTitle").textContent=news?"เพิ่มข่าวฟุตบอลใหม่":"เพิ่มบทวิเคราะห์ใหม่";
  if(clearMessage)setMessage($("#editorMessage"),"");
}

function render(){
  const q=$("#searchInput").value.trim().toLowerCase();
  const f=$("#statusFilter").value;
  const list=articles.filter(a=>{
    const type=(a.content_type||"analysis");
    const text=`${a.title||""} ${a.league||""} ${a.match_name||""}`.toLowerCase();
    return type===currentType&&(!q||text.includes(q))&&(!f||a.status===f);
  });
  const box=$("#articleList");
  if(!list.length){box.innerHTML=`<div class="empty">ยังไม่มี${currentType==="news"?"ข่าวฟุตบอล":"บทวิเคราะห์"}ที่ตรงกับตัวกรอง</div>`;return}
  box.innerHTML=list.map(a=>{
    const[s,l]=statusLabel(a);
    return `<article class="article-item">
      <div class="article-top"><div>
        <div class="article-type">${(a.content_type||"analysis")==="news"?"📰 ข่าวฟุตบอล":"📝 บทวิเคราะห์"}</div>
        <h3>${esc(a.title)}</h3>
        <div class="article-meta"><span class="badge ${s}">${l}</span>${a.featured?'<span class="badge featured">📌 ปักหมุด</span>':""}<span>${esc(a.league||"ไม่ระบุหมวด")}</span>${a.match_name?`<span>${esc(a.match_name)}</span>`:""}</div>
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
    renderCurrentStats();
    render();
  }catch(e){
    if(/เข้าสู่ระบบ|session|unauthorized/i.test(e.message)){token="";sessionStorage.removeItem("balltoday_admin_token");showLogin()}
    else setMessage($("#editorMessage"),e.message);
  }
}

function articleFromForm(){
  const news=currentType==="news";
  return{
    content_type:currentType,
    title:$("#title").value.trim(),
    league:$("#league").value,
    match_name:news?null:$("#matchName").value.trim(),
    match_time:news?null:isoOrNull($("#matchTime").value),
    confidence:news?0:Number($("#confidence").value||0),
    image_url:$("#imageUrl").value.trim(),
    excerpt:$("#excerpt").value.trim(),
    content:$("#content").value.trim(),
    status:$("#status").value,
    publish_at:isoOrNull($("#publishAt").value),
    featured:$("#featured").checked
  };
}

function fillForm(a){
  currentType=(a.content_type||"analysis")==="news"?"news":"analysis";
  $("#contentType").value=currentType;
  $(".admin-grid").classList.toggle("news-mode",currentType==="news");
  $("#articleId").value=a.id;
  $("#title").value=a.title||"";
  setCategoryOptions(currentType,a.league||"");
  $("#matchName").value=a.match_name||"";
  $("#matchTime").value=localInput(a.match_time);
  $("#confidence").value=a.confidence||0;
  $("#imageUrl").value=a.image_url||"";
  $("#excerpt").value=a.excerpt||"";
  $("#content").value=a.content||"";
  $("#status").value=a.status||"draft";
  $("#publishAt").value=localInput(a.publish_at);
  $("#publishAtWrap").hidden=a.status!=="scheduled";
  $("#featured").checked=!!a.featured;
  $("#editorTitle").textContent=currentType==="news"?"แก้ไขข่าวฟุตบอล":"แก้ไขบทวิเคราะห์";
  updateCoverPreview();
  window.scrollTo({top:0,behavior:"smooth"});
}

function openPreview(a){
  const image=a.image_url||"";
  $("#previewImage").hidden=!image;if(image)$("#previewImage").src=image;
  $("#previewLeague").textContent=a.league||(currentType==="news"?"ข่าวฟุตบอล":"บทวิเคราะห์");
  $("#previewTitle").textContent=a.title||"ตัวอย่าง";
  $("#previewMeta").textContent=currentType==="news"?"ข่าวฟุตบอล":[a.match_name,a.match_time?new Date(a.match_time).toLocaleString("th-TH"):"",`ความมั่นใจ ${Number(a.confidence||0)}%`].filter(Boolean).join(" • ");
  $("#previewExcerpt").textContent=a.excerpt||"";
  $("#previewContent").textContent=a.content||"";
  $("#previewModal").showModal();
}
function updateCoverPreview(){const u=$("#imageUrl").value.trim(),img=$("#coverPreview");img.hidden=!u;if(u)img.src=u}

$("#loginForm").addEventListener("submit",async e=>{e.preventDefault();const b=$("#loginButton");b.disabled=true;try{const d=await api("/api/admin/login",{method:"POST",body:JSON.stringify({username:$("#username").value,password:$("#password").value})});token=d.token;sessionStorage.setItem("balltoday_admin_token",token);setMessage($("#loginMessage"),"");await showDashboard()}catch(err){setMessage($("#loginMessage"),err.message)}finally{b.disabled=false}});
$("#logoutButton").onclick=()=>{token="";sessionStorage.removeItem("balltoday_admin_token");showLogin()};
$("#refreshArticles").onclick=loadArticles;
$("#resetButton").onclick=()=>resetForm();
$("#searchInput").oninput=render;
$("#statusFilter").onchange=render;
$("#status").onchange=()=>{$("#publishAtWrap").hidden=$("#status").value!=="scheduled"};
$("#imageUrl").oninput=updateCoverPreview;
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
  if(payload.status==="scheduled"&&!payload.publish_at){setMessage($("#editorMessage"),"กรุณาระบุเวลาเผยแพร่");return}
  const b=$("#saveButton");b.disabled=true;
  try{
    await api(id?`/api/admin/articles/${id}`:"/api/admin/articles",{method:id?"PUT":"POST",body:JSON.stringify(payload)});
    setMessage($("#editorMessage"),currentType==="news"?"บันทึกข่าวเรียบร้อย":"บันทึกบทวิเคราะห์เรียบร้อย",true);
    resetForm(false);await loadArticles();
  }catch(err){setMessage($("#editorMessage"),err.message)}
  finally{b.disabled=false}
});

/* Popup ข่าวเด่นวันนี้ */
function popupFromForm(){return{enabled:$("#popupEnabled").checked,title:$("#popupTitle").value.trim(),image_url:$("#popupImageUrl").value.trim(),link_url:$("#popupLinkUrl").value.trim(),start_at:isoOrNull($("#popupStartAt").value),end_at:isoOrNull($("#popupEndAt").value),once_per_session:$("#popupOncePerSession").checked}}
function updatePopupPreview(){const u=$("#popupImageUrl").value.trim(),img=$("#popupImagePreview");img.hidden=!u;if(u)img.src=u}
async function loadPopup(){try{const d=await api("/api/admin/popup"),p=d.popup||{};$("#popupEnabled").checked=!!p.enabled;$("#popupTitle").value=p.title||"";$("#popupImageUrl").value=p.image_url||"";$("#popupLinkUrl").value=p.link_url||"";$("#popupStartAt").value=localInput(p.start_at);$("#popupEndAt").value=localInput(p.end_at);$("#popupOncePerSession").checked=p.once_per_session!==false;updatePopupPreview();setMessage($("#popupMessage"),"")}catch(e){setMessage($("#popupMessage"),e.message)}}
$("#popupImageUrl").oninput=updatePopupPreview;
$("#refreshPopup").onclick=loadPopup;
$("#popupPreviewButton").onclick=()=>{const u=$("#popupImageUrl").value.trim();if(u)window.open(u,"_blank","noopener");else setMessage($("#popupMessage"),"กรุณาใส่ URL รูปก่อน")};
$("#popupForm").addEventListener("submit",async e=>{e.preventDefault();const p=popupFromForm();if(p.enabled&&!p.image_url){setMessage($("#popupMessage"),"กรุณาใส่ URL รูป Popup");return}const b=$("#savePopupButton");b.disabled=true;try{await api("/api/admin/popup",{method:"PUT",body:JSON.stringify(p)});setMessage($("#popupMessage"),"บันทึก Popup เรียบร้อย",true)}catch(err){setMessage($("#popupMessage"),err.message)}finally{b.disabled=false}});

if(token)showDashboard();else showLogin();
