const test = require("node:test");
const assert = require("node:assert/strict");

// Giả lập logic chấm câu hỏi đóng từ auto-grader
function gradeQuizSingle(blockContent, studentAnswer, maxScore = 1.0) {
  const correctOption = blockContent.options?.find(opt => opt.isCorrect);
  const isCorrect = correctOption && studentAnswer === correctOption.id;
  return { score: isCorrect ? maxScore : 0, maxScore, isCorrect: !!isCorrect };
}

function gradeTrueFalse(blockContent, studentAnswer, maxScore = 1.0) {
  const subItems = blockContent.subItems || [];
  if (subItems.length === 0) return { score: 0, maxScore, isCorrect: false };
  let correctCount = 0;
  subItems.forEach(item => {
    if (studentAnswer[item.id] === item.isTrue) correctCount++;
  });
  const ratio = correctCount / subItems.length;
  return {
    score: Number((ratio * maxScore).toFixed(2)),
    maxScore,
    isCorrect: correctCount === subItems.length
  };
}

test("Quy tắc chấm Quiz trắc nghiệm 1 đáp án", () => {
  const block = {
    options: [
      { id: "A", text: "Hà Nội", isCorrect: true },
      { id: "B", text: "Đà Nẵng", isCorrect: false }
    ]
  };

  const correctRes = gradeQuizSingle(block, "A", 2.0);
  assert.equal(correctRes.isCorrect, true);
  assert.equal(correctRes.score, 2.0);

  const wrongRes = gradeQuizSingle(block, "B", 2.0);
  assert.equal(wrongRes.isCorrect, false);
  assert.equal(wrongRes.score, 0);
});

test("Quy tắc chấm Đúng/Sai từng ý", () => {
  const block = {
    subItems: [
      { id: "1", text: "Nước sôi ở 100 độ C", isTrue: true },
      { id: "2", text: "Nước đóng băng ở 50 độ C", isTrue: false }
    ]
  };

  const fullScore = gradeTrueFalse(block, { "1": true, "2": false }, 2.0);
  assert.equal(fullScore.isCorrect, true);
  assert.equal(fullScore.score, 2.0);

  const halfScore = gradeTrueFalse(block, { "1": true, "2": true }, 2.0);
  assert.equal(halfScore.isCorrect, false);
  assert.equal(halfScore.score, 1.0);
});
