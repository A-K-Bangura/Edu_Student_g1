import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../services/api";
import type { ApiResponse } from "../types";

interface LessonCompletionData {
  lessonId: number;
  timeSpentSeconds: number;
  miniLessonProgress: Array<{
    mini_lesson_id: number;
    completed: boolean;
  }>;
}

interface CompletionResponse {
  lesson_id: number;
  completed: boolean;
  xp_awarded: number;
  badge_earned: boolean;
  new_badge?: {
    id: number;
    name: string;
    description: string;
    icon_url: string;
  };
  progress: {
    total_xp: number;
    streak_days: number;
    course_progress_percent: number;
  };
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
    mutationFn: async (data: LessonCompletionData) => {
      const response = await api.post<ApiResponse<CompletionResponse>>(
        `/student/lessons/${data.lessonId}/complete`,
        {
          time_spent_seconds: data.timeSpentSeconds,
          mini_lesson_progress: data.miniLessonProgress,
          client_event_id: `lesson-${
            data.lessonId
          }-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        }
      );

      if (!response.data.data) {
        throw new Error("Completion submission failed");
      }

      return response.data.data;
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
