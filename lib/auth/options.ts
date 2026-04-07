import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GitHubProvider from "next-auth/providers/github";

import { isAdminLogin } from "@/lib/auth/admins";
import { getAuthSecret, getLocalAdminLogin, isAuthConfigured, isLocalAdminLoginEnabled } from "@/lib/env";

export const authOptions: NextAuthOptions = {
  secret: getAuthSecret(),
  providers: [
    ...(isAuthConfigured()
      ? [
          GitHubProvider({
            clientId: process.env.AUTH_GITHUB_ID?.trim() ?? "",
            clientSecret: process.env.AUTH_GITHUB_SECRET?.trim() ?? "",
          }),
        ]
      : []),
    ...(isLocalAdminLoginEnabled()
      ? [
          CredentialsProvider({
            id: "local-admin",
            name: "Local Admin",
            credentials: {},
            async authorize() {
              if (!isLocalAdminLoginEnabled()) {
                return null;
              }

              const login = getLocalAdminLogin();
              return {
                id: login,
                name: login,
                email: `${login}@local.invalid`,
              };
            },
          }),
        ]
      : []),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, profile, user, account }) {
      const localAdminLogin = getLocalAdminLogin();
      const isLocalAdminToken =
        account?.provider === "local-admin" ||
        (typeof token.login === "string" && token.login === localAdminLogin);

      if (isLocalAdminToken) {
        if (!isLocalAdminLoginEnabled()) {
          token.isAdmin = false;
          token.authProvider = undefined;
          return token;
        }

        token.login = localAdminLogin;
        token.isAdmin = true;
        token.authProvider = "local-admin";
        return token;
      }

      const githubProfile = profile as { login?: unknown } | undefined;
      const profileLogin =
        typeof githubProfile?.login === "string" ? githubProfile.login : undefined;
      const userLogin =
        typeof user?.name === "string" ? user.name : undefined;
      const login = profileLogin ?? userLogin ?? token.login;

      if (login) {
        token.login = login;
        token.isAdmin = await isAdminLogin(login);
        token.authProvider = "github";
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
