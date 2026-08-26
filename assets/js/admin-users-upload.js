"use strict";

let signedInUser=null;

async function accountApi(path,options={}){
  const headers={...(options.headers||{})};
  if(!(options.body instanceof FormData))headers["Content-Type"]="application/json";
  const saved=sessionStorage.getItem("balltoday_admin_token")||"";
  if(saved)headers.Authorization=`Bearer ${saved}`;
  const response=await fetch(`${API_BASE}${path}`,{...options,headers,cache:"no-store"});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(data.message||`HTTP ${response.status}`);
  return data;
}

function accountMessage(id,text,ok=false){
  const el=document.getElementById(id);if(!el)return;
  el.textContent=text||"";el.classList.toggle("success",ok);
}

function renderCurrentUser(user){
  signedInUser=user||null;
  const badge=document.getElementById("currentUserBadge");
  if(badge)badge.innerHTML=user?`<strong>${esc(user.display_name||user.username)}</strong><span>${user.role==="owner"?"ผู้ดูแลหลัก":"ผู้เขียน"}</span>`:"";
  const usersTab=document.getElementById("usersTabButton");
  if(usersTab)usersTab.hidden=!user||user.role!=="owner";
  ["socialTabButton","auditTabButton"].forEach(id=>{const el=document.getElementById(id);if(el)el.hidden=!user||user.role!=="owner"});
  if(user){
    $("#profileUsername").value=user.username||"";
    $("#profileDisplayName").value=user.display_name||"";
    $("#profileWikimediaUsername").value=user.wikimedia_username||"";
    $("#profileWikimediaUrl").value=user.wikimedia_url||"";
    $("#profileBio").value=user.bio||"";
    $("#profileAvatarUrl").value=user.avatar_url||"";
    $("#profileFacebookUrl").value=user.facebook_url||"";
    $("#profileTiktokUrl").value=user.tiktok_url||"";
    $("#profileYoutubeUrl").value=user.youtube_url||"";
    $("#profileXUrl").value=user.x_url||"";
    const avatar=$("#profileAvatarPreview");avatar.hidden=!user.avatar_url;if(user.avatar_url)avatar.src=user.avatar_url;
  }
}

async function loadCurrentUser(){
  if(!sessionStorage.getItem("balltoday_admin_token"))return;
  try{const data=await accountApi("/api/admin/me");renderCurrentUser(data.user)}catch{}
}

async function uploadSelectedFile(fileInput,urlInput,messageId,previewUpdater){
  const file=$(fileInput)?.files?.[0];
  if(!file){accountMessage(messageId,"กรุณาเลือกรูปก่อน");return}
  if(file.size>5*1024*1024){accountMessage(messageId,"รูปต้องมีขนาดไม่เกิน 5 MB");return}
  const form=new FormData();form.append("file",file);
  accountMessage(messageId,"กำลังอัปโหลดรูป...");
  try{
    const data=await accountApi("/api/admin/upload",{method:"POST",body:form});
    $(urlInput).value=data.url;
    $(urlInput).dispatchEvent(new Event("input",{bubbles:true}));
    if(previewUpdater)previewUpdater();
    accountMessage(messageId,"อัปโหลดรูปเรียบร้อย",true);
  }catch(error){accountMessage(messageId,error.message)}
}

$("#uploadCoverButton")?.addEventListener("click",()=>uploadSelectedFile("#coverFile","#imageUrl","coverUploadMessage",typeof updateCoverPreview==="function"?updateCoverPreview:null));
$("#uploadProfileAvatar")?.addEventListener("click",()=>uploadSelectedFile("#profileAvatarFile","#profileAvatarUrl","profileMessage",()=>{const img=$("#profileAvatarPreview"),url=$("#profileAvatarUrl").value;img.hidden=!url;if(url)img.src=url}));
$("#profileForm")?.addEventListener("submit",async event=>{
  event.preventDefault();
  const button=$("#saveProfileButton");button.disabled=true;
  try{
    const payload={username:$("#profileUsername").value.trim(),display_name:$("#profileDisplayName").value.trim(),bio:$("#profileBio").value.trim(),avatar_url:$("#profileAvatarUrl").value.trim(),wikimedia_username:$("#profileWikimediaUsername").value.trim(),wikimedia_url:$("#profileWikimediaUrl").value.trim(),facebook_url:$("#profileFacebookUrl").value.trim(),tiktok_url:$("#profileTiktokUrl").value.trim(),youtube_url:$("#profileYoutubeUrl").value.trim(),x_url:$("#profileXUrl").value.trim(),password:$("#profilePassword").value};
    const data=await accountApi("/api/admin/me",{method:"PUT",body:JSON.stringify(payload)});
    $("#profilePassword").value="";renderCurrentUser(data.user);accountMessage("profileMessage","บันทึกโปรไฟล์เรียบร้อย",true);
  }catch(error){accountMessage("profileMessage",error.message)}finally{button.disabled=false}
});

function renderUsers(users=[]){
  const list=$("#usersList");if(!list)return;
  if(!users.length){list.innerHTML='<div class="empty">ยังไม่มีผู้ใช้งาน</div>';return}
  list.innerHTML=users.map(user=>{const isCurrent=Number(user.id)===Number(signedInUser?.id);return `<article class="user-card"><div><h3>${esc(user.display_name||user.username)} <span class="role-pill ${user.role}">${user.role==="owner"?"ผู้ดูแลหลัก":"ผู้เขียน"}</span></h3><p>ชื่อผู้ใช้: ${esc(user.username)} • ${user.active?"ใช้งานอยู่":"ปิดใช้งาน"}</p>${user.wikimedia_url?`<p>Wikimedia: <a class="author-link" href="${esc(user.wikimedia_url)}" target="_blank" rel="noopener">${esc(user.wikimedia_username||user.wikimedia_url)}</a></p>`:""}</div><div class="user-actions"><button class="ghost" type="button" data-user-edit="${user.id}">แก้ข้อมูล</button>${isCurrent?"":`<button class="ghost ${user.active?"danger":""}" type="button" data-user-toggle="${user.id}" data-active="${user.active?0:1}">${user.active?"ปิดบัญชี":"เปิดบัญชี"}</button><button class="ghost danger" type="button" data-user-delete="${user.id}">ลบบัญชี</button>`}</div></article>`}).join("");
}

async function loadUsers(){
  if(!signedInUser||signedInUser.role!=="owner")return;
  try{const data=await accountApi("/api/admin/users");renderUsers(data.users||[]);accountMessage("usersMessage","")}catch(error){accountMessage("usersMessage",error.message)}
}

$("#refreshUsers")?.addEventListener("click",loadUsers);
$("#userCreateForm")?.addEventListener("submit",async event=>{
  event.preventDefault();
  const form=event.currentTarget;
  const button=$("#createUserButton");button.disabled=true;
  try{
    await accountApi("/api/admin/users",{method:"POST",body:JSON.stringify({username:$("#newUsername").value.trim(),display_name:$("#newDisplayName").value.trim(),password:$("#newPassword").value,role:$("#newRole").value})});
    form.reset();
    await loadUsers();
    accountMessage("usersMessage","สร้างบัญชีเรียบร้อย สามารถใช้ชื่อผู้ใช้และรหัสผ่านนี้เข้าสู่ระบบได้",true);
  }catch(error){accountMessage("usersMessage",error.message)}finally{button.disabled=false}
});

$("#usersList")?.addEventListener("click",async event=>{
  const toggle=event.target.closest("[data-user-toggle]");
  const edit=event.target.closest("[data-user-edit]");
  const remove=event.target.closest("[data-user-delete]");
  try{
    if(toggle){await accountApi(`/api/admin/users/${toggle.dataset.userToggle}`,{method:"PUT",body:JSON.stringify({active:toggle.dataset.active==="1"})});await loadUsers()}
    if(remove){
      if(!confirm("ต้องการลบบัญชีนี้ถาวรหรือไม่? บทความเดิมจะยังคงอยู่"))return;
      if(!confirm("ยืนยันอีกครั้ง: ลบบัญชีนี้ถาวร"))return;
      await accountApi(`/api/admin/users/${remove.dataset.userDelete}`,{method:"DELETE"});
      accountMessage("usersMessage","ลบบัญชีเรียบร้อย โดยบทความเดิมยังคงอยู่",true);await loadUsers();
    }
    if(edit){
      const displayName=prompt("ชื่อที่แสดงใหม่ (กดยกเลิกหากไม่แก้)");if(displayName===null)return;
      const password=prompt("รหัสผ่านใหม่อย่างน้อย 8 ตัว (เว้นว่างหากไม่เปลี่ยน)")||"";
      await accountApi(`/api/admin/users/${edit.dataset.userEdit}`,{method:"PUT",body:JSON.stringify({display_name:displayName.trim(),password})});
      await loadUsers();
    }
  }catch(error){accountMessage("usersMessage",error.message)}
});

document.addEventListener("click",event=>{
  const passwordToggle=event.target.closest("[data-password-target]");
  if(passwordToggle){
    const input=document.getElementById(passwordToggle.dataset.passwordTarget);
    if(input){
      const showing=input.type==="text";
      input.type=showing?"password":"text";
      passwordToggle.textContent=showing?"👁 ดู":"🙈 ซ่อน";
      passwordToggle.setAttribute("aria-label",showing?"แสดงรหัสผ่าน":"ซ่อนรหัสผ่าน");
      passwordToggle.setAttribute("aria-pressed",String(!showing));
    }
    return;
  }
  const tab=event.target.closest('[data-admin-tab="profile"]');if(tab)loadCurrentUser();
  const users=event.target.closest('[data-admin-tab="users"]');if(users)loadUsers();
});

$("#loginForm")?.addEventListener("submit",()=>setTimeout(loadCurrentUser,500));
$("#logoutButton")?.addEventListener("click",()=>renderCurrentUser(null));
loadCurrentUser();
