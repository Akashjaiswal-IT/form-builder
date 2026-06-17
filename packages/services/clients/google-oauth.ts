import { OAuth2Client } from "google-auth-library";

let cached: OAuth2Client | null = null;

export function getGoogleOAuth2Client(config: {
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
}): OAuth2Client {
  if (cached) return cached;
  cached = new OAuth2Client({
    client_id: config.clientId ?? "",
    client_secret: config.clientSecret ?? "",
    redirectUri: config.redirectUri ?? "",
  });
  return cached;
}