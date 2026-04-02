import type { NextAuthOptions } from "next-auth";
import GitHubProvider from "next-auth/providers/github";

import { isAdminLogin } from "@/lib/auth/admins";
import { isAuthConfigured } from "@/lib/env";

export const authOptions: NextAuthOptions = {
  secret: process.env.AUTH_SECRET?.trim(),
  providers: isAuthConfigured()
    ? [
        GitHubProvider({
          clientId: process.env.AUTH_GITHUB_ID?.trim() ?? "",
          clientSecret: process.env.AUTH_GITHUB_SECRET?.trim() ?? "",
        }),
      ]
    : [],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, profile, user }) {
      const githubProfile = profile as { login?: unknown } | undefined;
      const profileLogin =
        typeof githubProfile?.login === "string" ? githubProfile.login : undefined;
      const userLogin =
        typeof user?.name === "string" ? user.name : undefined;
      const login = profileLogin ?? userLogin ?? token.login;

      if (login) {
        token.login = login;
        token.isAdmin = await isAdminLogin(login);
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.login =
          typeof token.login === "string" ? token.login : undefined;
        session.user.isAdmin = Boolean(token.isAdmin);
      }

      return session;
    },
  },
};
