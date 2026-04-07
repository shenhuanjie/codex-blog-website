import type { Session } from "next-auth";
import { getServerSession } from "next-auth";
import { getToken } from "next-auth/jwt";
import { headers } from "next/headers";
import { NextRequest } from "next/server";

import { authOptions } from "@/lib/auth/options";
import { getAuthSecret } from "@/lib/env";

async function getAdminSessionFromToken(): Promise<Session | null> {
  const cookieHeader = (await headers()).get("cookie");

  if (!cookieHeader) {
    return null;
  }

  try {
    const request = new NextRequest("http://localhost/admin", {
      headers: new Headers({
        cookie: cookieHeader,
      }),
    });
    const token = await getToken({
      req: request,
      secret: getAuthSecret(),
    });

    if (!token?.isAdmin) {
      return null;
    }

    const login = typeof token.login === "string" ? token.login : undefined;
    const name = typeof token.name === "string" ? token.name : login;
    const email = typeof token.email === "string" ? token.email : null;
    const image = typeof token.picture === "string" ? token.picture : null;
    const expires =
      typeof token.exp === "number"
        ? new Date(token.exp * 1000).toISOString()
        : new Date(Date.now() + 60 * 60 * 1000).toISOString();

    return {
      user: {
        name,
        email,
        image,
        login,
        isAdmin: true,
      },
      expires,
    };
  } catch {
    return null;
  }
}

export async function getAdminSession() {
  const session = await getServerSession(authOptions);

  if (session?.user?.isAdmin) {
    return session;
  }

  return getAdminSessionFromToken();
}
