import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { GeminiAIAdapter } from "@/lib/ai/gemini-adapter";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session || (session.role !== "TEACHER" && session.role !== "ADMIN")) {
      return NextResponse.json({ error: "Bạn không có quyền thực hiện chức năng này." }, { status: 403 });
    }

    const body = await req.json();
    const { subject, gradeLevel, topic, lessonName, learningOutcomes, durationMinutes, difficulty, sourceMaterial } = body;

    if (!subject || !gradeLevel || !topic || !lessonName || !learningOutcomes) {
      return NextResponse.json({ error: "Vui lòng điền đầy đủ các thông tin sư phạm bắt buộc." }, { status: 400 });
    }

    const adapter = new GeminiAIAdapter();
    if (!adapter.isAvailable()) {
      return NextResponse.json({
        error: "Chưa cấu hình GEMINI_API_KEY trên máy chủ. Vui lòng liên hệ quản trị viên thiết lập biến môi trường để sử dụng AI."
      }, { status: 503 });
    }

    const generated = await adapter.generateLessonPackage({
      subject,
      gradeLevel: Number(gradeLevel),
      topic,
      lessonName,
      learningOutcomes,
      durationMinutes: Number(durationMinutes) || 45,
      difficulty: difficulty || "MEDIUM",
      sourceMaterial
    });

    // Lưu vết AI Job
    await db.aIJob.create({
      data: {
        userId: session.userId,
        schoolId: session.schoolId,
        taskType: "GENERATE_LESSON_PACKAGE",
        status: "COMPLETED",
        modelName: process.env.AI_MODEL_NAME || "gemini-2.5-flash",
      }
    });

    return NextResponse.json({ success: true, data: generated });
  } catch (error: any) {
    console.error("AI Generation Route Error:", error);
    return NextResponse.json({ error: error.message || "Tạo học liệu bằng AI thất bại." }, { status: 500 });
  }
}
