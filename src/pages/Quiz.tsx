import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PageShell } from "../components/layout/PageShell";
import { QuizRenderer } from "../components/course/QuizRenderer";
import { CheckCircle, XCircle, AlertCircle, ArrowRight } from "lucide-react";
import { getQuiz, submitQuiz } from "../services/quiz";
import type { QuizSubmission, QuizResult } from "../types/quiz";

export const QuizPage = () => {
  const { lessonId } = useParams<{ lessonId: string }>();
  const navigate = useNavigate();
  const [result, setResult] = useState<QuizResult | null>(null);

  // Fetch quiz
  const { data: quiz, isLoading } = useQuery({
    queryKey: ["quiz", lessonId],
    queryFn: () => getQuiz(Number(lessonId!)),
    enabled: !!lessonId,
  });

  // Submit mutation
  const submitMutation = useMutation({
    mutationFn: (submission: QuizSubmission) =>
      submitQuiz(quiz!.id, submission),
    onSuccess: (data) => {
      setResult(data);
      // Invalidate queries to update progress
      // queryClient.invalidateQueries({ queryKey: ["course-outline"] });
    },
  });

  const handleSubmit = (submission: QuizSubmission) => {
    submitMutation.mutate(submission);
  };

  if (isLoading || !quiz) {
    return (
      <PageShell>
        <div className="flex justify-center items-center h-screen">
          <div className="animate-pulse text-gray-600 dark:text-gray-400">
            Loading quiz...
          </div>
        </div>
      </PageShell>
    );
  }

  if (result) {
    // Show results
    return (
      <PageShell>
        <div className="max-w-3xl mx-auto px-4 py-8">
          {/* Results Header */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 mb-6 border border-gray-200 dark:border-gray-700 text-center">
            {result.passed ? (
              <>
                <div className="w-20 h-20 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400" />
                </div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  Quiz Passed! 🎉
                </h1>
                <p className="text-xl text-gray-600 dark:text-gray-400 mb-4">
                  You scored {result.percentage}%
                </p>
              </>
            ) : (
              <>
                <div className="w-20 h-20 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <XCircle className="w-12 h-12 text-red-600 dark:text-red-400" />
                </div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  Quiz Not Passed
                </h1>
                <p className="text-xl text-gray-600 dark:text-gray-400 mb-4">
                  You scored {result.percentage}%
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Required: {result.pass_threshold}%
                </p>
              </>
            )}

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mt-6">
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Correct
                </p>
                <p className="text-2xl font-bold text-azure-600 dark:text-azure-400">
                  {result.correct_answers}
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Total
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {result.total_questions}
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  XP Earned
                </p>
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {result.xp_awarded}
                </p>
              </div>
            </div>
          </div>

          {/* Detailed Results */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 border border-gray-200 dark:border-gray-700 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Review Answers
            </h2>

            <div className="space-y-6">
              {result.results.map((questionResult, index) => (
                <div
                  key={questionResult.question_id}
                  className={`p-4 rounded-lg border-2 ${
                    questionResult.is_correct
                      ? "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20"
                      : "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20"
                  }`}
                >
                  <div className="flex items-start gap-3 mb-2">
                    {questionResult.is_correct ? (
                      <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                    )}
                    <p className="font-medium text-gray-900 dark:text-white">
                      Question {index + 1}: {questionResult.question}
                    </p>
                  </div>

                  <div className="ml-8 space-y-2 text-sm">
                    <p>
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        Your answer:
                      </span>{" "}
                      <span className="text-gray-900 dark:text-white">
                        {Array.isArray(questionResult.your_answer)
                          ? questionResult.your_answer.join(", ")
                          : questionResult.your_answer}
                      </span>
                    </p>
                    <p>
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        Correct answer:
                      </span>{" "}
                      <span className="text-gray-900 dark:text-white">
                        {Array.isArray(questionResult.correct_answer)
                          ? questionResult.correct_answer.join(", ")
                          : questionResult.correct_answer}
                      </span>
                    </p>
                    {questionResult.explanation && (
                      <p className="text-gray-600 dark:text-gray-400 mt-2">
                        {questionResult.explanation}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <button
              onClick={() => navigate(-1)}
              className="flex-1 px-6 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-semibold transition-colors"
            >
              Back to Lesson
            </button>
            {result.passed && (
              <button
                onClick={() => {
                  // Navigate to next lesson or course
                  navigate(`/course/${lessonId}/next`); // This needs proper implementation
                }}
                className="flex-1 px-6 py-3 bg-azure-500 hover:bg-azure-600 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
              >
                Continue Learning
                <ArrowRight className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </PageShell>
    );
  }

  // Show quiz
  return (
    <PageShell>
      <div className="max-w-4xl mx-auto py-8">
        {/* Quiz Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6 border border-gray-200 dark:border-gray-700">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {quiz.title}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Answer all questions to complete the quiz
          </p>
        </div>

        {/* Quiz Renderer */}
        <QuizRenderer quiz={quiz} onSubmit={handleSubmit} />

        {/* Error */}
        {submitMutation.error && (
          <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-600 dark:text-red-400">
              {submitMutation.error instanceof Error
                ? submitMutation.error.message
                : "An error occurred"}
            </p>
          </div>
        )}
      </div>
    </PageShell>
  );
};
