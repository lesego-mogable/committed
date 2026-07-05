import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { encrypt } from "@/lib/crypto";
import {
  LINKEDIN_STATE_COOKIE,
  exchangeLinkedinCode,
  fetchLinkedinUserInfo,
} from "@/lib/linkedin";

export async function GET(request: Request) {
  const userId = await requireUserId();

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const cookieStore = await cookies();
  const expectedState = cookieStore.get(LINKEDIN_STATE_COOKIE)?.value;
  cookieStore.delete(LINKEDIN_STATE_COOKIE);

  if (!code || !state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(new URL("/connect?error=linkedin_state_mismatch", request.url));
  }

  const tokenResponse = await exchangeLinkedinCode(code);
  const userInfo = await fetchLinkedinUserInfo(tokenResponse.access_token);

  await prisma.connectedAccount.upsert({
    where: { userId_provider: { userId, provider: "linkedin" } },
    update: {
      providerUserId: userInfo.sub,
      accessToken: encrypt(tokenResponse.access_token),
      tokenExpiresAt: new Date(Date.now() + tokenResponse.expires_in * 1000),
      scope: tokenResponse.scope,
    },
    create: {
      userId,
      provider: "linkedin",
      providerUserId: userInfo.sub,
      accessToken: encrypt(tokenResponse.access_token),
      tokenExpiresAt: new Date(Date.now() + tokenResponse.expires_in * 1000),
      scope: tokenResponse.scope,
    },
  });

  return NextResponse.redirect(new URL("/connect", request.url));
}
