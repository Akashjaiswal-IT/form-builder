import { router } from "./trpc";
import { authRouter } from "./routes/auth/route";
import { healthRouter } from "./routes/health/route";
import { formsRouter } from "./routes/forms/route";

export const serverRouter = router({
  auth: authRouter,
  health: healthRouter,
  forms: formsRouter,
});

export { createContext } from "./context";
export type ServerRouter = typeof serverRouter;

export { authenticatedUserSchema, getAuthenticationMethodOutputSchema } from "@repo/services/user/model";