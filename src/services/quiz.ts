import api from "./api";
import type { ApiResponse } from "../types";
import type { Quiz, QuizSubmission, QuizResult, QuizList } from "../types/quiz";

// Get quiz details
export const getQuiz = async (quizId: string | number): Promise<Quiz> => {
  const response = await api.get<ApiResponse<{ quiz: Quiz }>>(
    `/student/quizzes/${quizId}`
  );

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || "Quiz not found");
  }

  return response.data.data.quiz;
};

// Get lesson quizzes
export const getLessonQuizzes = async (
  lessonId: string | number
): Promise<QuizList> => {
  const response = await api.get<ApiResponse<{ quizzes: QuizList }>>(
    `/student/lessons/${lessonId}/quizzes`
  );

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || "Failed to fetch quizzes");
  }

  return response.data.data.quizzes;
};

// Submit quiz answers
export const submitQuiz = async (
  quizId: string | number,
  submission: QuizSubmission
): Promise<QuizResult> => {
  const response = await api.post<ApiResponse<QuizResult>>(
    `/student/quizzes/${quizId}/submit`,
    submission
  );

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || "Quiz submission failed");
  }

  return response.data.data;
};

// Generate client event ID for idempotency
export const generateClientEventId = (): string => {
  return `quiz-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};
