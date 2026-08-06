"use strict";
const API_BASE = "https://balltoday-content-api.noppdsoma.workers.dev";
const $ = s => document.querySelector(s);
let token = sessionStorage.getItem("balltoday_admin_token") || "";
let articles = [];

async function api(path, options={}){
  const headers={"Content-Type":"application/json",...(options.headers||{})};
  if(token) headers.Authorization=`Bearer ${token}`;
  const res=await fetch(`${API_BASE}${path}`,{...options,headers});
  const data=await res.json().catch(()=>({}));
  if(!res.ok) throw new Error(data.message||`HTTP ${res.status}`);
  return data;
}
function showDashboard(){ $("#loginView").hidden=true; $("#dashboardView").hidden=false; loadArticles(); }
function showLogin(){ $("#dashboardView").hidden=true; $("#loginView").hidden=false; }
function resetForm(){ $("#articleForm").reset(); $("#articleId").value=""; $("#editorTitle").textContent="เพิ่มบทความใหม่"; }
function esc(v=""){return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function render(){
  const box=$("#articleList");
  if(!articles.length){box.innerHTML="<p>ยังไม่มีบทความ</p>";return;}
  box.innerHTML=articles.map(a=>`<article class="article-item"><h3>${esc(a.title)}</h3><div class="article-meta"><span class="status ${a.published?"live":""}">${a.published?"เผยแพร่":"ฉบับร่าง"}</span> ${esc(a.league||"")} ${esc(a.match_name||"")}</div><div class="article-actions"><button data-edit="${a.id}">แก้ไข</button><button class="ghost" data-delete="${a.id}">ลบ</button></div></article>`).join("");
}
async function loadArticles(){try{const d=await api("/api/admin/articles");articles=d.articles||[];render();}catch(e){if(/unauthorized/i.test(e.message)){token="";sessionStorage.removeItem("balltoday_admin_token");showLogin();}else $("#editorMessage").textContent=e.message;}}
$("#loginForm").addEventListener("submit",async e=>{e.preventDefault();try{const d=await api("/api/admin/login",{method:"POST",body:JSON.stringify({username:$("#username").value,password:$("#password").value})});token=d.token;sessionStorage.setItem("balltoday_admin_token",token);$("#loginMessage").textContent="";showDashboard();}catch(err){$("#loginMessage").textContent=err.message;}});
$("#logoutButton").onclick=()=>{token="";sessionStorage.removeItem("balltoday_admin_token");showLogin();};
$("#refreshArticles").onclick=loadArticles;
$("#resetButton").onclick=resetForm;
$("#articleList").addEventListener("click",async e=>{const edit=e.target.closest("[data-edit]");const del=e.target.closest("[data-delete]");if(edit){const a=articles.find(x=>String(x.id)===edit.dataset.edit);if(!a)return;$("#articleId").value=a.id;$("#title").value=a.title||"";$("#league").value=a.league||"";$("#matchName").value=a.match_name||"";$("#matchTime").value=a.match_time?String(a.match_time).slice(0,16):"";$("#imageUrl").value=a.image_url||"";$("#excerpt").value=a.excerpt||"";$("#content").value=a.content||"";$("#published").checked=!!a.published;$("#editorTitle").textContent="แก้ไขบทความ";window.scrollTo({top:0,behavior:"smooth"});}if(del&&confirm("ยืนยันลบบทความนี้?")){try{await api(`/api/admin/articles/${del.dataset.delete}`,{method:"DELETE"});loadArticles();}catch(err){alert(err.message);}}});
$("#articleForm").addEventListener("submit",async e=>{e.preventDefault();const id=$("#articleId").value;const payload={title:$("#title").value,league:$("#league").value,match_name:$("#matchName").value,match_time:$("#matchTime").value||null,image_url:$("#imageUrl").value,excerpt:$("#excerpt").value,content:$("#content").value,published:$("#published").checked};try{await api(id?`/api/admin/articles/${id}`:"/api/admin/articles",{method:id?"PUT":"POST",body:JSON.stringify(payload)});$("#editorMessage").textContent="บันทึกเรียบร้อย";resetForm();loadArticles();}catch(err){$("#editorMessage").textContent=err.message;}});
if(token) showDashboard(); else showLogin();
