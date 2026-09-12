import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.isActive) return null;

        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id;
        token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
      }
      return session;
    },
  },
};

// Helper: which roles are allowed to do a given action.
// Kept centralized so permission logic isn't scattered across routes.
export const ROLES = {
  ADMIN: "ADMIN",
  MANAGER: "MANAGER",
  EMPLOYEE: "EMPLOYEE",
  AGENT: "AGENT",
} as const;

export function canManageUsers(role?: string) {
  return role === ROLES.ADMIN;
}

export function canCreateCustomer(role?: string) {
  return role === ROLES.ADMIN || role === ROLES.MANAGER || role === ROLES.EMPLOYEE;
}

export function canEditServiceStatus(role?: string) {
  return role === ROLES.ADMIN || role === ROLES.MANAGER || role === ROLES.EMPLOYEE;
}

export function canDeleteCustomer(role?: string) {
  return role === ROLES.ADMIN;
}

export function canManageAgents(role?: string) {
  return role === ROLES.ADMIN || role === ROLES.MANAGER;
}

export function canAssignWork(role?: string) {
  return role === ROLES.ADMIN || role === ROLES.MANAGER;
}

export function canManageServices(role?: string) {
  return role === ROLES.ADMIN || role === ROLES.MANAGER;
}

export function canManagePayments(role?: string) {
  return role === ROLES.ADMIN || role === ROLES.MANAGER;
}

// Creating/editing an Agent's login account (username/password,
// active/inactive) — same tier as managing the Agent record itself.
export function canManageAgentUsers(role?: string) {
  return role === ROLES.ADMIN || role === ROLES.MANAGER;
}

export function canConfigureUpi(role?: string) {
  return role === ROLES.ADMIN || role === ROLES.MANAGER;
}

// Verifying/approving/rejecting an agent's submitted payment request.
export function canVerifyPayments(role?: string) {
  return role === ROLES.ADMIN || role === ROLES.MANAGER;
}

export function isAgentRole(role?: string) {
  return role === ROLES.AGENT;
}
