import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { PageShell } from "../components/layout/PageShell";
import {
  Heart,
  Share2,
  Filter,
  AlertCircle,
  MessageCircle,
  User,
  Lock,
  BookOpen,
  Coins,
  X,
} from "lucide-react";
import {
  getFeedPosts,
  toggleLikePost,
  sharePost,
  commentOnPost,
  getPostDetail,
  getRemainingFeedTime,
  exchangeXpForFeedTime,
} from "../services/feed";
import { searchPosts } from "../services/search";
import { formatRelativeTime } from "../utils/format";
import { getCurrentUser } from "../services/auth";
import type {
  FeedFilters,
  PostType,
  PostAuthor,
  FeedPost,
} from "../types/feed";
import type { PostSearchItem } from "../types/search";

export const Feed = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [filters, setFilters] = useState<FeedFilters>({
    per_page: 15,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [searchOffset, setSearchOffset] = useState(0);
  const [expandedComments, setExpandedComments] = useState<
    Record<number, boolean>
  >({});
  const [commentInputs, setCommentInputs] = useState<Record<number, string>>(
    {}
  );
  const [activeAuthor, setActiveAuthor] = useState<PostAuthor | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showLockModal, setShowLockModal] = useState(false);
  const [feedLocked, setFeedLocked] = useState(false);

  // Check feed time on mount
  const { data: feedTime, refetch: refetchFeedTime } = useQuery({
    queryKey: ["feed-time"],
    queryFn: getRemainingFeedTime,
    retry: false,
  });

  // Check if feed is locked
  useEffect(() => {
    if (feedTime) {
      const isLocked =
        !feedTime.unlimited &&
        (feedTime.seconds === null || feedTime.seconds <= 0);
      setFeedLocked(isLocked);
      setShowLockModal(isLocked);
    }
  }, [feedTime]);

  // Regular feed posts query (when not searching)
  const {
    data: feedData,
    isLoading: isLoadingPosts,
    error: feedError,
  } = useQuery({
    queryKey: ["feed-posts", filters],
    queryFn: async () => {
      try {
        return await getFeedPosts(filters);
      } catch (error: any) {
        // Handle FEED_LOCKED error
        if (
          error?.response?.status === 403 ||
          error?.response?.data?.error_code === "FEED_LOCKED"
        ) {
          setFeedLocked(true);
          setShowLockModal(true);
        }
        throw error;
      }
    },
    enabled: !isSearchMode || !searchQuery.trim(),
    retry: (failureCount, error: any) => {
      // Don't retry on FEED_LOCKED errors
      if (
        error?.response?.status === 403 ||
        error?.response?.data?.error_code === "FEED_LOCKED"
      ) {
        return false;
      }
      return failureCount < 3;
    },
  });

  // Handle feed error separately
  useEffect(() => {
    if (feedError) {
      const error = feedError as any;
      if (
        error?.response?.status === 403 ||
        error?.response?.data?.error_code === "FEED_LOCKED"
      ) {
        setFeedLocked(true);
        setShowLockModal(true);
      }
    }
  }, [feedError]);

  // Search posts query (when searching)
  const { data: searchResults, isLoading: isSearchLoading } = useQuery({
    queryKey: ["search-posts", searchQuery, filters.type, searchOffset],
    queryFn: () =>
      searchPosts(searchQuery, {
        type: filters.type,
        limit: filters.per_page || 15,
        offset: searchOffset,
      }),
    enabled: isSearchMode && !!searchQuery.trim(),
  });

  // Helper function to convert PostSearchItem to FeedPost format
  const convertSearchItemToPost = (item: PostSearchItem): FeedPost => {
    return {
      id: item.id,
      title: item.title,
      content_text: item.content_text,
      type: item.type as PostType,
      tags: item.tags,
      author: item.author,
      likes_count: item.likes_count,
      comments_count: item.comments_count,
      has_liked: false, // Search results may not include this
      created_at: "", // Search results may not include this
    };
  };

  // Like mutation with optimistic updates
  const likeMutation = useMutation({
    mutationFn: toggleLikePost,
    onMutate: async (postId: number) => {
      await queryClient.cancelQueries({ queryKey: ["feed-posts"] });
      const previous = queryClient.getQueryData<any>(["feed-posts", filters]);
      if (previous) {
        const next = {
          ...previous,
          data: previous.data.map((p: any) =>
            p.id === postId
              ? {
                  ...p,
                  has_liked: !p.has_liked,
                  likes_count: p.has_liked
                    ? Math.max(0, (p.likes_count || 0) - 1)
                    : (p.likes_count || 0) + 1,
                }
              : p
          ),
        };
        queryClient.setQueryData(["feed-posts", filters], next);
      }
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(["feed-posts", filters], ctx.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["feed-posts"] });
    },
  });

  // Share mutation
  const shareMutation = useMutation({
    mutationFn: (postId: number) => sharePost(postId),
  });

  const handleLike = (postId: number) => {
    likeMutation.mutate(postId);
  };

  const handleShare = async (post: any) => {
    const url = post?.slug
      ? `${window.location.origin}/feed/${post.slug}`
      : `${window.location.origin}/feed/${post.id}`;
    try {
      if ((navigator as any).share) {
        await (navigator as any).share({
          url,
          title: post.title,
          text: post.content_text,
        });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
      }
      shareMutation.mutate(post.id);
    } catch {
      // ignore
    }
  };

  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: ({ postId, content }: { postId: number; content: string }) =>
      commentOnPost(postId, content),
    onSuccess: (data, variables) => {
      // update list cache
      queryClient.setQueryData(["feed-posts", filters], (oldData: any) => {
        if (!oldData) return oldData;
        const updated = { ...oldData };
        updated.data = updated.data.map((p: any) => {
          if (p.id !== variables.postId) return p;
          const nextComments = [...(p.comments || []), data.comment];
          return {
            ...p,
            comments: nextComments,
            comments_count:
              (p.comments_count || nextComments.length) + (p.comments ? 0 : 0),
          };
        });
        return updated;
      });
      // clear input
      setCommentInputs((s) => ({ ...s, [variables.postId]: "" }));
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setIsSearchMode(true);
      setSearchOffset(0);
    } else {
      setIsSearchMode(false);
      setSearchOffset(0);
    }
  };

  const handleClearSearch = () => {
    setIsSearchMode(false);
    setSearchQuery("");
    setSearchOffset(0);
  };

  const handleFilterChange = (
    key: keyof FeedFilters,
    value: string | boolean | undefined
  ) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value || undefined,
    }));
  };

  // XP exchange mutation
  const exchangeXpMutation = useMutation({
    mutationFn: (xp: number) => {
      // Generate a unique client event ID for idempotency
      const clientEventId = crypto.randomUUID();
      return exchangeXpForFeedTime(xp, clientEventId);
    },
    onSuccess: () => {
      // Refetch feed time and feed posts
      refetchFeedTime();
      queryClient.invalidateQueries({ queryKey: ["feed-posts"] });
      setShowLockModal(false);
      setFeedLocked(false);
    },
  });

  // Get current user for XP check
  const currentUser = getCurrentUser();
  const userXP = currentUser?.xp_total || 0;
  const canExchangeXP = userXP >= 10;

  // Handler functions
  const handleGoToCourses = () => {
    navigate("/courses");
  };

  const handleExchangeXP = () => {
    if (canExchangeXP) {
      exchangeXpMutation.mutate(10); // Exchange 10 XP for 10 minutes
    }
  };

  // Format remaining time
  const formatRemainingTime = (seconds: number | null): string => {
    if (seconds === null) return "Unlimited";
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor(
      (seconds % 3600) / 60
    )}m`;
  };

  // Determine which posts to display
  const posts =
    isSearchMode && searchResults
      ? searchResults.results.map(convertSearchItemToPost)
      : feedData?.data || [];

  const isLoadingFeed = isSearchMode ? isSearchLoading : isLoadingPosts;

  return (
    <PageShell>
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Feed
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Stay motivated with tips, discussions, and announcements
              </p>
            </div>
            {feedTime && !feedTime.unlimited && (
              <div className="text-right">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Remaining Time
                </div>
                <div className="text-lg font-semibold text-azure-500">
                  {formatRemainingTime(feedTime.seconds)}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8 border border-gray-200 dark:border-gray-700">
          {/* Search */}
          <form onSubmit={handleSearch} className="mb-6">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search posts..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-azure-500 focus:border-transparent"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-azure-500 hover:bg-azure-600 text-white px-6 py-2 rounded-lg text-sm font-semibold transition-colors"
              >
                Search
              </button>
            </div>
          </form>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Type
              </label>
              <select
                value={filters.type || ""}
                onChange={(e) =>
                  handleFilterChange(
                    "type",
                    e.target.value as PostType | undefined
                  )
                }
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-azure-500"
              >
                <option value="">All Types</option>
                <option value="question">Questions</option>
                <option value="announcement">Announcements</option>
                {/* <option value="resource">Resources</option> */}
                <option value="discussion">Discussions</option>
                <option value="tip">Tips</option>
                <option value="meme">Memes</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Sort By
              </label>
              <select
                value={filters.sort_by || "created_at"}
                onChange={(e) =>
                  handleFilterChange(
                    "sort_by",
                    e.target.value as "created_at" | "popularity" | undefined
                  )
                }
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-azure-500"
              >
                <option value="created_at">Date Created</option>
                <option value="popularity">Popularity</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Sort Order
              </label>
              <select
                value={filters.sort_order || "desc"}
                onChange={(e) =>
                  handleFilterChange(
                    "sort_order",
                    e.target.value as "asc" | "desc" | undefined
                  )
                }
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-azure-500"
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </div>
          </div>
        </div>

        {/* Search Results Header */}
        {isSearchMode && searchQuery && (
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Search Results for "{searchQuery}"
              </h2>
              {searchResults && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {searchResults.total} result
                  {searchResults.total !== 1 ? "s" : ""} found
                </p>
              )}
              <button
                onClick={handleClearSearch}
                className="text-azure-500 hover:text-azure-600 text-sm font-medium"
              >
                Clear search
              </button>
            </div>
          </div>
        )}

        {/* Posts */}
        {isLoadingFeed ? (
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
                  <button
                    className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden flex items-center justify-center"
                    onClick={() => setActiveAuthor(post.author || null)}
                    title={
                      post?.author?.display_name ||
                      post?.author?.name ||
                      "Author"
                    }
                  >
                    {post?.author?.avatar_url ? (
                      <img
                        src={post.author.avatar_url}
                        alt={
                          post?.author?.display_name ||
                          post?.author?.name ||
                          "Author"
                        }
                        className="w-full h-full object-cover rounded-full"
                      />
                    ) : (
                      <User className="w-6 h-6 text-gray-500 rounded-full" />
                    )}
                  </button>
                  <div>
                    <button
                      onClick={() => setActiveAuthor(post.author || null)}
                      className="font-semibold text-gray-900 dark:text-white hover:underline"
                    >
                      {post?.author?.display_name ||
                        post?.author?.name ||
                        "Unknown Author"}
                    </button>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {formatRelativeTime(new Date(post.created_at))} •{" "}
                      {post.type}
                    </p>
                  </div>
                </div>

                {/* Content */}
                <div className="mb-4">
                  {post.title && (
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                      {post.title}
                    </h3>
                  )}
                  {post.content_text && (
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                      {post.content_text}
                    </p>
                  )}
                  {post.content_html && (
                    <div
                      className="prose dark:prose-invert max-w-none"
                      dangerouslySetInnerHTML={{ __html: post.content_html }}
                    />
                  )}
                  {post.media_url && (
                    <div className="mt-4">
                      <img
                        src={post.media_url}
                        alt={post.title || "Post media"}
                        className="w-full rounded-lg object-cover max-h-96"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                        loading="lazy"
                      />
                      {post.media_metadata && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {post.media_metadata.format?.toUpperCase()}
                          {post.media_metadata.size &&
                            ` • ${post.media_metadata.size}`}
                          {post.media_metadata.width &&
                            post.media_metadata.height &&
                            ` • ${post.media_metadata.width}×${post.media_metadata.height}`}
                        </p>
                      )}
                    </div>
                  )}
                  {post.tags && post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {post.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-azure-100 dark:bg-azure-900/20 text-azure-700 dark:text-azure-300 rounded text-sm"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => handleLike(post.id)}
                    disabled={likeMutation.isPending}
                    className={`flex items-center gap-2 transition-colors ${
                      post.has_liked
                        ? "text-rose-600 dark:text-rose-400"
                        : "text-gray-600 dark:text-gray-400 hover:text-rose-600 dark:hover:text-rose-400"
                    }`}
                  >
                    <Heart
                      className={`w-5 h-5 ${
                        post.has_liked ? "fill-current" : ""
                      }`}
                    />
                    <span className="font-medium">{post.likes_count}</span>
                  </button>
                  <button
                    onClick={async () => {
                      const next = !expandedComments[post.id];
                      setExpandedComments((s) => ({ ...s, [post.id]: next }));
                      if (
                        next &&
                        (!post.comments || post.comments.length === 0)
                      ) {
                        try {
                          const detail = await getPostDetail(post.id);
                          queryClient.setQueryData(
                            ["feed-posts", filters],
                            (oldData: any) => {
                              if (!oldData) return oldData;
                              const updated = { ...oldData };
                              updated.data = updated.data.map((p: any) =>
                                p.id === post.id
                                  ? { ...p, comments: detail.comments || [] }
                                  : p
                              );
                              return updated;
                            }
                          );
                        } catch {
                          // ignore
                        }
                      }
                    }}
                    className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-azure-600 dark:hover:text-azure-400 transition-colors"
                  >
                    <MessageCircle className="w-5 h-5" />
                    <span className="font-medium">
                      {post.comments_count || post.comments?.length || 0}
                    </span>
                  </button>
                  <button
                    onClick={() => handleShare(post)}
                    disabled={shareMutation.isPending}
                    className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-azure-600 dark:hover:text-azure-400 transition-colors"
                  >
                    <Share2 className="w-5 h-5" />
                    <span className="font-medium">
                      {post.shares_count || 0}
                    </span>
                  </button>
                  {post.views_count !== undefined && (
                    <span className="text-sm text-gray-500 dark:text-gray-400 ml-auto">
                      {post.views_count} views
                    </span>
                  )}
                </div>

                {/* Comments Section */}
                {expandedComments[post.id] && (
                  <div className="mt-4 space-y-4">
                    {post.comments && post.comments.length > 0 ? (
                      <div className="space-y-3">
                        {post.comments.map((c) => (
                          <div key={c.id} className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
                              {(c.user as any)?.avatar_url ? (
                                <img
                                  src={(c.user as any).avatar_url}
                                  alt={
                                    (c.user as any)?.display_name ||
                                    (c.user as any)?.name ||
                                    "User"
                                  }
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <User className="w-4 h-4 text-gray-500" />
                              )}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {(c.user as any)?.display_name ||
                                  (c.user as any)?.name ||
                                  `${(c.user as any)?.firstname ?? ""} ${
                                    (c.user as any)?.lastname ?? ""
                                  }`.trim() ||
                                  "User"}
                              </div>
                              <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                {c.content}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        No comments yet. Be the first to comment.
                      </p>
                    )}

                    <form
                      className="flex items-center gap-2"
                      onSubmit={(e) => {
                        e.preventDefault();
                        const content = (commentInputs[post.id] || "").trim();
                        if (!content) return;
                        addCommentMutation.mutate({ postId: post.id, content });
                      }}
                    >
                      <input
                        type="text"
                        value={commentInputs[post.id] || ""}
                        onChange={(e) =>
                          setCommentInputs((s) => ({
                            ...s,
                            [post.id]: e.target.value,
                          }))
                        }
                        placeholder="Write a comment..."
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-azure-500"
                      />
                      <button
                        type="submit"
                        disabled={addCommentMutation.isPending}
                        className="px-4 py-2 bg-azure-500 text-white rounded-lg hover:bg-azure-600 disabled:opacity-50"
                      >
                        Comment
                      </button>
                    </form>
                  </div>
                )}
              </div>
            ))}

            {/* Pagination */}
            {/* Regular Pagination */}
            {!isSearchMode && feedData?.meta && feedData.meta.last_page > 1 && (
              <div className="flex justify-center gap-2">
                <button
                  onClick={() => {
                    const newPage = Math.max(1, currentPage - 1);
                    setCurrentPage(newPage);
                    // Note: Pagination would need to be added to FeedFilters if needed
                  }}
                  disabled={feedData.meta?.current_page === 1}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Previous
                </button>
                <div className="px-4 py-2 bg-azure-500 text-white rounded-lg">
                  {feedData.meta?.current_page} / {feedData.meta?.last_page}
                </div>
                <button
                  onClick={() => {
                    const newPage = Math.min(
                      feedData.meta?.last_page || 1,
                      currentPage + 1
                    );
                    setCurrentPage(newPage);
                    // Note: Pagination would need to be added to FeedFilters if needed
                  }}
                  disabled={
                    feedData.meta?.current_page === feedData.meta?.last_page
                  }
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Next
                </button>
              </div>
            )}

            {/* Search Pagination */}
            {isSearchMode &&
              searchResults &&
              searchResults.total > (filters.per_page || 15) && (
                <div className="flex justify-center gap-2 mt-6">
                  <button
                    onClick={() =>
                      setSearchOffset((prev) =>
                        Math.max(0, prev - (filters.per_page || 15))
                      )
                    }
                    disabled={searchOffset === 0}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Previous
                  </button>
                  <div className="px-4 py-2 bg-azure-500 text-white rounded-lg">
                    Showing {searchOffset + 1}-
                    {Math.min(
                      searchOffset + (filters.per_page || 15),
                      searchResults.total
                    )}{" "}
                    of {searchResults.total}
                  </div>
                  <button
                    onClick={() =>
                      setSearchOffset((prev) => prev + (filters.per_page || 15))
                    }
                    disabled={
                      searchOffset + (filters.per_page || 15) >=
                      searchResults.total
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

      {/* Author Modal */}
      {activeAuthor && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-md p-6 relative">
            <button
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-300"
              onClick={() => setActiveAuthor(null)}
            >
              ✕
            </button>
            <div className="flex items-center gap-3">
              <div className="w=14 h-14 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden flex items-center justify-center">
                {activeAuthor.avatar_url ? (
                  <img
                    src={activeAuthor.avatar_url}
                    alt={
                      activeAuthor.name ||
                      (activeAuthor as any)?.display_name ||
                      "Author"
                    }
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-7 h-7 text-gray-500" />
                )}
              </div>
              <div>
                <div className="font-semibold text-lg text-gray-900 dark:text-white">
                  {(activeAuthor as any).display_name ||
                    activeAuthor.name ||
                    `${(activeAuthor as any).firstname ?? ""} ${
                      (activeAuthor as any).lastname ?? ""
                    }`.trim() ||
                    "Author"}
                </div>
                {(activeAuthor as any).role?.name && (
                  <div className="text-sm text-gray-500">
                    {(activeAuthor as any).role?.name}
                  </div>
                )}
                {(activeAuthor as any).university?.name && (
                  <div className="text-sm text-gray-500">
                    {(activeAuthor as any).university.name}
                  </div>
                )}
              </div>
            </div>
            {(activeAuthor as any).bio && (
              <p className="mt-3 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {String((activeAuthor as any).bio)}
              </p>
            )}
            {(activeAuthor as any).social_links && (
              <div className="mt-4 space-y-1 text-sm text-azure-600 dark:text-azure-400">
                {Object.entries((activeAuthor as any).social_links).map(
                  ([k, v]) => (
                    <div key={k} className="truncate">
                      <span className="font-medium">{k}: </span>
                      <a
                        href={String(v)}
                        target="_blank"
                        rel="noreferrer"
                        className="underline"
                      >
                        {String(v)}
                      </a>
                    </div>
                  )
                )}
              </div>
            )}
            <div className="mt-4 text-right">
              <button
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg text-sm font-medium"
                onClick={() => setActiveAuthor(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feed Lock Modal */}
      {showLockModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="bg-red-100 dark:bg-red-900/20 p-3 rounded-full">
                  <Lock className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Feed Locked
                </h2>
              </div>
              <button
                onClick={() => setShowLockModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Feed locked — complete a lesson or exchange 10 XP to gain access.
            </p>

            <div className="space-y-3">
              <button
                onClick={handleGoToCourses}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-azure-500 hover:bg-azure-600 text-white rounded-lg font-semibold transition-colors"
              >
                <BookOpen className="w-5 h-5" />
                Go to Courses
              </button>

              <button
                onClick={handleExchangeXP}
                disabled={!canExchangeXP || exchangeXpMutation.isPending}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors"
              >
                <Coins className="w-5 h-5" />
                {exchangeXpMutation.isPending
                  ? "Exchanging..."
                  : canExchangeXP
                  ? "Exchange 10 XP (10 minutes)"
                  : `Insufficient XP (Need 10, Have ${userXP})`}
              </button>
            </div>

            {!canExchangeXP && (
              <p className="mt-4 text-sm text-gray-500 dark:text-gray-400 text-center">
                Complete lessons to earn XP, then exchange it for feed time!
              </p>
            )}
          </div>
        </div>
      )}

      {/* Feed Lock Overlay - blocks interaction when locked */}
      {feedLocked && !showLockModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-sm text-center border border-gray-200 dark:border-gray-700">
            <Lock className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
              Feed Locked
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Complete a lesson or exchange XP to unlock the feed.
            </p>
            <button
              onClick={() => setShowLockModal(true)}
              className="px-4 py-2 bg-azure-500 hover:bg-azure-600 text-white rounded-lg font-semibold transition-colors"
            >
              Unlock Feed
            </button>
          </div>
        </div>
      )}
    </PageShell>
  );
};
