import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import type { User } from "./lib/definitions";
import bcrypt from "bcrypt";
import { sql } from "@vercel/postgres";
async function getUser(email: string) {
  try {
    const user = await sql<User>`SELECT * FROM USERS where email=${email}`;
    return user.rows[0];
  } catch (error) {
    console.log("Failed to fetch user", error);
    throw new Error("Failedto fetch user");
  }
}
export const { auth, signOut, signIn } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsedCredentials = z
          .object({ email: z.string().email(), password: z.string().min(6) })
          .safeParse(credentials);
        if (parsedCredentials.success) {
          const { email, password } = parsedCredentials.data;
          const user = await getUser(email);
          if (!user) return null;
          const passwordMatched = await bcrypt.compare(password, user.password);
          if (passwordMatched) return user;
        }
        console.log("invalid credentials");
        return null;
      },
    }),
  ],
});
