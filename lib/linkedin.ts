export const LINKEDIN_STATE_COOKIE = "linkedin_oauth_state";
export const LINKEDIN_SCOPES = "openid profile w_member_social";

export function linkedinRedirectUri(): string {
  const base = process.env.NEXTAUTH_URL;
  if (!base) throw new Error("NEXTAUTH_URL is not set");
  return `${base}/api/auth/linkedin/callback`;
}

export function buildLinkedinAuthorizationUrl(state: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.LINKEDIN_CLIENT_ID ?? "",
    redirect_uri: linkedinRedirectUri(),
    state,
    scope: LINKEDIN_SCOPES,
  });
  return `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
}

export type LinkedinTokenResponse = {
  access_token: string;
  expires_in: number;
  scope: string;
};

export async function exchangeLinkedinCode(code: string): Promise<LinkedinTokenResponse> {
  const res = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: linkedinRedirectUri(),
      client_id: process.env.LINKEDIN_CLIENT_ID ?? "",
      client_secret: process.env.LINKEDIN_CLIENT_SECRET ?? "",
    }),
  });

  if (!res.ok) {
    throw new Error(`LinkedIn token exchange failed: ${res.status} ${await res.text()}`);
  }

  return res.json();
}

export type LinkedinUserInfo = { sub: string; name?: string };

export async function fetchLinkedinUserInfo(accessToken: string): Promise<LinkedinUserInfo> {
  const res = await fetch("https://api.linkedin.com/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error(`LinkedIn userinfo fetch failed: ${res.status} ${await res.text()}`);
  }

  return res.json();
}

function currentLinkedinApiVersion(): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${year}${month}`;
}

export async function createLinkedinPost(
  accessToken: string,
  personSub: string,
  commentary: string
): Promise<string> {
  const res = await fetch("https://api.linkedin.com/rest/posts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0",
      "Linkedin-Version": currentLinkedinApiVersion(),
    },
    body: JSON.stringify({
      author: `urn:li:person:${personSub}`,
      commentary,
      visibility: "PUBLIC",
      distribution: {
        feedDistribution: "MAIN_FEED",
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
      lifecycleState: "PUBLISHED",
      isReshareDisabledByAuthor: false,
    }),
  });

  if (!res.ok) {
    throw new Error(`LinkedIn post creation failed: ${res.status} ${await res.text()}`);
  }

  const postUrn = res.headers.get("x-restli-id");
  if (!postUrn) {
    throw new Error("LinkedIn post creation succeeded but returned no x-restli-id header");
  }

  return postUrn;
}
