import React, { useState } from "react";
import { CheckCircle2, XCircle, ArrowRight, RotateCcw } from "lucide-react";

interface BlockPlayerProps {
  block: {
    id: string;
    type: string;
    title: string;
    points: number;
    contentJson: any;
  };
  savedAnswer?: any;
  onAnswerChange?: (answer: any) => void;
  isReadOnly?: boolean;
}

export function BlockPlayer({ block, savedAnswer, onAnswerChange, isReadOnly = false }: BlockPlayerProps) {
  const { type, title, contentJson } = block;

  // 1. Reading
  if (type === "READING") {
    return (
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-lg font-bold text-slate-900 border-b pb-3">{title}</h3>
        <div className="prose text-slate-700 leading-relaxed whitespace-pre-line text-sm sm:text-base">
          {contentJson?.text}
        </div>
        {contentJson?.callout && (
          <div className="p-4 bg-blue-50 border-l-4 border-blue-600 rounded-r-lg text-blue-900 text-sm">
            <strong>Ghi nhớ trọng tâm:</strong> {contentJson.callout}
          </div>
        )}
      </div>
    );
  }

  // 2. Quiz Single
  if (type === "QUIZ_SINGLE") {
    const selected = savedAnswer;
    return (
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex justify-between items-center border-b pb-3">
          <h3 className="text-base sm:text-lg font-bold text-slate-900">{title}</h3>
          <span className="text-xs bg-blue-100 text-blue-800 font-semibold px-2.5 py-1 rounded-full">
            {block.points} điểm
          </span>
        </div>
        <p className="text-slate-800 font-medium text-base">{contentJson?.question}</p>
        <div className="space-y-2.5">
          {contentJson?.options?.map((opt: any) => {
            const isSelected = selected === opt.id;
            return (
              <button
                key={opt.id}
                disabled={isReadOnly}
                onClick={() => onAnswerChange && onAnswerChange(opt.id)}
                className={`w-full text-left p-3.5 rounded-lg border text-sm font-medium transition flex items-center justify-between ${
                  isSelected
                    ? "border-blue-600 bg-blue-50 text-blue-900 ring-2 ring-blue-500/30"
                    : "border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700"
                }`}
              >
                <span>{opt.text}</span>
                {isSelected && <CheckCircle2 className="w-5 h-5 text-blue-600 ml-2 shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // 3. True / False Sub-items
  if (type === "TRUE_FALSE") {
    const answers = savedAnswer || {};
    return (
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex justify-between items-center border-b pb-3">
          <h3 className="text-base sm:text-lg font-bold text-slate-900">{title}</h3>
          <span className="text-xs bg-blue-100 text-blue-800 font-semibold px-2.5 py-1 rounded-full">
            {block.points} điểm
          </span>
        </div>
        <p className="text-slate-800 font-medium">{contentJson?.statement}</p>
        <div className="divide-y divide-slate-100">
          {contentJson?.subItems?.map((item: any) => (
            <div key={item.id} className="py-3 flex items-center justify-between gap-4">
              <span className="text-sm text-slate-700">{item.text}</span>
              <div className="flex items-center space-x-2 shrink-0">
                <button
                  disabled={isReadOnly}
                  onClick={() => onAnswerChange && onAnswerChange({ ...answers, [item.id]: true })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                    answers[item.id] === true
                      ? "bg-emerald-600 text-white border-emerald-600"
                      : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  Đúng
                </button>
                <button
                  disabled={isReadOnly}
                  onClick={() => onAnswerChange && onAnswerChange({ ...answers, [item.id]: false })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                    answers[item.id] === false
                      ? "bg-rose-600 text-white border-rose-600"
                      : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  Sai
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 4. Fill Blanks
  if (type === "FILL_BLANKS") {
    const answers = savedAnswer || {};
    return (
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex justify-between items-center border-b pb-3">
          <h3 className="text-base sm:text-lg font-bold text-slate-900">{title}</h3>
          <span className="text-xs bg-blue-100 text-blue-800 font-semibold px-2.5 py-1 rounded-full">
            {block.points} điểm
          </span>
        </div>
        <p className="text-sm text-slate-600 mb-2">Điền từ thích hợp vào các ô trống dưới đây:</p>
        <div className="space-y-3">
          {contentJson?.blanks?.map((b: any, idx: number) => (
            <div key={b.id} className="flex items-center space-x-3">
              <span className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-700">
                {idx + 1}
              </span>
              <input
                type="text"
                disabled={isReadOnly}
                value={answers[b.id] || ""}
                onChange={(e) => onAnswerChange && onAnswerChange({ ...answers, [b.id]: e.target.value })}
                placeholder={b.hint || "Nhập câu trả lời..."}
                className="flex-1 px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 5. Short Answer
  if (type === "SHORT_ANSWER") {
    return (
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex justify-between items-center border-b pb-3">
          <h3 className="text-base sm:text-lg font-bold text-slate-900">{title}</h3>
          <span className="text-xs bg-blue-100 text-blue-800 font-semibold px-2.5 py-1 rounded-full">
            {block.points} điểm (Tự luận)
          </span>
        </div>
        <p className="text-slate-800 font-medium">{contentJson?.question}</p>
        <textarea
          rows={4}
          disabled={isReadOnly}
          value={savedAnswer || ""}
          onChange={(e) => onAnswerChange && onAnswerChange(e.target.value)}
          placeholder="Nhập phần trả lời hoặc trình bày lời giải của bạn..."
          className="w-full p-3.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none leading-relaxed"
        />
      </div>
    );
  }

  // 6. Interactive Math Graph Simulation
  if (type === "SIMULATION_MATH_GRAPH") {
    const [a, setA] = useState(1);
    const [b, setB] = useState(0);

    return (
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex justify-between items-center border-b pb-3">
          <h3 className="text-base sm:text-lg font-bold text-slate-900">{title}</h3>
          <span className="text-xs bg-emerald-100 text-emerald-800 font-semibold px-2.5 py-1 rounded-full">
            Mô phỏng toán học
          </span>
        </div>
        <p className="text-sm text-slate-600">Khảo sát hàm số bậc nhất: <strong>y = {a}x + {b}</strong></p>
        
        {/* SVG Canvas vẽ đồ thị trực quan */}
        <div className="w-full h-48 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-center relative overflow-hidden">
          <svg viewBox="-50 -50 100 100" className="w-full h-full">
            {/* Hệ trục tọa độ Oxy */}
            <line x1="-50" y1="0" x2="50" y2="0" stroke="#cbd5e1" strokeWidth="0.8" />
            <line x1="0" y1="-50" x2="0" y2="50" stroke="#cbd5e1" strokeWidth="0.8" />
            {/* Đường thẳng y = ax + b (lưu ý tọa độ y trên svg ngược hướng) */}
            <line
              x1="-40"
              y1={-(a * -40 + b * 5)}
              x2="40"
              y2={-(a * 40 + b * 5)}
              stroke="#2563eb"
              strokeWidth="2"
            />
          </svg>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div>
            <label className="text-xs font-semibold text-slate-700 flex justify-between">
              <span>Hệ số góc (a): {a}</span>
            </label>
            <input
              type="range"
              min="-3"
              max="3"
              step="0.5"
              value={a}
              onChange={(e) => setA(parseFloat(e.target.value))}
              className="w-full mt-1 accent-blue-600"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700 flex justify-between">
              <span>Tung độ gốc (b): {b}</span>
            </label>
            <input
              type="range"
              min="-5"
              max="5"
              step="1"
              value={b}
              onChange={(e) => setB(parseFloat(e.target.value))}
              className="w-full mt-1 accent-blue-600"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
      <h3 className="font-bold text-slate-900">{title}</h3>
      <p className="text-xs text-slate-500 mt-1">Loại khối: {type}</p>
    </div>
  );
}
