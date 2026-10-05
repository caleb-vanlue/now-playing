import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isAuthorizedRequest, STATUS_COOKIE, statusKey } from "../../../../utils/statusAuth";
import { buildStatusSnapshot } from "../../../../utils/statusSnapshot";

/** Instance health and viewer stats for the /status page; needs STATUS_KEY. */
export async function GET(request: Request) {
  // Unconfigured looks the same as nonexistent
  if (!statusKey()) return new NextResponse(null, { status: 404 });

  const cookie = (await cookies()).get(STATUS_COOKIE)?.value;
  if (!isAuthorizedRequest(request, cookie)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(buildStatusSnapshot(), {
    headers: { "Cache-Control": "no-store" },
  });
}
