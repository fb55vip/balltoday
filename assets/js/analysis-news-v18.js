"use strict";
/* V18: only Analysis + News. Does not touch popup/live/hero/calculator/footer/menu. */
(function(){
  const ANALYSIS="#analysisList",NEWS="#newsList";
  function interactive(t){return !!t.closest("a,input,select,textarea,label")}
  function slugFrom(card){
    const b=card.querySelector("[data-content-article],[data-news-article]");
    return b?.dataset.contentArticle||b?.dataset.newsArticle||"";
  }
  function openFull(slug){if(slug)location.href="/article.html?slug="+encodeURIComponent(slug)}
  function activate(card){
    if(!card||card.dataset.hnV18==="1")return;
    const slug=slugFrom(card);if(!slug)return;
    card.dataset.hnV18="1";card.classList.add("hn-content-card");card.tabIndex=0;card.setAttribute("role","link");
    card.addEventListener("click",e=>{if(interactive(e.target))return;openFull(slug)});
    card.addEventListener("keydown",e=>{if((e.key==="Enter"||e.key===" ")&&!interactive(e.target)){e.preventDefault();openFull(slug)}});
    const btn=card.querySelector("[data-content-article],[data-news-article]");
    if(btn)btn.addEventListener("click",e=>{e.preventDefault();e.stopImmediatePropagation();openFull(slug)},true);
  }
  function run(){document.querySelectorAll(`${ANALYSIS} .analysis-item,${NEWS} .news-item`).forEach(activate)}
  function obs(s){const n=document.querySelector(s);if(!n)return;new MutationObserver(()=>requestAnimationFrame(run)).observe(n,{childList:true,subtree:true})}
  document.addEventListener("DOMContentLoaded",()=>{run();obs(ANALYSIS);obs(NEWS)},{once:true});
})();
