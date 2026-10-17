import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPassword, createSessionToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Vui lòng nhập email và mật khẩu." }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { email },
      include: { school: true }
    });

    if (!user || !user.isActive) {
      return NextResponse.json({ error: "Tài khoản không tồn tại hoặc đã bị khóa." }, { status: 401 });
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json({ error: "Mật khẩu không chính xác." }, { status: 401 });
    }

    const token = await createSessionToken({
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      schoolId: user.schoolId
    });

    // Ghi audit log
    await db.auditLog.create({
      data: {
        schoolId: user.schoolId,
        userId: user.id,
        action: "LOGIN",
        resource: "User",
        recordId: user.id,
        details: { userAgent: req.headers.get("user-agent") }
      }
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        schoolName: user.school.name
      }
    });

    response.cookies.set("hoclieu_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/"
    });

    return response;
  } catch (error: any) {
    console.error("Login API error:", error);
    return NextResponse.json({ error: "Đã có lỗi xảy ra phía máy chủ." }, { status: 500 });
  }
}
