import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import StatusDashboard from "../../components/status/StatusDashboard";
import StatusLogin from "../../components/status/StatusLogin";
import { isValidSession, STATUS_COOKIE, statusKey } from "../../../utils/statusAuth";
import { buildStatusSnapshot } from "../../../utils/statusSnapshot";

export const metadata: Metadata = {
  title: "Status · Now Playing",
  robots: { index: false, follow: false },
};

export default async function StatusPage() {
  // STATUS_KEY is read at runtime, so this must never be prerendered at build
  await connection();
  if (!statusKey()) notFound();

  const cookie = (await cookies()).get(STATUS_COOKIE)?.value;
  if (!isValidSession(cookie)) return <StatusLogin />;

  return <StatusDashboard initial={buildStatusSnapshot()} />;
}
