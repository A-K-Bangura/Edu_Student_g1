// Learning Metrics
export interface LearningMetrics {
  courses_completed: number;
  lessons_completed: number;
  quizzes_completed: number;
  average_score: number;
  time_spent_minutes: number;
}

// Engagement Metrics
export interface EngagementMetrics {
  daily_active_days: number;
  feed_interactions: number;
  comments_made: number;
  posts_liked: number;
}

// Analytics Dashboard
export interface AnalyticsDashboard {
  learning: LearningMetrics;
  engagement: EngagementMetrics;
  period: "week" | "month" | "quarter" | "year";
  period_start: string;
  period_end: string;
}

// Course Progress
export interface CourseProgress {
  percentage: number;
  lessons_completed: number;
  quizzes_completed: number;
  average_quiz_score: number;
}

// Time Spent
export interface TimeSpent {
  total_minutes: number;
  average_per_lesson: number;
}

// Performance
export interface Performance {
  weak_areas: string[];
  strong_areas: string[];
}

// Course Analytics
export interface CourseAnalytics {
  course: {
    id: number;
    title: string;
  };
  progress: CourseProgress;
  time_spent: TimeSpent;
  performance: Performance;
}

// Progress Analytics
export interface ProgressAnalytics {
  learning: LearningMetrics;
  period: "week" | "month" | "quarter" | "year";
  period_start: string;
  period_end: string;
}

// Engagement Analytics
export interface EngagementAnalytics {
  engagement: EngagementMetrics;
  period: "week" | "month" | "quarter" | "year";
  period_start: string;
  period_end: string;
}

// Insight
export interface Insight {
  type: string;
  message: string;
  priority: "high" | "medium" | "low";
}

// Recommendation
export interface Recommendation {
  type: string;
  title: string;
  reason: string;
}

// Insights Data
export interface InsightsData {
  insights: Insight[];
  recommendations: Recommendation[];
}

// Report Generation
export interface ReportGeneration {
  id: number;
  uuid: string;
  status: "generating" | "completed" | "failed";
  created_at: string;
}

// Report
export interface Report {
  id: number;
  uuid: string;
  period: "week" | "month" | "quarter" | "year";
  status: "generating" | "completed" | "failed";
  download_url?: string;
  created_at: string;
}

// Report List
export type ReportList = Report[];

