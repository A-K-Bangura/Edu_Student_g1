import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  completeLesson,
  type LessonCompletionData,
  type LessonCompletionResponse,
} from "../services/lessons";

interface CompletionData {
  lessonId: number;
  timeSpentSeconds: number;
  miniLessonProgress: Array<{
    mini_lesson_id: number;
    completed: boolean;
  }>;
}

export const useCompletion = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [showModal, setShowModal] = useState(false);
  const [completionData, setCompletionData] = useState<{
    xpGained: number;
    newTotalXP: number;
    streakDays: number;
    badge: { name: string; description: string; icon_url: string } | null;
  } | null>(null);

  const completionMutation = useMutation({
    mutationFn: async (data: CompletionData): Promise<LessonCompletionResponse> => {
      const completionData: LessonCompletionData = {
        time_spent_seconds: data.timeSpentSeconds,
        mini_lesson_progress: data.miniLessonProgress,
        client_event_id: `lesson-${
          data.lessonId
        }-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      };

      return completeLesson(data.lessonId, completionData);
    },
    onSuccess: (data) => {
      // Update user data in localStorage
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const user = JSON.parse(userStr);
        user.xp_total = data.progress.total_xp;
        user.streak_days = data.progress.streak_days;
        localStorage.setItem("user", JSON.stringify(user));
      }

      // Show completion modal
      setCompletionData({
        xpGained: data.xp_awarded,
        newTotalXP: data.progress.total_xp,
        streakDays: data.progress.streak_days,
        badge: data.new_badge || null,
      });
      setShowModal(true);

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["course-outline"] });
    },
  });

  const handleContinue = () => {
    setShowModal(false);
    // Navigate to next lesson or course dashboard
    navigate("/dashboard");
  };

  return {
    completeLesson: completionMutation.mutate,
    isLoading: completionMutation.isPending,
    error: completionMutation.error,
    showModal,
    completionData,
    handleContinue,
  };
};
