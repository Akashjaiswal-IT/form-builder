import { OAuth2Client } from "google-auth-library";
import { env } from "../env";

let cached: OAuth2Client | null = null;

export function getGoogleOAuth2Client(): OAuth2Client {
  if (cached) return cached;
  cached = new OAuth2Client({
    client_id: env.GOOGLE_OAUTH_CLIENT_ID ?? "",
    client_secret: env.GOOGLE_OAUTH_CLIENT_SECRET ?? "",
    redirectUri: env.GOOGLE_OAUTH_REDIRECT_URI ?? "",
  });
  return cached;
}