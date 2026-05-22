/**
 * NextAuth configuration — GitHub OAuth, JWT session strategy, and a
 * sign-in callback that calls the backend's /api/v1/users/upsert
 * endpoint to create or update the user's row in our Postgres.
 *
 * Why JWT instead of DB sessions: keeps NextAuth's tables out of our
 * schema. Our backend `users` table is the source of truth for plan +
 * quota; the JWT just stores the backend user_id so the proxy can
 * pass it to the API as X-User-Id.
 */
import type { NextAuthOptions } from "next-auth";
import GitHubProvider from "next-auth/providers/github";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const authOptions: NextAuthOptions = {
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID || "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
    }),
  ],
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/login",
  },
  callbacks: {
    /**
     * Called after every successful sign-in. Upserts the user into our
     * backend so plan + quota state is materialized. The JWT then
     * carries the backend user_id forward in `jwt()` / `session()`.
     */
    async signIn({ user, account, profile }) {
      if (!account || account.provider !== "github") return false;

      try {
        const res = await fetch(`${API_URL}/api/v1/users/upsert`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            github_id: String(account.providerAccountId || profile?.id || ""),
            github_username:
              (profile as { login?: string })?.login ||
              user.name ||
              user.email?.split("@")[0] ||
              "unknown",
            email: user.email || "",
            name: user.name || "",
            avatar_url: user.image || "",
          }),
        });
        if (!res.ok) {
          console.error("Backend user upsert failed:", res.status, await res.text());
          return false;
        }
        const data = await res.json();
        // Stash backend ID + plan on the user object — propagates to JWT.
        (user as { backendId?: string; plan?: string }).backendId = data.id;
        (user as { backendId?: string; plan?: string }).plan = data.plan;
        return true;
      } catch (err) {
        console.error("Backend user upsert error:", err);
        return false;
      }
    },

    async jwt({ token, user }) {
      // First call: copy backend ID + plan from the user object that
      // signIn() decorated.
      if (user) {
        token.backendId = (user as { backendId?: string }).backendId;
        token.plan = (user as { plan?: string }).plan;
      }
      return token;
    },

    async session({ session, token }) {
      // Expose backend ID + plan to the client-side session object so
      // components can read them without an extra API call.
      (session as { backendId?: string }).backendId = token.backendId as string;
      (session as { plan?: string }).plan = token.plan as string;
      return session;
    },
  },
};
