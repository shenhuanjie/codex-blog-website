import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth/options";

export async function getAdminSession() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.isAdmin) {
    return null;
  }

  return session;
}
