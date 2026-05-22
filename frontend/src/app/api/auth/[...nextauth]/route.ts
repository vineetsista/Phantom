/**
 * NextAuth catch-all route. Handles /api/auth/signin, /api/auth/signout,
 * /api/auth/callback/github, /api/auth/session, etc. Configuration is in
 * `@/lib/auth`.
 */
import NextAuth from "next-auth";

import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
