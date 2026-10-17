// Quy tắc chấm tự động xác định cho các câu hỏi đóng
export interface GradeResult {
  score: number;
  maxScore: number;
  isCorrect: boolean;
  details?: any;
}

export function gradeBlockResponse(blockType: string, blockContent: any, studentAnswer: any, maxScore: number = 1.0): GradeResult {
  if (studentAnswer === undefined || studentAnswer === null) {
    return { score: 0, maxScore, isCorrect: false };
  }

  switch (blockType) {
    case "QUIZ_SINGLE": {
      // studentAnswer: string (option id)
      const correctOption = blockContent.options?.find((opt: any) => opt.isCorrect);
      const isCorrect = correctOption && studentAnswer === correctOption.id;
      return {
        score: isCorrect ? maxScore : 0,
        maxScore,
        isCorrect: !!isCorrect
      };
    }

    case "QUIZ_MULTIPLE": {
      // studentAnswer: string[] (option ids)
      const correctIds = (blockContent.options || [])
        .filter((opt: any) => opt.isCorrect)
        .map((opt: any) => opt.id)
        .sort();
      const selectedIds = (Array.isArray(studentAnswer) ? studentAnswer : []).sort();

      const isMatch = correctIds.length === selectedIds.length &&
        correctIds.every((id: string, idx: number) => id === selectedIds[idx]);

      return {
        score: isMatch ? maxScore : 0,
        maxScore,
        isCorrect: isMatch
      };
    }

    case "TRUE_FALSE": {
      // studentAnswer: Record<string, boolean> { subItemId: boolean }
      const subItems = blockContent.subItems || [];
      if (subItems.length === 0) return { score: 0, maxScore, isCorrect: false };

      let correctCount = 0;
      subItems.forEach((item: any) => {
        if (studentAnswer[item.id] === item.isTrue) {
          correctCount++;
        }
      });

      const ratio = correctCount / subItems.length;
      return {
        score: Number((ratio * maxScore).toFixed(2)),
        maxScore,
        isCorrect: correctCount === subItems.length
      };
    }

    case "FILL_BLANKS": {
      // studentAnswer: Record<string, string> { blankId: string }
      const blanks = blockContent.blanks || [];
      if (blanks.length === 0) return { score: 0, maxScore, isCorrect: false };

      let correctCount = 0;
      blanks.forEach((b: any) => {
        const studentText = (studentAnswer[b.id] || "").trim().toLowerCase();
        const accepted = (b.acceptedAnswers || []).map((ans: string) => ans.trim().toLowerCase());
        if (accepted.includes(studentText)) {
          correctCount++;
        }
      });

      const ratio = correctCount / blanks.length;
      return {
        score: Number((ratio * maxScore).toFixed(2)),
        maxScore,
        isCorrect: correctCount === blanks.length
      };
    }

    case "MATCHING": {
      // studentAnswer: Record<string, string> { leftId: rightId }
      const pairs = blockContent.pairs || [];
      if (pairs.length === 0) return { score: 0, maxScore, isCorrect: false };

      let correctCount = 0;
      pairs.forEach((p: any) => {
        if (studentAnswer[p.leftId] === p.rightId) {
          correctCount++;
        }
      });

      const ratio = correctCount / pairs.length;
      return {
        score: Number((ratio * maxScore).toFixed(2)),
        maxScore,
        isCorrect: correctCount === pairs.length
      };
    }

    case "SHORT_ANSWER": {
      // Nếu có acceptedExactAnswers, chấm tự động nếu trùng khớp chính xác
      const exactList = blockContent.acceptedExactAnswers || [];
      const userText = (typeof studentAnswer === "string" ? studentAnswer : "").trim().toLowerCase();
      if (exactList.length > 0) {
        const isExact = exactList.some((ans: string) => ans.trim().toLowerCase() === userText);
        return {
          score: isExact ? maxScore : 0,
          maxScore,
          isCorrect: isExact,
          details: { requiresManualReview: !isExact }
        };
      }
      // Mặc định cần giáo viên chấm
      return {
        score: 0,
        maxScore,
        isCorrect: false,
        details: { requiresManualReview: true }
      };
    }

    default:
      // Các khối bài đọc, mô phỏng, thẻ không tính điểm tự động
      return { score: maxScore, maxScore, isCorrect: true };
  }
}
