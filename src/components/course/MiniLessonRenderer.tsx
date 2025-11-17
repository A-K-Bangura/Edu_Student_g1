import { useMemo, useState, type ReactElement } from "react";
import type {
  MiniLesson,
  MiniLessonBlock,
  MiniLessonBlockContentType,
  MiniLessonTextType,
} from "../../types/lesson";
import {
  FileText,
  Image as ImageIcon,
  Video,
  Download,
  Sparkles,
  Info,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";

interface MiniLessonRendererProps {
  miniLesson: MiniLesson;
}

const sortBlocks = (blocks: MiniLessonBlock[]): MiniLessonBlock[] =>
  [...blocks].sort((a, b) => a.order_index - b.order_index);

const fallbackBlockFromLegacy = (lesson: MiniLesson): MiniLessonBlock => ({
  id: lesson.id,
  mini_lesson_id: lesson.id,
  content_type: (lesson.content_type as MiniLessonBlockContentType) || "text",
  text_type: lesson.text_type ?? "plain",
  content: lesson.content || lesson.content_html || "",
  media_url: lesson.media_url || null,
  media_metadata: lesson.media_metadata || null,
  order_index: lesson.order_index ?? 0,
});

const renderTextContent = (content: string) => {
  const paragraphs = content
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  if (!paragraphs.length) {
    return null;
  }

  return paragraphs.map((paragraph, idx) => (
    <p key={idx} className="whitespace-pre-wrap leading-relaxed">
      {paragraph}
    </p>
  ));
};

const TextBlock = ({
  block,
}: {
  block: MiniLessonBlock;
}): ReactElement | null => {
  const content = block.content || "";
  const textType = (block.text_type || "plain") as MiniLessonTextType;

  if (!content.trim()) {
    return null;
  }

  if (textType === "plain") {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-5 h-5 text-azure-500" />
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
            Text Content
          </span>
        </div>
        <div className="prose dark:prose-invert max-w-none space-y-3 text-gray-700 dark:text-gray-200">
          {renderTextContent(content)}
        </div>
      </div>
    );
  }

  const styles: Record<MiniLessonTextType, string> = {
    remember:
      "bg-emerald-50 border border-emerald-200 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200 dark:border-emerald-800",
    simply_put:
      "bg-sky-50 border border-sky-200 text-sky-800 dark:bg-sky-900/30 dark:text-sky-200 dark:border-sky-800",
    important:
      "bg-rose-50 border border-rose-200 text-rose-800 dark:bg-rose-900/30 dark:text-rose-200 dark:border-rose-800",
    plain: "", // handled earlier
  } as const;

  const iconMap: Record<MiniLessonTextType, ReactElement> = {
    remember: <Sparkles className="w-5 h-5" />,
    simply_put: <Info className="w-5 h-5" />,
    important: <AlertTriangle className="w-5 h-5" />,
    plain: <FileText className="w-5 h-5" />,
  } as const;

  const titles: Record<MiniLessonTextType, string> = {
    remember: "Remember",
    simply_put: "Simply Put",
    important: "Important",
    plain: "Text Content",
  } as const;

  return (
    <div
      className={`rounded-lg p-5 shadow-sm flex items-start gap-3 ${styles[textType]}`}
    >
      <span className="mt-1">{iconMap[textType]}</span>
      <div className="space-y-2 text-sm">
        <p className="font-semibold uppercase tracking-wide text-xs opacity-80">
          {titles[textType]}
        </p>
        <div className="space-y-3">{renderTextContent(content)}</div>
      </div>
    </div>
  );
};

const ImageBlock = ({
  block,
  onPreview,
}: {
  block: MiniLessonBlock;
  onPreview: (url: string) => void;
}): ReactElement => {
  const description = block.content;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <ImageIcon className="w-5 h-5 text-azure-500" />
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
            Image
          </span>
        </div>
        {block.media_url && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onPreview(block.media_url as string)}
              className="inline-flex items-center gap-2 text-sm text-azure-500 hover:text-azure-600"
            >
              <ExternalLink className="w-4 h-4" /> View
            </button>
            <a
              href={block.media_url}
              download
              className="inline-flex items-center gap-2 text-sm text-azure-500 hover:text-azure-600"
            >
              <Download className="w-4 h-4" /> Download
            </a>
          </div>
        )}
      </div>

      {block.media_url ? (
        <div className="space-y-4">
          <img
            src={block.media_url}
            alt={description || miniLessonFallbackAlt(block)}
            className="w-full rounded-lg shadow-md cursor-pointer"
            onClick={() => onPreview(block.media_url as string)}
            loading="lazy"
          />
          {description && (
            <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
              {description}
            </p>
          )}
        </div>
      ) : (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Image unavailable.
        </p>
      )}
    </div>
  );
};

const VideoBlock = ({ block }: { block: MiniLessonBlock }): ReactElement => (
  <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
    <div className="flex items-center gap-2 mb-4">
      <Video className="w-5 h-5 text-azure-500" />
      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
        Video Content
      </span>
    </div>
    {block.media_url ? (
      <div className="space-y-4">
        <video
          controls
          className="w-full rounded-lg shadow-md"
          src={block.media_url}
          preload="metadata"
        >
          Your browser does not support the video tag.
        </video>
        {block.content && (
          <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
            {block.content}
          </p>
        )}
      </div>
    ) : (
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Video unavailable.
      </p>
    )}
  </div>
);

const EmbedBlock = ({ block }: { block: MiniLessonBlock }): ReactElement => {
  const url = block.media_url || "";
  const embedUrl = getYouTubeEmbedUrl(url);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-2 mb-4">
        <Video className="w-5 h-5 text-azure-500" />
        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
          Embedded Video
        </span>
      </div>
      {embedUrl ? (
        <div className="aspect-video rounded-lg overflow-hidden shadow-md">
          <iframe
            src={embedUrl}
            title="Embedded content"
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Unable to load embedded content.
        </p>
      )}
      {block.content && (
        <p className="mt-4 text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
          {block.content}
        </p>
      )}
    </div>
  );
};

const DocumentBlock = ({ block }: { block: MiniLessonBlock }): ReactElement => (
  <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
    <div className="flex items-center justify-between gap-2 mb-4">
      <div className="flex items-center gap-2">
        <FileText className="w-5 h-5 text-azure-500" />
        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
          Document
        </span>
      </div>
      {block.media_url && (
        <a
          href={block.media_url}
          download
          className="inline-flex items-center gap-2 text-sm text-azure-500 hover:text-azure-600"
        >
          <Download className="w-4 h-4" /> Download
        </a>
      )}
    </div>
    {block.media_url ? (
      <iframe
        src={block.media_url}
        title="Document viewer"
        className="w-full h-[500px] rounded-lg border border-gray-200 dark:border-gray-700"
      />
    ) : (
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Document unavailable.
      </p>
    )}
    {block.content && (
      <p className="mt-4 text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
        {block.content}
      </p>
    )}
  </div>
);

const miniLessonFallbackAlt = (block: MiniLessonBlock): string =>
  block.content?.slice(0, 120) || "Mini lesson image";

const getYouTubeEmbedUrl = (url: string): string | null => {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtube.com")) {
      const videoId = parsed.searchParams.get("v");
      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}`;
      }
    }

    if (parsed.hostname.includes("youtu.be")) {
      const id = parsed.pathname.replace("/", "");
      if (id) {
        return `https://www.youtube.com/embed/${id}`;
      }
    }
  } catch {
    return null;
  }

  return url;
};

export const MiniLessonRenderer = ({ miniLesson }: MiniLessonRendererProps) => {
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const blocks = useMemo(() => {
    if (miniLesson.blocks && miniLesson.blocks.length > 0) {
      return sortBlocks(miniLesson.blocks);
    }

    return [fallbackBlockFromLegacy(miniLesson)];
  }, [miniLesson]);

  const renderBlock = (block: MiniLessonBlock) => {
    switch (block.content_type) {
      case "text":
        return <TextBlock block={block} />;
      case "image":
        return (
          <ImageBlock block={block} onPreview={(url) => setPreviewImage(url)} />
        );
      case "video":
        return <VideoBlock block={block} />;
      case "embed":
        return <EmbedBlock block={block} />;
      case "document":
        return <DocumentBlock block={block} />;
      default:
        return (
          <TextBlock
            block={{ ...block, text_type: block.text_type || "plain" }}
          />
        );
    }
  };

  return (
    <div className="space-y-6">
      {blocks.map((block) => (
        <div key={`${block.id}-${block.order_index}`}>{renderBlock(block)}</div>
      ))}

      {previewImage && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-6">
          <button
            type="button"
            onClick={() => setPreviewImage(null)}
            className="self-end mb-4 text-white/80 hover:text-white"
          >
            Close
          </button>
          <div className="w-full max-w-4xl">
            <img
              src={previewImage}
              alt="Preview"
              className="w-full max-h-[75vh] object-contain rounded-lg"
            />
            <div className="flex justify-end gap-3 mt-4">
              <a
                href={previewImage}
                download
                className="inline-flex items-center gap-2 bg-white/10 text-white px-4 py-2 rounded-lg hover:bg-white/20"
              >
                <Download className="w-4 h-4" /> Download
              </a>
              <button
                type="button"
                onClick={() => window.open(previewImage, "_blank")}
                className="inline-flex items-center gap-2 bg-white/10 text-white px-4 py-2 rounded-lg hover:bg-white/20"
              >
                <ExternalLink className="w-4 h-4" /> Open in new tab
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
