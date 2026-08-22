export async function onRequest(context) {
  const url = new URL(context.request.url);
  if (url.hostname === "fb55vip.com") {
    url.hostname = "www.fb55vip.com";
    return Response.redirect(url.toString(), 301);
  }
  if (url.pathname === "/article.html" && url.searchParams.get("slug")) {
    url.pathname = "/article";
    return Response.redirect(url.toString(), 301);
  }
  return context.next();
}
