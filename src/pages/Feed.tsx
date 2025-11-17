import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageShell } from "../components/layout/PageShell";
import {
  Heart,
  Share2,
  Filter,
  AlertCircle,
  MessageCircle,
  User,
} from "lucide-react";
import {
  getFeedPosts,
  toggleLikePost,
  sharePost,
  commentOnPost,
  getPostDetail,
} from "../services/feed";
import { formatRelativeTime } from "../utils/format";
import type { FeedFilters, PostType, PostAuthor } from "../types/feed";

export const Feed = () => {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<FeedFilters>({
    per_page: 15,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedComments, setExpandedComments] = useState<
    Record<number, boolean>
  >({});
  const [commentInputs, setCommentInputs] = useState<Record<number, string>>(
    {}
  );
  const [activeAuthor, setActiveAuthor] = useState<PostAuthor | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch posts
  const { data: feedData, isLoading: isLoadingPosts } = useQuery({
    queryKey: ["feed-posts", filters],
    queryFn: () => getFeedPosts(filters),
  });

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
    setFilters((prev) => ({
      ...prev,
      search: searchQuery || undefined,
    }));
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

  const posts = feedData?.data || [];

  return (
    <PageShell>
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Feed
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Stay motivated with tips, discussions, and announcements
          </p>
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
                <option value="resource">Resources</option>
                <option value="discussion">Discussions</option>
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
            {feedData?.meta && feedData.meta.last_page > 1 && (
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
    </PageShell>
  );
};
