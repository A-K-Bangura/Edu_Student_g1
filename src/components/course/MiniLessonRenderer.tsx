import type { MiniLesson } from "../../types/lesson";
import { FileText, Image, Video, Download } from "lucide-react";

interface MiniLessonRendererProps {
  miniLesson: MiniLesson;
}

export const MiniLessonRenderer = ({ miniLesson }: MiniLessonRendererProps) => {
  switch (miniLesson.type) {
    case "text":
      return (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-azure-500" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Text Content
            </span>
          </div>
          <div
            className="prose dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: miniLesson.content_html || "" }}
          />
        </div>
      );

    case "image":
      return (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-4">
            <Image className="w-5 h-5 text-azure-500" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Image
            </span>
          </div>
          {miniLesson.media_url && (
            <img
              src={miniLesson.media_url}
              alt="Lesson content"
              className="w-full rounded-lg shadow-md"
              loading="lazy"
            />
          )}
          {miniLesson.content_html && (
            <div
              className="mt-4 prose dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: miniLesson.content_html }}
            />
          )}
        </div>
      );

    case "video":
      return (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-4">
            <Video className="w-5 h-5 text-azure-500" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Video Content
            </span>
          </div>
          {miniLesson.media_url && (
            <div className="aspect-video rounded-lg overflow-hidden shadow-md">
              {miniLesson.media_url.includes("youtube.com") ||
              miniLesson.media_url.includes("youtu.be") ? (
                <iframe
                  src={miniLesson.media_url}
                  title="Video content"
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <video
                  src={miniLesson.media_url}
                  controls
                  className="w-full h-full"
                >
                  Your browser does not support the video tag.
                </video>
              )}
            </div>
          )}
          {miniLesson.content_html && (
            <div
              className="mt-4 prose dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: miniLesson.content_html }}
            />
          )}
        </div>
      );

    case "download":
      return (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-4">
            <Download className="w-5 h-5 text-azure-500" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Downloadable File
            </span>
          </div>
          {miniLesson.media_url && (
            <a
              href={miniLesson.media_url}
              download
              className="inline-flex items-center gap-2 px-6 py-3 bg-azure-500 hover:bg-azure-600 text-white rounded-lg font-semibold transition-colors"
            >
              <Download className="w-5 h-5" />
              Download File
            </a>
          )}
          {miniLesson.content_html && (
            <div
              className="mt-4 prose dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: miniLesson.content_html }}
            />
          )}
        </div>
      );

    default:
      return (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <p className="text-gray-600 dark:text-gray-400">
            Unknown content type
          </p>
        </div>
      );
  }
};
