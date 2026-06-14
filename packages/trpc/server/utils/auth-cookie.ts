export const AUTH_SESSION_COOKIE_NAME = "form_builder_session";

type CookieResponse = {
  append(header: "Set-Cookie", value: string): void;
};

type CookieOptions = {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "Lax" | "Strict" | "None";
  path?: string;
  expires?: Date;
  maxAgeSeconds?: number;
};

function serializeCookie(
  name: string,
  value: string,
  {
    httpOnly = true,
    secure = false,
    sameSite = "Lax",
    path = "/",
    expires,
    maxAgeSeconds,
  }: CookieOptions,
) {
  const attributes = [
    `${encodeURIComponent(name)}=${encodeURIComponent(value)}`,
    `Path=${path}`,
    `SameSite=${sameSite}`,
  ];

  if (httpOnly) attributes.push("HttpOnly");
  if (secure) attributes.push("Secure");
  if (expires) attributes.push(`Expires=${expires.toUTCString()}`);
  if (typeof maxAgeSeconds === "number") {
    attributes.push(`Max-Age=${maxAgeSeconds}`);
  }

  return attributes.join("; ");
}

export function readCookie(cookieHeader: string | undefined, name: string) {
  if (!cookieHeader) return undefined;

  const rawValue = cookieHeader
    .split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${name}=`))
    ?.slice(name.length + 1);

  if (!rawValue) return undefined;

  try {
    return decodeURIComponent(rawValue);
  } catch {
    return undefined;
  }
}

export function setAuthSessionCookie({
  res,
  sessionToken,
  expiresAt,
  isProduction,
}: {
  res: CookieResponse;
  sessionToken: string;
  expiresAt: Date;
  isProduction: boolean;
}) {
  res.append(
    "Set-Cookie",
    serializeCookie(AUTH_SESSION_COOKIE_NAME, sessionToken, {
      expires: expiresAt,
      maxAgeSeconds: Math.floor((expiresAt.getTime() - Date.now()) / 1000),
      secure: isProduction,
    }),
  );
}

export function clearAuthSessionCookie(
  res: CookieResponse,
  isProduction: boolean,
) {
  res.append(
    "Set-Cookie",
    serializeCookie(AUTH_SESSION_COOKIE_NAME, "", {
      expires: new Date(0),
      maxAgeSeconds: 0,
      secure: isProduction,
    }),
  );
}
