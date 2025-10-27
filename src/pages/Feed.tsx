import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { PageShell } from "../components/layout/PageShell";
import {
  BookOpen,
  Heart,
  Share2,
  Filter,
  AlertCircle,
  Lock,
} from "lucide-react";
import { getFeedPosts, getFeedAccess, toggleLikePost } from "../services/feed";
import { formatRelativeTime } from "../utils/format";
import type { FeedFilters } from "../types/feed";

export const Feed = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<FeedFilters>({
    type: "all",
    page: 1,
    per_page: 20,
  });

  // Check access
  const { data: access, isLoading: isLoadingAccess } = useQuery({
    queryKey: ["feed-access"],
    queryFn: getFeedAccess,
  });

  // Fetch posts
  const { data: feedData, isLoading: isLoadingPosts } = useQuery({
    queryKey: ["feed-posts", filters],
    queryFn: () => getFeedPosts(filters),
    enabled: access?.can_access ?? false,
  });

  // Like mutation
  const likeMutation = useMutation({
    mutationFn: toggleLikePost,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feed-posts"] });
    },
  });

  const handleLike = (postId: number) => {
    likeMutation.mutate(postId);
  };

  const handleFilterChange = (
    type: "all" | "tip" | "meme" | "announcement"
  ) => {
    setFilters((prev) => ({ ...prev, type, page: 1 }));
  };

  // If locked, show motivational overlay
  if (!isLoadingAccess && !access?.can_access) {
    return (
      <PageShell>
        <div className="max-w-2xl mx-auto px-4 py-12">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-12 border border-gray-200 dark:border-gray-700 text-center">
            <div className="w-24 h-24 bg-gradient-to-br from-amber-500 to-rose-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <Lock className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Feed Locked 🔒
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-6">
              Complete a lesson to unlock the Feed and access study tips,
              announcements, and memes!
            </p>

            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-6">
              <p className="font-semibold text-amber-900 dark:text-amber-300 mb-2">
                Unlock Requirements:
              </p>
              <ul className="text-sm text-amber-800 dark:text-amber-400 space-y-1 text-left inline-block">
                <li>• Complete at least 1 lesson in the past 24 hours</li>
                <li>
                  • OR earn at least {access?.requirements.min_xp_today || 10}{" "}
                  XP today
                </li>
              </ul>
            </div>

            {access?.current && (
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Your Progress Today:
                </p>
                <div className="flex items-center justify-center gap-6 text-sm">
                  <div>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {access.current.xp_today}
                    </span>{" "}
                    <span className="text-gray-600 dark:text-gray-400">XP</span>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {access.current.lessons_today}
                    </span>{" "}
                    <span className="text-gray-600 dark:text-gray-400">
                      Lessons
                    </span>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={() => navigate("/courses")}
              className="inline-flex items-center gap-2 bg-azure-500 hover:bg-azure-600 text-white px-8 py-3 rounded-lg font-semibold transition-colors shadow-lg hover:shadow-xl"
            >
              <BookOpen className="w-5 h-5" />
              Start Learning to Unlock Feed!
            </button>
          </div>
        </div>
      </PageShell>
    );
  }

  const posts = feedData?.data || [];

  return (
    <PageShell>
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Feed
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Stay motivated with tips, memes, and announcements
            </p>
          </div>

          {/* Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <select
              value={filters.type || "all"}
              onChange={(e) =>
                handleFilterChange(
                  e.target.value as "all" | "tip" | "meme" | "announcement"
                )
              }
              className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-azure-500"
            >
              <option value="all">All Posts</option>
              <option value="tip">Study Tips</option>
              <option value="meme">Memes</option>
              <option value="announcement">Announcements</option>
            </select>
          </div>
        </div>

        {/* Posts */}
        {isLoadingPosts ? (
          <div className="space-y-6">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700 animate-pulse"
              >
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-3" />
                <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded" />
              </div>
            ))}
          </div>
        ) : posts.length > 0 ? (
          <div className="space-y-6">
            {posts.map((post) => (
              <div
                key={post.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow"
              >
                {/* Author */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-azure-500 to-blue-violet-500 rounded-full flex items-center justify-center text-white font-semibold">
                    {post.author.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {post.author.name}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {post.author.university && `${post.author.university} • `}
                      {formatRelativeTime(new Date(post.created_at))}
                    </p>
                  </div>
                </div>

                {/* Content */}
                <div className="mb-4">
                  <div
                    className="prose dark:prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: post.content_html }}
                  />
                  {post.media_url && (
                    <img
                      src={post.media_url}
                      alt="Post media"
                      className="mt-4 rounded-lg w-full max-h-96 object-cover"
                      loading="lazy"
                    />
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => handleLike(post.id)}
                    disabled={likeMutation.isPending}
                    className={`flex items-center gap-2 transition-colors ${
                      post.is_liked
                        ? "text-rose-600 dark:text-rose-400"
                        : "text-gray-600 dark:text-gray-400 hover:text-rose-600 dark:hover:text-rose-400"
                    }`}
                  >
                    <Heart
                      className={`w-5 h-5 ${
                        post.is_liked ? "fill-current" : ""
                      }`}
                    />
                    <span className="font-medium">{post.likes_count}</span>
                  </button>
                  <button className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-azure-600 dark:hover:text-azure-400 transition-colors">
                    <Share2 className="w-5 h-5" />
                    <span className="font-medium">Share</span>
                  </button>
                </div>
              </div>
            ))}

            {/* Pagination */}
            {feedData?.meta && feedData.meta.last_page > 1 && (
              <div className="flex justify-center gap-2">
                <button
                  onClick={() =>
                    setFilters((prev) => ({
                      ...prev,
                      page: Math.max(1, (prev.page || 1) - 1),
                    }))
                  }
                  disabled={feedData.meta?.current_page === 1}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Previous
                </button>
                <div className="px-4 py-2 bg-azure-500 text-white rounded-lg">
                  {feedData.meta?.current_page} / {feedData.meta?.last_page}
                </div>
                <button
                  onClick={() =>
                    setFilters((prev) => ({
                      ...prev,
                      page: Math.min(
                        feedData.meta?.last_page || 1,
                        (prev.page || 1) + 1
                      ),
                    }))
                  }
                  disabled={
                    feedData.meta?.current_page === feedData.meta?.last_page
                  }
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-12 text-center border border-gray-200 dark:border-gray-700">
            <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No posts yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Check back soon for updates and tips!
            </p>
          </div>
        )}
      </div>
    </PageShell>
  );
};
