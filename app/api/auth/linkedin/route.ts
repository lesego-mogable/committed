import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireUserId } from "@/lib/session";
import { buildLinkedinAuthorizationUrl, LINKEDIN_STATE_COOKIE } from "@/lib/linkedin";

export async function GET() {
  try {
    await requireUserId();
  } catch {
    redirect("/");
  }

  const state = randomBytes(16).toString("hex");
  const cookieStore = await cookies();
  cookieStore.set(LINKEDIN_STATE_COOKIE, state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  redirect(buildLinkedinAuthorizationUrl(state));
}
