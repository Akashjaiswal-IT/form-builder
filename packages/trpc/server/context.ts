// Instead of importing from express, define only what you actually use
export interface AppRequest {
  headers: {
    cookie?: string;
  };
}

export interface AppResponse {
  append(header: "Set-Cookie", value: string): void;
  setHeader(name: string, value: string | string[]): void;
  clearCookie?(name: string, options?: object): void;
}

export async function createContext({ req, res }: { req: AppRequest; res: AppResponse }) {
  return { req, res };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
