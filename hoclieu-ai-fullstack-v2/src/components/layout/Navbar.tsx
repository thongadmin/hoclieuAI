import React from "react";
import Link from "next/link";
import { BookOpen, Sparkles, FolderKanban, Users, ClipboardCheck, BarChart3, Settings, LogOut } from "lucide-react";

export function Navbar({ userRole = "TEACHER", userName = "Thầy Nguyễn Văn An" }: { userRole?: string; userName?: string }) {
  return (
    <aside className="w-64 bg-slate-900 text-white min-h-screen flex flex-col border-r border-slate-800">
      <div className="p-5 border-b border-slate-800 flex items-center space-x-3">
        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
          <Sparkles className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="font-bold text-lg leading-tight tracking-wide text-white">HỌC LIỆU AI</h1>
          <span className="text-xs text-blue-400 font-medium">THCS Thông Minh</span>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1.5 text-sm font-medium">
        <Link href="/" className="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/80 transition-all">
          <BookOpen className="w-5 h-5 text-slate-400" />
          <span>Trang chủ</span>
        </Link>
        <Link href="/subjects" className="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/80 transition-all">
          <FolderKanban className="w-5 h-5 text-slate-400" />
          <span>Môn học</span>
        </Link>
        {(userRole === "TEACHER" || userRole === "ADMIN") && (
          <Link href="/workshop" className="flex items-center space-x-3 px-3 py-2.5 rounded-lg bg-blue-600/10 text-blue-400 border border-blue-500/20 hover:bg-blue-600/20 transition-all">
            <Sparkles className="w-5 h-5 text-blue-400" />
            <span>Xưởng học liệu AI</span>
          </Link>
        )}
        <Link href="/library" className="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/80 transition-all">
          <FolderKanban className="w-5 h-5 text-slate-400" />
          <span>Kho học liệu</span>
        </Link>
        <Link href="/classes" className="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/80 transition-all">
          <Users className="w-5 h-5 text-slate-400" />
          <span>Lớp học & Giao bài</span>
        </Link>
        <Link href="/grading" className="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/80 transition-all">
          <ClipboardCheck className="w-5 h-5 text-slate-400" />
          <span>Đánh giá & Phản hồi</span>
        </Link>
        <Link href="/analytics" className="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/80 transition-all">
          <BarChart3 className="w-5 h-5 text-slate-400" />
          <span>Thống kê & Thành tích</span>
        </Link>
        {userRole === "ADMIN" && (
          <Link href="/admin" className="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-amber-400 hover:bg-slate-800/80 transition-all">
            <Settings className="w-5 h-5 text-amber-400" />
            <span>Quản trị trường</span>
          </Link>
        )}
      </nav>

      <div className="p-4 border-t border-slate-800 bg-slate-950/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-blue-700 flex items-center justify-center text-xs font-bold text-white">
              {userName.substring(0, 2).toUpperCase()}
            </div>
            <div className="truncate">
              <p className="text-xs font-semibold text-white truncate">{userName}</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">{userRole}</p>
            </div>
          </div>
          <button className="text-slate-400 hover:text-red-400 transition" title="Đăng xuất">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
