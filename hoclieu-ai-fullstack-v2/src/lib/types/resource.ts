import { z } from "zod";

export const BlockTypeEnum = z.enum([
  "READING",
  "FLASHCARDS",
  "QUIZ_SINGLE",
  "QUIZ_MULTIPLE",
  "TRUE_FALSE",
  "FILL_BLANKS",
  "MATCHING",
  "DRAG_DROP_CLASSIFY",
  "ORDERING",
  "SHORT_ANSWER",
  "GAME_CROSSWORD",
  "GAME_CARD_FLIP",
  "SIMULATION_MATH_GRAPH",
  "SIMULATION_SCIENCE",
  "WORKSHEET",
  "RUBRIC"
]);

export type BlockType = z.infer<typeof BlockTypeEnum>;

// Schemas for block contents
export const ReadingContentSchema = z.object({
  text: z.string(),
  images: z.array(z.string()).optional(),
  callout: z.string().optional()
});

export const QuizSingleContentSchema = z.object({
  question: z.string(),
  options: z.array(z.object({
    id: z.string(),
    text: z.string(),
    isCorrect: z.boolean()
  })),
  explanation: z.string().optional()
});

export const QuizMultipleContentSchema = z.object({
  question: z.string(),
  options: z.array(z.object({
    id: z.string(),
    text: z.string(),
    isCorrect: z.boolean()
  })),
  explanation: z.string().optional()
});

export const TrueFalseContentSchema = z.object({
  statement: z.string(),
  subItems: z.array(z.object({
    id: z.string(),
    text: z.string(),
    isTrue: z.boolean()
  })),
  explanation: z.string().optional()
});

export const FillBlanksContentSchema = z.object({
  template: z.string(), // e.g. "Thủ đô của Việt Nam là {{1}} và có diện tích lớn là {{2}}."
  blanks: z.array(z.object({
    id: z.string(),
    acceptedAnswers: z.array(z.string()),
    hint: z.string().optional()
  }))
});

export const MatchingContentSchema = z.object({
  prompt: z.string(),
  pairs: z.array(z.object({
    leftId: z.string(),
    leftText: z.string(),
    rightId: z.string(),
    rightText: z.string()
  }))
});

export const ShortAnswerContentSchema = z.object({
  question: z.string(),
  sampleAnswer: z.string().optional(),
  gradingGuidelines: z.string().optional(),
  acceptedExactAnswers: z.array(z.string()).optional()
});

export const SimulationGraphContentSchema = z.object({
  equation: z.string(), // e.g. "y = a*x^2 + b"
  parameters: z.array(z.object({
    name: z.string(),
    defaultVal: z.number(),
    min: z.number(),
    max: z.number(),
    step: z.number()
  })),
  challenge: z.string().optional()
});

export const SimulationScienceContentSchema = z.object({
  title: z.string(),
  type: z.enum(["OSCILLATION", "CIRCUIT", "DENSITY"]),
  initialParams: z.record(z.any()),
  guide: z.string()
});

export const GameCardFlipContentSchema = z.object({
  prompt: z.string(),
  cards: z.array(z.object({
    id: z.string(),
    term: z.string(),
    definition: z.string()
  }))
});

export const ResourceBlockSchema = z.object({
  id: z.string().optional(),
  orderIndex: z.number(),
  type: BlockTypeEnum,
  title: z.string(),
  points: z.number().default(1.0),
  contentJson: z.any()
});

export type ResourceBlockInput = z.infer<typeof ResourceBlockSchema>;
