import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
    }

    const url = new URL(req.url);
    const scope = url.searchParams.get("scope") || "my"; // "my", "school", "all"
    const subjectId = url.searchParams.get("subjectId");
    const gradeLevel = url.searchParams.get("gradeLevel");

    const where: any = { schoolId: session.schoolId };

    if (scope === "my") {
      where.authorId = session.userId;
    } else if (scope === "school") {
      where.status = { in: ["APPROVED", "PUBLISHED"] };
      where.visibility = { in: ["INTERNAL_SCHOOL", "PUBLIC"] };
    }

    if (subjectId) where.subjectId = subjectId;
    if (gradeLevel) where.gradeLevel = Number(gradeLevel);

    const resources = await db.learningResource.findMany({
      where,
      include: {
        subject: true,
        author: { select: { fullName: true, userCode: true } },
        versions: {
          orderBy: { versionNum: "desc" },
          take: 1,
          include: { blocks: { orderBy: { orderIndex: "asc" } } }
        }
      },
      orderBy: { updatedAt: "desc" }
    });

    return NextResponse.json({ success: true, data: resources });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session || (session.role !== "TEACHER" && session.role !== "ADMIN")) {
      return NextResponse.json({ error: "Không có quyền tạo học liệu." }, { status: 403 });
    }

    const body = await req.json();
    const { title, description, subjectId, gradeLevel, resourceCategory, blocks } = body;

    if (!title || !subjectId || !gradeLevel) {
      return NextResponse.json({ error: "Thiếu thông tin học liệu bắt buộc." }, { status: 400 });
    }

    const resource = await db.$transaction(async (tx) => {
      const res = await tx.learningResource.create({
        data: {
          schoolId: session.schoolId,
          authorId: session.userId,
          subjectId,
          gradeLevel: Number(gradeLevel),
          resourceCategory: resourceCategory || "A",
          title,
          description,
          status: "DRAFT",
          visibility: "PRIVATE",
          currentVersion: 1,
        }
      });

      const ver = await tx.resourceVersion.create({
        data: {
          resourceId: res.id,
          versionNum: 1,
          changelog: "Khởi tạo ban đầu",
          schemaVer: "1.0.0"
        }
      });

      if (Array.isArray(blocks) && blocks.length > 0) {
        await tx.resourceBlock.createMany({
          data: blocks.map((b: any, index: number) => ({
            versionId: ver.id,
            orderIndex: index,
            type: b.type,
            title: b.title,
            points: b.points || 1.0,
            contentJson: b.contentJson
          }))
        });
      }

      await tx.auditLog.create({
        data: {
          schoolId: session.schoolId,
          userId: session.userId,
          action: "CREATE_RESOURCE",
          resource: "LearningResource",
          recordId: res.id,
          details: { title, version: 1 }
        }
      });

      return res;
    });

    return NextResponse.json({ success: true, data: resource });
  } catch (error: any) {
    console.error("Create resource error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
