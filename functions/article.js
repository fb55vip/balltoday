const SITE_URL = "https://www.fb55vip.com";
const SITE_NAME = "HN FOOTBALL SCORE";
const CONTENT_API = "https://balltoday-content-api.noppdsoma.workers.dev";

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeJsonForHtml(value) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

function stripHtml(value = "") {
  return String(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeText(value = "") {
  return stripHtml(value).slice(0, 5000);
}

function safeUrl(value, fallback = "") {
  try {
    const url = new URL(value, SITE_URL);

    if (url.protocol === "http:" || url.protocol === "https:") {
      return url.href;
    }
  } catch (_) {}

  return fallback;
}

function canonicalUrl(value, fallback) {
  try {
    const url = new URL(value || fallback, SITE_URL);
    if (url.hostname === "fb55vip.com") url.hostname = "www.fb55vip.com";
    if (url.origin === SITE_URL) return url.href;
  } catch (_) {}
  return fallback;
}

function formatThaiDate(value) {
  if (!value) return "";

  try {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    return new Intl.DateTimeFormat("th-TH", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Bangkok"
    }).format(date);
  } catch (_) {
    return "";
  }
}

function getArticleType(article) {
  const type = String(
    article.content_type ||
    article.type ||
    article.category ||
    ""
  ).toLowerCase();

  if (
    type.includes("news") ||
    type.includes("\u0e02\u0e48\u0e32\u0e27")
  ) {
    return "NewsArticle";
  }

  return "Article";
}

function getSection(article) {
  const type = String(
    article.content_type ||
    article.type ||
    article.category ||
    ""
  ).toLowerCase();

  if (type.includes("news") || type.includes("\u0e02\u0e48\u0e32\u0e27")) {
    return {
      name: "\u0e02\u0e48\u0e32\u0e27\u0e1f\u0e38\u0e15\u0e1a\u0e2d\u0e25",
      url: `${SITE_URL}/news`
    };
  }

  if (
    type.includes("knowledge") ||
    type.includes("evergreen") ||
    type.includes("\u0e04\u0e27\u0e32\u0e21\u0e23\u0e39\u0e49")
  ) {
    return {
      name: "\u0e04\u0e27\u0e32\u0e21\u0e23\u0e39\u0e49\u0e1f\u0e38\u0e15\u0e1a\u0e2d\u0e25",
      url: `${SITE_URL}/knowledge`
    };
  }

  return {
    name: "\u0e1a\u0e17\u0e27\u0e34\u0e40\u0e04\u0e23\u0e32\u0e30\u0e2b\u0e4c",
    url: `${SITE_URL}/analysis`
  };
}

function getContentType(article) {
  const type = String(
    article.content_type || article.type || article.category || ""
  ).toLowerCase();
  if (type.includes("news") || type.includes("\u0e02\u0e48\u0e32\u0e27")) return "news";
  if (type.includes("knowledge") || type.includes("evergreen") || type.includes("\u0e04\u0e27\u0e32\u0e21\u0e23\u0e39\u0e49")) return "evergreen";
  return "analysis";
}

async function fetchArticle(slug) {
  const endpoints = [
    `${CONTENT_API}/api/articles/${encodeURIComponent(slug)}`,
    `${CONTENT_API}/articles/${encodeURIComponent(slug)}`,
    `${CONTENT_API}/api/content/${encodeURIComponent(slug)}`
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        headers: {
          Accept: "application/json"
        }
      });

      if (!response.ok) {
        continue;
      }

      const data = await response.json();

      const article =
        data?.article ||
        data?.data ||
        data?.item ||
        data;

      if (article && typeof article === "object") {
        return article;
      }
    } catch (_) {}
  }

  return null;
}

async function fetchRelatedArticles(article, slug) {
  const type = getContentType(article);
  try {
    const response = await fetch(
      `${CONTENT_API}/api/articles?type=${encodeURIComponent(type)}&limit=12`,
      { headers: { Accept: "application/json" } }
    );
    if (!response.ok) return [];
    const data = await response.json();
    const items = Array.isArray(data?.articles) ? data.articles : [];
    const currentLeague = String(article.league || "").trim().toLowerCase();
    return items
      .filter((item) => item?.slug && item.slug !== slug && getContentType(item) === type)
      .sort((a, b) => {
        const aSame = currentLeague && String(a.league || "").trim().toLowerCase() === currentLeague ? 1 : 0;
        const bSame = currentLeague && String(b.league || "").trim().toLowerCase() === currentLeague ? 1 : 0;
        return bSame - aSame;
      })
      .slice(0, 4);
  } catch (_) {
    return [];
  }
}

async function fetchSocialLinks(){try{const response=await fetch(`${CONTENT_API}/api/social-links`,{headers:{Accept:"application/json"}});if(!response.ok)return[];const data=await response.json();return Array.isArray(data?.links)?data.links:[]}catch{return[]}}

const SOCIAL_MARKS={facebook:"f",line:"L",instagram:"\u25ce",tiktok:"\u266a",youtube:"\u25b6",x:"X",other:"\u2197"};
function socialIcon(platform){const key=Object.prototype.hasOwnProperty.call(SOCIAL_MARKS,platform)?platform:"other";return `<span class="social-icon social-icon--${key}" aria-hidden="true">${SOCIAL_MARKS[key]}</span>`}

function buildNotFoundPage(slug) {
  const title = "\u0e44\u0e21\u0e48\u0e1e\u0e1a\u0e1a\u0e17\u0e04\u0e27\u0e32\u0e21 | HN FOOTBALL SCORE";
  const canonical = `${SITE_URL}/article?slug=${encodeURIComponent(slug)}`;

  return `<!doctype html>
<html lang="th">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="robots" content="noindex,follow">
  <title>${escapeHtml(title)}</title>
  <link rel="canonical" href="${escapeHtml(canonical)}">
</head>
<body>
  <main>
    <h1>\u0e44\u0e21\u0e48\u0e1e\u0e1a\u0e1a\u0e17\u0e04\u0e27\u0e32\u0e21</h1>
    <p>\u0e1a\u0e17\u0e04\u0e27\u0e32\u0e21\u0e17\u0e35\u0e48\u0e04\u0e38\u0e13\u0e01\u0e33\u0e25\u0e31\u0e07\u0e04\u0e49\u0e19\u0e2b\u0e32\u0e2d\u0e32\u0e08\u0e16\u0e39\u0e01\u0e22\u0e49\u0e32\u0e22\u0e2b\u0e23\u0e37\u0e2d\u0e25\u0e1a\u0e2d\u0e2d\u0e01\u0e41\u0e25\u0e49\u0e27</p>
    <p><a href="${SITE_URL}/">\u0e01\u0e25\u0e31\u0e1a\u0e2b\u0e19\u0e49\u0e32 HN FOOTBALL SCORE</a></p>
  </main>
</body>
</html>`;
}

function buildArticlePage(article, slug, relatedArticles = [], socialLinks = []) {
  const section = getSection(article);
  const schemaType = getArticleType(article);

  const headline =
    article.title ||
    article.headline ||
    article.name ||
    "HN FOOTBALL SCORE";

  const intro =
    article.intro ||
    article.excerpt ||
    article.summary ||
    article.description ||
    "";

  const body =
    article.content ||
    article.body ||
    article.article_content ||
    article.analysis ||
    "";

  const seoTitle =
    article.seo_title ||
    `${headline} | ${SITE_NAME}`;

  const metaDescription =
    normalizeText(
      article.meta_description ||
      intro ||
      body
    ).slice(0, 160);

  const canonical =
    canonicalUrl(
      article.canonical_url,
      `${SITE_URL}/article?slug=${encodeURIComponent(slug)}`
    );

  const image =
    safeUrl(
      article.og_image ||
      article.cover_image ||
      article.image ||
      article.image_url,
      `${SITE_URL}/assets/og-image.jpg`
    );

  const ogTitle =
    article.og_title ||
    seoTitle;

  const ogDescription =
    normalizeText(
      article.og_description ||
      metaDescription
    ).slice(0, 200);

  const author =
    article.author_name ||
    article.author ||
    "HN FOOTBALL SCORE";
  const authorUrl = safeUrl(article.author_profile_url || article.author_url, "");
  const authorSameAs=Array.isArray(article.author_same_as)?article.author_same_as.map(value=>safeUrl(value,"")).filter(Boolean):[];

  const datePublished =
    article.published_at ||
    article.created_at ||
    "";

  const dateModified =
    article.updated_at ||
    article.modified_at ||
    datePublished;

  const displayPublished = formatThaiDate(datePublished);
  const displayModified = formatThaiDate(dateModified);

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": schemaType,
    headline,
    description: metaDescription,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": canonical
    },
    image: image ? [image] : undefined,
    datePublished: datePublished || undefined,
    dateModified: dateModified || undefined,
    author: {
      "@type": author === SITE_NAME ? "Organization" : "Person",
      name: author,
      url: authorUrl || `${SITE_URL}/author.html`,
      sameAs:authorSameAs.length?authorSameAs:undefined
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/assets/og-image.jpg`
      },
      sameAs:socialLinks.map(item=>safeUrl(item.url,"")).filter(Boolean)
    }
  };

  Object.keys(articleSchema).forEach((key) => {
    if (articleSchema[key] === undefined) {
      delete articleSchema[key];
    }
  });

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "\u0e2b\u0e19\u0e49\u0e32\u0e41\u0e23\u0e01",
        item: `${SITE_URL}/`
      },
      {
        "@type": "ListItem",
        position: 2,
        name: section.name,
        item: section.url
      },
      {
        "@type": "ListItem",
        position: 3,
        name: headline,
        item: canonical
      }
    ]
  };

  const safeHeadline = escapeHtml(headline);
  const safeIntro = escapeHtml(intro);
  const safeAuthor = escapeHtml(author);
  const safeAuthorUrl = escapeHtml(authorUrl);
  const safeAuthorBio=escapeHtml(article.author_bio||"");
  const safeAuthorAvatar=escapeHtml(safeUrl(article.author_avatar,""));
  const safeSectionName = escapeHtml(section.name);
  const relatedLinks = relatedArticles.map((item) => `
        <li>
          <a href="/article?slug=${encodeURIComponent(item.slug)}">${escapeHtml(item.title || item.headline || item.slug)}</a>
        </li>`).join("");
  const articleSocialLinks=socialLinks.filter(item=>item.show_article).map(item=>`<a href="${escapeHtml(safeUrl(item.url,"#"))}" target="_blank" rel="noopener noreferrer">${socialIcon(item.platform)}<span>${escapeHtml(item.label||item.platform)}</span></a>`).join("");
  const facebookShare=`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(canonical+"&utm_source=facebook&utm_medium=social")}`;
  const lineShare=`https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(canonical+"&utm_source=line&utm_medium=social")}`;
  const xShare=`https://x.com/intent/post?text=${encodeURIComponent(headline)}&url=${encodeURIComponent(canonical+"&utm_source=x&utm_medium=social")}`;

  return `<!doctype html>
<html lang="th">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">

  <title>${escapeHtml(seoTitle)}</title>

  <meta
    name="description"
    content="${escapeHtml(metaDescription)}"
  >

  <meta name="robots" content="index,follow,max-image-preview:large">

  <link
    rel="canonical"
    href="${escapeHtml(canonical)}"
  >

  <meta property="og:locale" content="th_TH">
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="${SITE_NAME}">
  <meta property="og:title" content="${escapeHtml(ogTitle)}">
  <meta
    property="og:description"
    content="${escapeHtml(ogDescription)}"
  >
  <meta property="og:url" content="${escapeHtml(canonical)}">
  <meta property="og:image" content="${escapeHtml(image)}">

  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(ogTitle)}">
  <meta
    name="twitter:description"
    content="${escapeHtml(ogDescription)}"
  >
  <meta name="twitter:image" content="${escapeHtml(image)}">

  <script type="application/ld+json">${escapeJsonForHtml(articleSchema)}</script>
  <script type="application/ld+json">${escapeJsonForHtml(breadcrumbSchema)}</script>

  <link rel="stylesheet" href="/assets/css/app.css">
  <link rel="stylesheet" href="/assets/css/article-v18.css">
  <link rel="stylesheet" href="/assets/css/article-social.css?v=20260825-3">
</head>

<body>

  <header>
    <a href="/" aria-label="HN FOOTBALL SCORE">
      HN FOOTBALL SCORE
    </a>
  </header>

  <main>

    <nav aria-label="breadcrumb">
      <a href="/">\u0e2b\u0e19\u0e49\u0e32\u0e41\u0e23\u0e01</a>
      <span> \u203a </span>
      <a href="${escapeHtml(section.url)}">${safeSectionName}</a>
      <span> \u203a </span>
      <span>${safeHeadline}</span>
    </nav>

    <article>

      <header>
        <p>${safeSectionName}</p>

        <h1>${safeHeadline}</h1>

        ${
          safeIntro
            ? `<p class="article-intro">${safeIntro}</p>`
            : ""
        }

        <div class="article-meta">
          <span>\u0e42\u0e14\u0e22 ${safeAuthorUrl ? `<a href="${safeAuthorUrl}" target="_blank" rel="me noopener noreferrer">${safeAuthor}</a>` : safeAuthor}</span>

          ${
            displayPublished
              ? `<span>\u0e40\u0e1c\u0e22\u0e41\u0e1e\u0e23\u0e48 ${escapeHtml(displayPublished)}</span>`
              : ""
          }

          ${
            displayModified &&
            displayModified !== displayPublished
              ? `<span>\u0e2d\u0e31\u0e1b\u0e40\u0e14\u0e15 ${escapeHtml(displayModified)}</span>`
              : ""
          }
        </div>
      </header>

      ${
        image
          ? `
            <figure class="article-cover">
              <img
                src="${escapeHtml(image)}"
                alt="${safeHeadline}"
                loading="eager"
                fetchpriority="high"
              >
            </figure>
          `
          : ""
      }

      <div class="article-content">
        ${body}
      </div>

      <section class="author-profile-card">
        ${safeAuthorAvatar?`<img src="${safeAuthorAvatar}" alt="${safeAuthor}" width="88" height="88" loading="lazy">`:""}
        <div><p>\u0e1c\u0e39\u0e49\u0e40\u0e02\u0e35\u0e22\u0e19</p><h2>${safeAuthorUrl?`<a href="${safeAuthorUrl}">${safeAuthor}</a>`:safeAuthor}</h2>${safeAuthorBio?`<p>${safeAuthorBio}</p>`:""}</div>
      </section>

      <section class="article-share" aria-label="\u0e41\u0e0a\u0e23\u0e4c\u0e1a\u0e17\u0e04\u0e27\u0e32\u0e21">
        <strong>\u0e41\u0e0a\u0e23\u0e4c\u0e1a\u0e17\u0e04\u0e27\u0e32\u0e21</strong>
        <a href="${escapeHtml(facebookShare)}" target="_blank" rel="noopener">${socialIcon("facebook")}<span>Facebook</span></a>
        <a href="${escapeHtml(lineShare)}" target="_blank" rel="noopener">${socialIcon("line")}<span>LINE</span></a>
        <a href="${escapeHtml(xShare)}" target="_blank" rel="noopener">${socialIcon("x")}<span>X</span></a>
        <button type="button" data-copy-url="${escapeHtml(canonical)}">\u0e04\u0e31\u0e14\u0e25\u0e2d\u0e01\u0e25\u0e34\u0e07\u0e01\u0e4c</button>
      </section>

    </article>

    <section class="article-navigation">
      <h2>\u0e2d\u0e48\u0e32\u0e19\u0e40\u0e1e\u0e34\u0e48\u0e21\u0e40\u0e15\u0e34\u0e21</h2>

      ${relatedLinks ? `<ul>${relatedLinks}\n      </ul>` : ""}

      <p>
        <a href="${escapeHtml(section.url)}">
          \u0e14\u0e39${safeSectionName}\u0e17\u0e31\u0e49\u0e07\u0e2b\u0e21\u0e14
        </a>
      </p>

      <p>
        <a href="/">
          \u0e01\u0e25\u0e31\u0e1a\u0e2b\u0e19\u0e49\u0e32 HN FOOTBALL SCORE
        </a>
      </p>
    </section>

    ${articleSocialLinks?`<footer class="site-social-footer"><strong>\u0e15\u0e34\u0e14\u0e15\u0e32\u0e21 HN FOOTBALL SCORE</strong><div>${articleSocialLinks}</div></footer>`:""}

  </main>

  <script src="/assets/js/config.js"></script>
  <script src="/assets/js/article-v18.js"></script>
  <script src="/assets/js/article-social.js?v=20260825-3"></script>

</body>
</html>`;
}

export async function onRequest(context) {
  const request = context.request;
  const url = new URL(request.url);

  const slug = String(
    url.searchParams.get("slug") || ""
  ).trim();

  if (!slug) {
    return new Response(buildNotFoundPage(""), {
      status: 404,
      headers: {
        "content-type": "text/html; charset=UTF-8",
        "cache-control": "no-store"
      }
    });
  }

  const article = await fetchArticle(slug);

  if (!article) {
    return new Response(buildNotFoundPage(slug), {
      status: 404,
      headers: {
        "content-type": "text/html; charset=UTF-8",
        "cache-control": "no-store"
      }
    });
  }

  const [relatedArticles,socialLinks] = await Promise.all([fetchRelatedArticles(article, slug),fetchSocialLinks()]);
  const html = buildArticlePage(article, slug, relatedArticles, socialLinks);

  return new Response(html, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=UTF-8",
      "cache-control": "public, max-age=60, s-maxage=300",
      "x-content-type-options": "nosniff"
    }
  });
}
