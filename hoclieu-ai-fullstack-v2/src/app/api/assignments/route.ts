import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });

    const url = new URL(req.url);
    const classId = url.searchParams.get("classId");

    let where: any = { schoolId: session.schoolId };

    if (session.role === "STUDENT") {
      // Tìm lớp học sinh tham gia
      const enrollments = await db.enrollment.findMany({
        where: { studentId: session.userId },
        select: { classId: true }
      });
      const classIds = enrollments.map(e => e.classId);
      where.classId = { in: classIds };
      where.status = "OPEN";
    } else if (session.role === "TEACHER") {
      where.createdById = session.userId;
      if (classId) where.classId = classId;
    }

    const assignments = await db.assignment.findMany({
      where,
      include: {
        class: true,
        resource: { select: { title: true, gradeLevel: true, resourceCategory: true } },
        resourceVersion: {
          include: { blocks: { select: { id: true, title: true, type: true, points: true } } }
        },
        attempts: session.role === "STUDENT" ? {
          where: { studentId: session.userId },
          select: { id: true, attemptNumber: true, status: true, totalScore: true, maxScore: true, submittedAt: true }
        } : undefined
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json({ success: true, data: assignments });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session || (session.role !== "TEACHER" && session.role !== "ADMIN")) {
      return NextResponse.json({ error: "Không có quyền giao bài." }, { status: 403 });
    }

    const body = await req.json();
    const { classId, resourceId, title, instruction, openAt, dueAt, maxAttempts, allowAiHint, scorePolicy, showAnswerPolicy } = body;

    if (!classId || !resourceId || !title) {
      return NextResponse.json({ error: "Vui lòng nhập đầy đủ thông tin giao bài." }, { status: 400 });
    }

    // Lấy phiên bản mới nhất đã xuất bản/duyệt của học liệu để khóa phiên bản bất biến
    const resource = await db.learningResource.findUnique({
      where: { id: resourceId },
      include: {
        versions: {
          orderBy: { versionNum: "desc" },
          take: 1
        }
      }
    });

    if (!resource || resource.versions.length === 0) {
      return NextResponse.json({ error: "Không tìm thấy phiên bản hợp lệ của học liệu này." }, { status: 404 });
    }

    const versionToLock = resource.versions[0];

    const assignment = await db.assignment.create({
      data: {
        schoolId: session.schoolId,
        classId,
        resourceId,
        resourceVersionId: versionToLock.id, // Bất biến
        createdById: session.userId,
        title,
        instruction,
        openAt: openAt ? new Date(openAt) : new Date(),
        dueAt: dueAt ? new Date(dueAt) : null,
        maxAttempts: Number(maxAttempts) || 1,
        allowAiHint: Boolean(allowAiHint),
        scorePolicy: scorePolicy || "HIGHEST",
        showAnswerPolicy: showAnswerPolicy || "AFTER_DUE",
        status: "OPEN"
      }
    });

    // Audit log
    await db.auditLog.create({
      data: {
        schoolId: session.schoolId,
        userId: session.userId,
        action: "CREATE_ASSIGNMENT",
        resource: "Assignment",
        recordId: assignment.id,
        details: { classId, resourceId, versionId: versionToLock.id }
      }
    });

    return NextResponse.json({ success: true, data: assignment });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
