// Shared plumbing for the hub's upstream media-server connections

// Node's built-in WebSocket (undici) accepts request headers, which keeps
// credentials out of URLs; the DOM typings only know the browser constructor
type NodeWebSocketConstructor = new (
  url: string,
  init?: { headers?: Record<string, string> }
) => WebSocket;

export function openWebSocket(url: string, headers: Record<string, string>): WebSocket {
  return new (WebSocket as unknown as NodeWebSocketConstructor)(url, { headers });
}

/** Resolves `path` against a server's base URL (keeping any base path) as ws/wss. */
export function webSocketUrl(baseUrl: string, path: string): string {
  const url = new URL(`./${path}`, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  return url.toString();
}

export function reconnectDelay(failures: number): number {
  return Math.min(5000 * Math.pow(1.5, failures - 1), 60_000);
}
