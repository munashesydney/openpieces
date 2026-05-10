import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { findUserByEmail, verifyPassword } from "./lib/services/user.service";

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await findUserByEmail(credentials.email as string);
        if (!user) return null;

        const valid = await verifyPassword(
          credentials.password as string,
          user.password,
        );
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        };
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    authorized({ request, auth }) {
      // Service subdomains are always public.
      const host =
        typeof request?.headers?.get === "function"
          ? (request.headers.get("host") ?? "")
          : "";
      const serviceDomain = process.env.SERVICE_DOMAIN?.trim();
      if (serviceDomain && host.split(":")[0].endsWith("." + serviceDomain)) {
        return true;
      }
      return !!auth?.user;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },

  cookies: {
    sessionToken: {
      name: "op.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
});
