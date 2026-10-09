const WORKER_ORIGIN = "https://habitflow-app.habitflow-app.workers.dev";

const HOP_BY_HOP_HEADERS = [
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "host",
];

export const onRequest = async ({ request }: { request: Request }): Promise<Response> => {
  const incomingUrl = new URL(request.url);
  const upstreamUrl = new URL(
    `${incomingUrl.pathname}${incomingUrl.search}`,
    WORKER_ORIGIN,
  );

  const headers = new Headers(request.headers);
  for (const header of HOP_BY_HOP_HEADERS) headers.delete(header);
  headers.set("x-forwarded-host", incomingUrl.host);
  headers.set("x-forwarded-proto", incomingUrl.protocol.slice(0, -1));

  const init: RequestInit = {
    method: request.method,
    headers,
    redirect: "manual",
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = request.body;
  }

  const upstreamResponse = await fetch(new Request(upstreamUrl, init));
  const responseHeaders = new Headers(upstreamResponse.headers);
  const location = responseHeaders.get("location");

  // Keep redirects on the shorter pages.dev hostname when the app redirects
  // to its underlying workers.dev hostname.
  if (location) {
    try {
      const redirectUrl = new URL(location, WORKER_ORIGIN);
      if (redirectUrl.origin === WORKER_ORIGIN) {
        responseHeaders.set(
          "location",
          `${redirectUrl.pathname}${redirectUrl.search}${redirectUrl.hash}`,
        );
      }
    } catch {
      // Leave non-URL Location values unchanged.
    }
  }

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers: responseHeaders,
  });
};
