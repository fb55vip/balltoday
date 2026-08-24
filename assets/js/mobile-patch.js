"use strict";
(function(){
  const root=document.getElementById("articleView");if(!root)return;
  function esc(v=""){return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
  function format(node){
    if(!node||node.dataset.mobileFull==="1")return;
    const raw=node.textContent||"";node.dataset.mobileFull="1";
    node.innerHTML=raw.replace(/\r\n?/g,"\n").split(/\n{2,}/).map(block=>{
      const t=block.trim();if(!t)return"";
      const h=t.match(/^#{1,3}\s+([\s\S]+)$/);
      return h?`<h2>${esc(h[1]).replace(/\n/g,"<br>")}</h2>`:`<p>${esc(t).replace(/\n/g,"<br>")}</p>`;
    }).join("");
  }
  new MutationObserver(()=>format(root.querySelector(".content"))).observe(root,{childList:true,subtree:true});
  format(root.querySelector(".content"));
})();
