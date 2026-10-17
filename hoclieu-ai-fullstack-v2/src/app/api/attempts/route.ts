import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { gradeBlockResponse } from "@/lib/grading/auto-grader";
import { createIdempotencyKey } from "@/lib/security/idempotency";

export async function POST(req: NextRequest) {
  // Tạo hoặc lấy Attempt
  try {
    const session = await getServerSession();
    if (!session || session.role !== "STUDENT") {
      return NextResponse.json({ error: "Chỉ học sinh mới có thể làm bài." }, { status: 403 });
    }

    const { assignmentId } = await req.json();
    const assignment = await db.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        class: {
          include: {
            enrollments: { where: { studentId: session.userId } }
          }
        },
        resourceVersion: {
          include: { blocks: { orderBy: { orderIndex: "asc" } } }
        }
      }
    });

    if (!assignment || assignment.class.enrollments.length === 0) {
      return NextResponse.json({ error: "Bạn không có quyền truy cập bài tập này." }, { status: 403 });
    }

    // Kiểm tra số lần làm bài
    const existingAttempts = await db.attempt.findMany({
      where: { assignmentId, studentId: session.userId },
      orderBy: { attemptNumber: "desc" }
    });

    if (existingAttempts.length >= assignment.maxAttempts) {
      const last = existingAttempts[0];
      if (last.status === "IN_PROGRESS") {
        return NextResponse.json({ success: true, data: last });
      }
      return NextResponse.json({ error: "Bạn đã hết số lượt làm bài cho phép." }, { status: 400 });
    }

    // Nếu có lượt đang làm dở dang, trả về để tiếp tục
    const inProgress = existingAttempts.find(a => a.status === "IN_PROGRESS");
    if (inProgress) {
      return NextResponse.json({ success: true, data: inProgress });
    }

    const nextAttemptNum = existingAttempts.length + 1;
    const newAttempt = await db.attempt.create({
      data: {
        assignmentId,
        studentId: session.userId,
        attemptNumber: nextAttemptNum,
        status: "IN_PROGRESS",
      }
    });

    // Ghi sự kiện bắt đầu học
    const idemKey = createIdempotencyKey([session.userId, assignment.resourceId, "START", nextAttemptNum]);
    await db.learningEvent.upsert({
      where: { idempotencyKey: idemKey },
      update: {},
      create: {
        schoolId: session.schoolId,
        userId: session.userId,
        resourceId: assignment.resourceId,
        eventType: "START",
        idempotencyKey: idemKey
      }
    });

    return NextResponse.json({ success: true, data: newAttempt });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  // Lưu tiến độ hoặc Nộp bài
  try {
    const session = await getServerSession();
    if (!session || session.role !== "STUDENT") {
      return NextResponse.json({ error: "Chỉ học sinh mới có thể nộp bài." }, { status: 403 });
    }

    const { attemptId, isFinalSubmit, clientState, answers } = await req.json();

    const attempt = await db.attempt.findUnique({
      where: { id: attemptId },
      include: {
        assignment: {
          include: {
            resourceVersion: { include: { blocks: true } }
          }
        }
      }
    });

    if (!attempt || attempt.studentId !== session.userId) {
      return NextResponse.json({ error: "Không tìm thấy phiên làm bài hợp lệ." }, { status: 404 });
    }

    if (attempt.status !== "IN_PROGRESS") {
      return NextResponse.json({ error: "Bài làm này đã được nộp trước đó." }, { status: 400 });
    }

    // Lưu từng câu trả lời và tự động chấm các câu hỏi đóng
    if (answers && typeof answers === "object") {
      for (const [blockId, ans] of Object.entries(answers)) {
        const block = attempt.assignment.resourceVersion.blocks.find(b => b.id === blockId);
        if (block) {
          const grade = gradeBlockResponse(block.type, block.contentJson, ans, block.points);
          await db.blockResponse.upsert({
            where: { attemptId_blockId: { attemptId, blockId } },
            update: {
              answerJson: ans as any,
              autoScore: grade.score,
              isCorrect: grade.isCorrect,
              savedAt: new Date()
            },
            create: {
              attemptId,
              blockId,
              answerJson: ans as any,
              autoScore: grade.score,
              isCorrect: grade.isCorrect
            }
          });
        }
      }
    }

    // Nếu chỉ là tự động lưu (autosave)
    if (!isFinalSubmit) {
      const updated = await db.attempt.update({
        where: { id: attemptId },
        data: { clientState: clientState || undefined }
      });
      return NextResponse.json({ success: true, saved: true, data: updated });
    }

    // Xử lý nộp bài chính thức
    const allResponses = await db.blockResponse.findMany({
      where: { attemptId }
    });

    let totalScore = 0;
    let maxScore = 0;
    attempt.assignment.resourceVersion.blocks.forEach(b => {
      maxScore += b.points;
      const resp = allResponses.find(r => r.blockId === b.id);
      if (resp && resp.autoScore !== null) {
        totalScore += resp.autoScore;
      }
    });

    const completedAttempt = await db.attempt.update({
      where: { id: attemptId },
      data: {
        status: "SUBMITTED",
        submittedAt: new Date(),
        totalScore,
        maxScore,
        clientState: clientState || undefined
      }
    });

    // Ghi sự kiện hoàn thành
    const idemKey = createIdempotencyKey([session.userId, attempt.assignment.resourceId, "COMPLETE", attempt.attemptNumber]);
    await db.learningEvent.upsert({
      where: { idempotencyKey: idemKey },
      update: {},
      create: {
        schoolId: session.schoolId,
        userId: session.userId,
        resourceId: attempt.assignment.resourceId,
        eventType: "COMPLETE",
        idempotencyKey: idemKey
      }
    });

    return NextResponse.json({ success: true, submitted: true, data: completedAttempt });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
