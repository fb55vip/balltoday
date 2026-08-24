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
    type.includes("à¸à¹à¸²à¸§")
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

  if (type.includes("news") || type.includes("à¸à¹à¸²à¸§")) {
    return {
      name: "à¸à¹à¸²à¸§à¸à¸¸à¸à¸à¸­à¸¥",
      url: `${SITE_URL}/news`
    };
  }

  if (
    type.includes("knowledge") ||
    type.includes("evergreen") ||
    type.includes("à¸à¸§à¸²à¸¡à¸£à¸¹à¹")
  ) {
    return {
      name: "à¸à¸§à¸²à¸¡à¸£à¸¹à¹à¸à¸¸à¸à¸à¸­à¸¥",
      url: `${SITE_URL}/knowledge`
    };
  }

  return {
    name: "à¸à¸à¸§à¸´à¹à¸à¸£à¸²à¸°à¸«à¹",
    url: `${SITE_URL}/analysis`
  };
}

function getContentType(article) {
  const type = String(
    article.content_type || article.type || article.category || ""
  ).toLowerCase();
  if (type.includes("news") || type.includes("à¸à¹à¸²à¸§")) return "news";
  if (type.includes("knowledge") || type.includes("evergreen") || type.includes("à¸à¸§à¸²à¸¡à¸£à¸¹à¹")) return "evergreen";
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

function buildNotFoundPage(slug) {
  const title = "à¹à¸¡à¹à¸à¸à¸à¸à¸à¸§à¸²à¸¡ | HN FOOTBALL SCORE";
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
    <h1>à¹à¸¡à¹à¸à¸à¸à¸à¸à¸§à¸²à¸¡</h1>
    <p>à¸à¸à¸à¸§à¸²à¸¡à¸à¸µà¹à¸à¸¸à¸à¸à¸³à¸¥à¸±à¸à¸à¹à¸à¸«à¸²à¸­à¸²à¸à¸à¸¹à¸à¸¢à¹à¸²à¸¢à¸«à¸£à¸·à¸­à¸¥à¸à¸­à¸­à¸à¹à¸¥à¹à¸§</p>
    <p><a href="${SITE_URL}/">à¸à¸¥à¸±à¸à¸«à¸à¹à¸² HN FOOTBALL SCORE</a></p>
  </main>
</body>
</html>`;
}

function buildArticlePage(article, slug, relatedArticles = []) {
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
      url: `${SITE_URL}/author.html`
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/assets/og-image.jpg`
      }
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
        name: "à¸«à¸à¹à¸²à¹à¸£à¸",
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
  const safeSectionName = escapeHtml(section.name);
  const relatedLinks = relatedArticles.map((item) => `
        <a href="/article?slug=${encodeURIComponent(item.slug)}">
          <strong>${escapeHtml(item.title || item.headline || item.slug)}</strong>
          <span>${safeSectionName}</span>
        </a>`).join("");

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

  <link rel="stylesheet" href="/assets/css/article-v18.css?v=20260825-final-v4">
</head>

<body>

  <header class="article-header">
    <a href="/" aria-label="HN FOOTBALL SCORE">â½ <strong>HN <span>FOOTBALL SCORE</span></strong></a>
  </header>

  <main class="article-shell">

    <nav class="breadcrumbs" aria-label="breadcrumb">
      <a href="/">à¸«à¸à¹à¸²à¹à¸£à¸</a>
      <span> âº </span>
      <a href="${escapeHtml(section.url)}">${safeSectionName}</a>
      <span> âº </span>
      <span>${safeHeadline}</span>
    </nav>

    <article class="article-card">
      <div class="body">

      <header class="article-title-block">
        <p class="kicker">${safeSectionName}</p>

        <h1>${safeHeadline}</h1>

        ${
          safeIntro
            ? `<p class="lead article-intro">${safeIntro}</p>`
            : ""
        }

        <div class="meta article-meta">
          <span>à¹à¸à¸¢ ${safeAuthor}</span>

          ${
            displayPublished
              ? `<span>à¹à¸à¸¢à¹à¸à¸£à¹ ${escapeHtml(displayPublished)}</span>`
              : ""
          }

          ${
            displayModified &&
            displayModified !== displayPublished
              ? `<span>à¸­à¸±à¸à¹à¸à¸ ${escapeHtml(displayModified)}</span>`
              : ""
          }
        </div>
      </header>

      ${
        image
          ? `
            <figure class="article-cover">
              <img class="cover"
                src="${escapeHtml(image)}"
                alt="${safeHeadline}"
                loading="eager"
                fetchpriority="high"
              >
            </figure>
          `
          : ""
      }

      <div class="content article-content">
        ${body}
      </div>

    <section class="related article-navigation">
      <h2>à¸­à¹à¸²à¸à¹à¸à¸´à¹à¸¡à¹à¸à¸´à¸¡</h2>

      ${relatedLinks ? `<div class="related-grid">${relatedLinks}\n      </div>` : ""}

      <div class="related-grid related-home-links">
        <a href="${escapeHtml(section.url)}"><strong>à¸à¸¹${safeSectionName}à¸à¸±à¹à¸à¸«à¸¡à¸</strong><span>à¸à¸¥à¸±à¸à¹à¸à¸¢à¸±à¸à¸«à¸à¹à¸²à¸£à¸§à¸¡à¸à¸à¸à¸§à¸²à¸¡</span></a>
        <a href="/"><strong>HN FOOTBALL SCORE</strong><span>à¸à¸¥à¸±à¸à¸«à¸à¹à¸²à¸«à¸¥à¸±à¸</span></a>
      </div>
    </section>

      <div class="brand-foot">HN FOOTBALL SCORE â¢ www.fb55vip.com</div>
      </div>
    </article>

  </main>

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

  const relatedArticles = await fetchRelatedArticles(article, slug);
  const html = buildArticlePage(article, slug, relatedArticles);

  return new Response(html, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=UTF-8",
      "cache-control": "public, max-age=60, s-maxage=300",
      "x-content-type-options": "nosniff"
    }
  });
}
