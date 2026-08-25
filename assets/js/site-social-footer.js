"use strict";

(function () {
  const API = "https://balltoday-content-api.noppdsoma.workers.dev";
  const MARKS = {
    facebook: "f",
    line: "L",
    instagram: "\u25ce",
    tiktok: "\u266a",
    youtube: "\u25b6",
    x: "X",
    other: "\u2197"
  };

  function safeUrl(value) {
    try {
      const url = new URL(value);
      return url.protocol === "https:" || url.protocol === "http:" ? url.href : "";
    } catch (_) {
      return "";
    }
  }

  function addStyles() {
    if (document.getElementById("siteSocialFooterStyles")) return;
    const style = document.createElement("style");
    style.id = "siteSocialFooterStyles";
    style.textContent = ".footer-social{margin-top:18px}.footer-social-title{display:block;margin-bottom:10px;color:#fff;font-size:12px;font-weight:800}.footer-social-links{display:flex;flex-wrap:wrap;gap:9px}.footer-social-links a{display:inline-flex;align-items:center;justify-content:center;width:38px;height:38px;border:1px solid rgba(255,255,255,.14);border-radius:50%;background:#111827;color:#fff;text-decoration:none;font:800 14px/1 Arial,sans-serif;transition:transform .2s ease,border-color .2s ease}.footer-social-links a:hover{transform:translateY(-2px);border-color:#ef1737}.footer-social-links [data-platform=facebook]{background:#1877f2}.footer-social-links [data-platform=line]{background:#06c755}.footer-social-links [data-platform=instagram]{background:linear-gradient(135deg,#833ab4,#fd1d1d,#fcb045)}.footer-social-links [data-platform=tiktok]{background:#111;text-shadow:-1px 0 #25f4ee,1px 0 #fe2c55}.footer-social-links [data-platform=youtube]{background:#f00}.footer-social-links [data-platform=x]{background:#050505}";
    document.head.appendChild(style);
  }

  async function renderFooterSocial() {
    const brand = document.querySelector(".site-footer .footer-brand");
    if (!brand || document.getElementById("footerSocialLinks")) return;

    try {
      const response = await fetch(`${API}/api/social-links`, {
        headers: { Accept: "application/json" }
      });
      if (!response.ok) return;
      const data = await response.json();
      const links = (Array.isArray(data?.links) ? data.links : [])
        .filter((item) => item && item.show_footer && safeUrl(item.url));
      if (!links.length) return;

      addStyles();
      const section = document.createElement("div");
      section.className = "footer-social";
      section.id = "footerSocialLinks";
      const title = document.createElement("strong");
      title.className = "footer-social-title";
      title.textContent = "\u0e15\u0e34\u0e14\u0e15\u0e32\u0e21 HN FOOTBALL SCORE";
      const row = document.createElement("div");
      row.className = "footer-social-links";

      links.forEach((item) => {
        const platform = Object.prototype.hasOwnProperty.call(MARKS, item.platform) ? item.platform : "other";
        const anchor = document.createElement("a");
        anchor.href = safeUrl(item.url);
        anchor.target = "_blank";
        anchor.rel = "noopener noreferrer";
        anchor.dataset.platform = platform;
        anchor.setAttribute("aria-label", item.label || platform);
        anchor.title = item.label || platform;
        anchor.textContent = MARKS[platform];
        row.appendChild(anchor);
      });

      section.append(title, row);
      brand.appendChild(section);
    } catch (_) {}
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", renderFooterSocial, { once: true });
  } else {
    renderFooterSocial();
  }
})();
