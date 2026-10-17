"use client";

import React, { useState } from "react";
import { Sparkles, Loader2, CheckCircle, Save, Eye, Layers } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { BlockPlayer } from "@/components/player/BlockPlayer";

export default function WorkshopPage() {
  const [formData, setFormData] = useState({
    subject: "Khoa học tự nhiên",
    gradeLevel: "7",
    topic: "Chất quanh ta",
    lessonName: "Sự bay hơi và ngưng tụ của nước",
    learningOutcomes: "Nêu được khái niệm sự bay hơi, ngưng tụ; giải thích hiện tượng vòng tuần hoàn của nước trong tự nhiên.",
    durationMinutes: 45,
    difficulty: "MEDIUM",
    sourceMaterial: ""
  });

  const [isLoading, setIsLoading] = useState(false);
  const [generatedPackage, setGeneratedPackage] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/ai/generate-package", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Tạo học liệu bằng AI không thành công");
      }
      setGeneratedPackage(data.data);
      setSuccessMsg("AI đã khởi tạo thành công gói bài học 5 giai đoạn!");
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex bg-slate-100 min-h-screen">
      <Navbar userRole="TEACHER" />
      <main className="flex-1 p-8 overflow-y-auto max-h-screen">
        <header className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black text-slate-900 flex items-center space-x-2">
              <Sparkles className="w-6 h-6 text-blue-600" />
              <span>Xưởng Học Liệu AI</span>
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Khởi tạo bài học thông minh chuẩn cấu trúc sư phạm THCS (GDPT 2018)
            </p>
          </div>
        </header>

        {errorMsg && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm font-medium">
            ⚠️ {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm font-medium flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Cột trái: Nhập liệu sư phạm */}
          <section className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="font-bold text-slate-900 text-base border-b pb-3">Cấu hình đầu vào sư phạm</h2>
            <form onSubmit={handleGenerate} className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Môn học</label>
                  <input
                    type="text"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Khối lớp</label>
                  <select
                    value={formData.gradeLevel}
                    onChange={(e) => setFormData({ ...formData, gradeLevel: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="6">Khối 6</option>
                    <option value="7">Khối 7</option>
                    <option value="8">Khối 8</option>
                    <option value="9">Khối 9</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Chủ đề</label>
                <input
                  type="text"
                  value={formData.topic}
                  onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tên bài học</label>
                <input
                  type="text"
                  value={formData.lessonName}
                  onChange={(e) => setFormData({ ...formData, lessonName: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Yêu cầu cần đạt</label>
                <textarea
                  rows={3}
                  value={formData.learningOutcomes}
                  onChange={(e) => setFormData({ ...formData, learningOutcomes: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tài liệu nguồn bổ sung (tùy chọn)</label>
                <textarea
                  rows={2}
                  placeholder="Dán văn bản hoặc tài liệu SGK để AI bám sát dữ liệu..."
                  value={formData.sourceMaterial}
                  onChange={(e) => setFormData({ ...formData, sourceMaterial: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition shadow-md shadow-blue-500/20 flex items-center justify-center space-x-2 disabled:bg-blue-400"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>AI đang phân tích & thiết kế học liệu...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    <span>Tạo gói bài học 5 giai đoạn</span>
                  </>
                )}
              </button>
            </form>
          </section>

          {/* Cột phải: Xem trước bài học & Biên tập */}
          <section className="lg:col-span-7 space-y-4">
            {generatedPackage ? (
              <div className="space-y-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">{generatedPackage.title}</h2>
                    <p className="text-xs text-slate-500 mt-1">{generatedPackage.description}</p>
                  </div>
                  <div className="flex space-x-2">
                    <button className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition">
                      <Save className="w-4 h-4" />
                      <span>Lưu học liệu</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  {generatedPackage.blocks?.map((blk: any, idx: number) => (
                    <BlockPlayer
                      key={idx}
                      block={{ ...blk, id: String(idx) }}
                      isReadOnly={false}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-white p-12 rounded-2xl border border-dashed border-slate-300 text-center flex flex-col items-center justify-center min-h-[400px]">
                <Layers className="w-12 h-12 text-slate-300 mb-3" />
                <h3 className="text-base font-bold text-slate-700">Chưa có bản nháp học liệu</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  Điền các tiêu chí sư phạm ở cột bên trái và bấm “Tạo gói bài học 5 giai đoạn” để xem AI khởi tạo trực tiếp.
                </p>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
