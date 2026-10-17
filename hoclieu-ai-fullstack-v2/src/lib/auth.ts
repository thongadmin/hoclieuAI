import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";

const JWT_SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || "hoclieu_ai_secure_jwt_secret_key_minimum_32_characters"
);

export interface AuthSession {
  userId: string;
  email: string;
  fullName: string;
  role: "ADMIN" | "TEACHER" | "STUDENT";
  schoolId: string;
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export async function createSessionToken(payload: AuthSession): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);
}

export async function verifySessionToken(token: string): Promise<AuthSession | null> {
  try {
    const verified = await jwtVerify(token, JWT_SECRET);
    return verified.payload as unknown as AuthSession;
  } catch (error) {
    return null;
  }
}

export async function getServerSession(): Promise<AuthSession | null> {
  const cookieStore = cookies();
  const token = cookieStore.get("hoclieu_session")?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export function requireRole(session: AuthSession | null, allowedRoles: string[]): boolean {
  if (!session) return false;
  return allowedRoles.includes(session.role);
}
