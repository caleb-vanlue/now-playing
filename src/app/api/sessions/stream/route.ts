import { sessionHub } from "../../../../../utils/sessionHub";

// Keeps idle connections from being dropped by proxies
const HEARTBEAT_MS = 20_000;
// How long a browser waits before reconnecting after the stream drops
const RECONNECT_MS = 5_000;

/**
 * Server-Sent Events feed of active sessions. Every viewer shares the one
 * upstream connection per media server held by the session hub.
 */
export async function GET(request: Request) {
  const encoder = new TextEncoder();
  const refresh = new URL(request.url).searchParams.has("refresh");
  let cleanup = () => {};

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (chunk: string) => {
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          // Stream already closed; the abort handler finishes cleanup
        }
      };

      send(`retry: ${RECONNECT_MS}\n\n`);
      const unsubscribe = sessionHub.subscribe((message) => {
        send(`data: ${JSON.stringify(message)}\n\n`);
      });
      if (refresh) sessionHub.refresh();
      const heartbeat = setInterval(() => send(": ping\n\n"), HEARTBEAT_MS);

      cleanup = () => {
        cleanup = () => {};
        clearInterval(heartbeat);
        unsubscribe();
      };

      request.signal.addEventListener(
        "abort",
        () => {
          cleanup();
          try {
            controller.close();
          } catch {
            // Already closed
          }
        },
        { once: true }
      );
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      // no-transform stops compression from buffering events
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // Disables response buffering in nginx-style reverse proxies
      "X-Accel-Buffering": "no",
    },
  });
}
