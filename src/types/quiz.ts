export type QuizQuestionType =
  | "mcq" // Multiple Choice - Single answer
  | "multi_select" // Multiple Choice - Multiple answers
  | "short_answer" // Short text answer (keyword matching)
  | "fill_blank" // Fill in the blank
  | "one_word"; // Exact word match

export interface QuizOption {
  id: string;
  text: string;
}

export interface QuizQuestion {
  id: number;
  text: string;
  type: QuizQuestionType;
  options?: QuizOption[];
  correct_answer: string | string[];
  explanation?: string;
  points: number;
}

export interface Quiz {
  id: number;
  lesson_id: number;
  title: string;
  questions: QuizQuestion[];
  time_limit_minutes?: number;
  pass_threshold: number; // Percentage
}

export interface QuizAnswer {
  question_id: number;
  answer: string | string[]; // Single answer or array of answers
}

export interface QuizSubmission {
  answers: QuizAnswer[];
  time_spent_seconds: number;
  client_event_id: string;
}

export interface QuizResult {
  quiz_id: number;
  score: number;
  percentage: number;
  passed: boolean;
  pass_threshold: number;
  correct_answers: number;
  total_questions: number;
  xp_awarded: number;
  time_taken_seconds: number;
  results: Array<{
    question_id: number;
    question: string;
    your_answer: string | string[];
    correct_answer: string | string[];
    is_correct: boolean;
    partial_credit?: number;
    explanation?: string;
  }>;
  progress: {
    total_xp: number;
    streak_days: number;
  };
}
