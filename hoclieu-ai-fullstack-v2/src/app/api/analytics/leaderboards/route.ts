import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });

    const schoolId = session.schoolId;

    // 1. Giáo viên tạo nhiều học liệu nhất (đã duyệt & xuất bản, không tính bản sao)
    const teachers = await db.user.findMany({
      where: { schoolId, role: "TEACHER", isActive: true },
      select: {
        id: true,
        fullName: true,
        userCode: true,
        createdResources: {
          where: {
            status: { in: ["APPROVED", "PUBLISHED"] },
            originalSourceId: null // Loại bản sao chép
          },
          select: { id: true }
        }
      }
    });

    const topCreators = teachers
      .map(t => ({
        id: t.id,
        fullName: t.fullName,
        userCode: t.userCode,
        publishedCount: t.createdResources.length
      }))
      .filter(t => t.publishedCount > 0)
      .sort((a, b) => b.publishedCount - a.publishedCount)
      .slice(0, 10);

    // 2. Giáo viên có học liệu được tương tác nhiều nhất
    // Tính tổng lượt học hợp lệ (START/COMPLETE) trên các học liệu do giáo viên tạo gốc
    const topInteractedTeachers = await Promise.all(
      teachers.map(async (t) => {
        const events = await db.learningEvent.findMany({
          where: {
            schoolId,
            resource: { authorId: t.id, originalSourceId: null },
            eventType: { in: ["START", "COMPLETE"] }
          },
          select: { userId: true, eventType: true }
        });

        const uniqueStudents = new Set(events.map(e => e.userId)).size;
        const completeCount = events.filter(e => e.eventType === "COMPLETE").length;

        return {
          id: t.id,
          fullName: t.fullName,
          userCode: t.userCode,
          uniqueStudents,
          totalInteractions: events.length,
          completedCount: completeCount
        };
      })
    );

    const sortedInteracted = topInteractedTeachers
      .filter(t => t.totalInteractions > 0)
      .sort((a, b) => b.totalInteractions - a.totalInteractions)
      .slice(0, 10);

    // 3. Học sinh tham gia học nhiều nhất (số học liệu khác nhau đã hoàn thành)
    const students = await db.user.findMany({
      where: { schoolId, role: "STUDENT", isActive: true },
      select: {
        id: true,
        fullName: true,
        userCode: true,
        learningEvents: {
          where: { eventType: "COMPLETE" },
          select: { resourceId: true, timestamp: true }
        }
      }
    });

    const topActiveStudents = students
      .map(s => {
        const uniqueResources = new Set(s.learningEvents.map(e => e.resourceId)).size;
        const activeDays = new Set(s.learningEvents.map(e => e.timestamp.toISOString().split("T")[0])).size;
        return {
          id: s.id,
          fullName: s.fullName,
          userCode: s.userCode,
          uniqueCompletedResources: uniqueResources,
          activeDays
        };
      })
      .filter(s => s.uniqueCompletedResources > 0)
      .sort((a, b) => b.uniqueCompletedResources - a.uniqueCompletedResources)
      .slice(0, 10);

    // 4. Học sinh có kết quả tốt nhất (tỷ lệ điểm trung bình trên số bài tối thiểu)
    const studentAttempts = await db.attempt.findMany({
      where: {
        assignment: { schoolId },
        status: "SUBMITTED",
        maxScore: { gt: 0 }
      },
      include: {
        student: { select: { id: true, fullName: true, userCode: true } }
      }
    });

    const studentScoresMap: Record<string, { fullName: string; userCode: string; scores: number[] }> = {};
    studentAttempts.forEach(att => {
      if (att.totalScore !== null && att.maxScore && att.maxScore > 0) {
        const normalized = (att.totalScore / att.maxScore) * 10; // Quy đổi thang điểm 10
        if (!studentScoresMap[att.studentId]) {
          studentScoresMap[att.studentId] = {
            fullName: att.student.fullName,
            userCode: att.student.userCode,
            scores: []
          };
        }
        studentScoresMap[att.studentId].scores.push(normalized);
      }
    });

    const topScoringStudents = Object.entries(studentScoresMap)
      .map(([id, val]) => {
        const avg = val.scores.reduce((a, b) => a + b, 0) / val.scores.length;
        return {
          id,
          fullName: val.fullName,
          userCode: val.userCode,
          attemptCount: val.scores.length,
          avgScore: Number(avg.toFixed(2))
        };
      })
      .filter(s => s.attemptCount >= 1) // Điều kiện tối thiểu
      .sort((a, b) => b.avgScore - a.avgScore)
      .slice(0, 10);

    return NextResponse.json({
      success: true,
      data: {
        topCreators,
        topInteractedTeachers: sortedInteracted,
        topActiveStudents,
        topScoringStudents
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
