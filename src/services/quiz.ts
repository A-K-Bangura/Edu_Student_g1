import api from "./api";
import type { ApiResponse } from "../types";
import type { Quiz, QuizSubmission, QuizResult } from "../types/quiz";

// Get quiz for a lesson
export const getQuiz = async (lessonId: number): Promise<Quiz> => {
  const response = await api.get<ApiResponse<Quiz>>(`/quiz/${lessonId}`);
  if (!response.data.data) {
    throw new Error("Quiz not found");
  }
  return response.data.data;
};

// Submit quiz answers
export const submitQuiz = async (
  quizId: number,
  submission: QuizSubmission
): Promise<QuizResult> => {
  const response = await api.post<ApiResponse<QuizResult>>(
    `/student/quizzes/${quizId}/submit`,
    submission
  );

  if (!response.data.data) {
    throw new Error("Quiz submission failed");
  }

  return response.data.data;
};

// Generate client event ID for idempotency
export const generateClientEventId = (): string => {
  return `quiz-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};
