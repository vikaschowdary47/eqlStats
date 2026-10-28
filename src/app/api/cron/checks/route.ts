import { NextResponse, type NextRequest } from "next/server";
import { checkDue } from "@/lib/integrations/runner";
import { serverEnv } from "@/lib/env";
import { safeEqual } from "@/lib/crypto";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Called by Vercel Cron (or any scheduler) with: Authorization: Bearer <CRON_SECRET>
export async function GET(request: NextRequest) {
  const secret = serverEnv().cronSecret;
  const auth = request.headers.get("authorization") ?? "";
  if (!secret || !safeEqual(auth, `Bearer ${secret}`)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const checked = await checkDue();
  return NextResponse.json({ checked });
}
