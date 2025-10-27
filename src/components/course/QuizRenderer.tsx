import { useState } from "react";
import type { Quiz, QuizAnswer } from "../../types/quiz";

interface QuizRendererProps {
  quiz: Quiz;
  onSubmit: (result: QuizSubmission) => void;
}

interface QuizSubmission {
  answers: QuizAnswer[];
  time_spent_seconds: number;
  client_event_id: string;
}

export const QuizRenderer = ({ quiz, onSubmit }: QuizRendererProps) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string | string[]>>({});
  const [startTime] = useState(Date.now());

  const currentQuestion = quiz.questions[currentQuestionIndex];
  const totalQuestions = quiz.questions.length;
  const progress = ((currentQuestionIndex + 1) / totalQuestions) * 100;

  const handleAnswer = (questionId: number, answer: string | string[]) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: answer,
    }));
  };

  const handleNext = () => {
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      handleSubmit();
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleSubmit = () => {
    const answersArray: QuizAnswer[] = Object.entries(answers).map(
      ([questionId, answer]) => ({
        question_id: Number(questionId),
        answer,
      })
    );

    const timeSpent = Math.floor((Date.now() - startTime) / 1000);

    onSubmit({
      answers: answersArray,
      time_spent_seconds: timeSpent,
      client_event_id: `quiz-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`,
    });
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Question {currentQuestionIndex + 1} of {totalQuestions}
          </h2>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {Math.round(progress)}% Complete
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className="bg-azure-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Question Card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 border border-gray-200 dark:border-gray-700 mb-6">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
          {currentQuestion.text}
        </h3>

        {/* Render based on question type */}
        {currentQuestion.type === "mcq" && currentQuestion.options && (
          <div className="space-y-3">
            {currentQuestion.options.map((option) => (
              <label
                key={option.id}
                className="flex items-center gap-3 p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <input
                  type="radio"
                  name={`question-${currentQuestion.id}`}
                  value={option.id}
                  checked={answers[currentQuestion.id] === option.id}
                  onChange={() => handleAnswer(currentQuestion.id, option.id)}
                  className="w-5 h-5 text-azure-500 focus:ring-azure-500"
                />
                <span className="text-gray-900 dark:text-white">
                  {option.text}
                </span>
              </label>
            ))}
          </div>
        )}

        {currentQuestion.type === "multi_select" && currentQuestion.options && (
          <div className="space-y-3">
            {currentQuestion.options.map((option) => (
              <label
                key={option.id}
                className="flex items-center gap-3 p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={
                    Array.isArray(answers[currentQuestion.id])
                      ? (answers[currentQuestion.id] as string[]).includes(
                          option.id
                        )
                      : false
                  }
                  onChange={(e) => {
                    const currentAnswers = Array.isArray(
                      answers[currentQuestion.id]
                    )
                      ? (answers[currentQuestion.id] as string[])
                      : [];
                    if (e.target.checked) {
                      handleAnswer(currentQuestion.id, [
                        ...currentAnswers,
                        option.id,
                      ]);
                    } else {
                      handleAnswer(
                        currentQuestion.id,
                        currentAnswers.filter((id: string) => id !== option.id)
                      );
                    }
                  }}
                  className="w-5 h-5 text-azure-500 focus:ring-azure-500"
                />
                <span className="text-gray-900 dark:text-white">
                  {option.text}
                </span>
              </label>
            ))}
          </div>
        )}

        {(currentQuestion.type === "short_answer" ||
          currentQuestion.type === "one_word") && (
          <input
            type="text"
            value={(answers[currentQuestion.id] as string) || ""}
            onChange={(e) => handleAnswer(currentQuestion.id, e.target.value)}
            placeholder="Type your answer..."
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-azure-500 focus:border-transparent"
          />
        )}

        {currentQuestion.type === "fill_blank" && (
          <input
            type="text"
            value={(answers[currentQuestion.id] as string) || ""}
            onChange={(e) => handleAnswer(currentQuestion.id, e.target.value)}
            placeholder="Fill in the blank..."
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-azure-500 focus:border-transparent"
          />
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <button
          onClick={handlePrevious}
          disabled={currentQuestionIndex === 0}
          className="flex items-center gap-2 px-6 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
        >
          Previous
        </button>

        <button
          onClick={handleNext}
          disabled={
            !answers[currentQuestion.id] ||
            (Array.isArray(answers[currentQuestion.id]) &&
              answers[currentQuestion.id].length === 0)
          }
          className="flex items-center gap-2 px-6 py-2 bg-azure-500 hover:bg-azure-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
        >
          {currentQuestionIndex === totalQuestions - 1 ? "Submit Quiz" : "Next"}
        </button>
      </div>
    </div>
  );
};
