/**
 * Shrinks a profile photo on the device before it is uploaded.
 *
 * Phone cameras produce 3–12 MB photos. The backend refuses anything over 5 MB
 * and then crops the avatar to 400×400 anyway, and on a slow or metered
 * connection a multi-megabyte upload is the slow part of changing a photo. A
 * photo scaled so its longest side is 800 px is typically 80–250 KB.
 */

/** Longest side of the uploaded photo. Avatars are shown at ≤ 384 CSS px. */
export const AVATAR_MAX_EDGE_PX = 800;
/** A photo already this small and light is sent as it is — re-encoding only costs quality. */
const LEAVE_ALONE_UNDER_BYTES = 300 * 1024;
const JPEG_QUALITY = 0.85;

/**
 * The size to draw an image at so its longest side is at most `maxEdge`,
 * keeping its proportions. Never enlarges.
 */
export const fitWithin = (
  width: number,
  height: number,
  maxEdge: number
): { width: number; height: number } => {
  const longest = Math.max(width, height);
  if (longest <= maxEdge) return { width, height };

  const scale = maxEdge / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
};

const loadImage = (file: File): Promise<{ image: HTMLImageElement; release: () => void }> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const release = () => URL.revokeObjectURL(url);
    const image = new Image();
    image.onload = () => resolve({ image, release });
    image.onerror = () => {
      release();
      reject(new Error("The image could not be decoded"));
    };
    image.src = url;
  });

const canvasToBlob = (
  canvas: HTMLCanvasElement,
  type: string,
  quality: number
): Promise<Blob | null> =>
  new Promise((resolve) => canvas.toBlob(resolve, type, quality));

/** True if any pixel is not fully opaque. If that can't be read, assume it is, so nothing is flattened. */
const hasTransparency = (
  context: CanvasRenderingContext2D,
  width: number,
  height: number
): boolean => {
  try {
    const { data } = context.getImageData(0, 0, width, height);
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] < 255) return true;
    }
    return false;
  } catch {
    return true;
  }
};

const renamedFor = (file: File, type: string): string => {
  const base = file.name.replace(/\.[^./\\]+$/, "") || "avatar";
  return `${base}.${type === "image/png" ? "png" : "jpg"}`;
};

/**
 * Returns `file` scaled down to at most {@link AVATAR_MAX_EDGE_PX} on its
 * longest side and re-encoded as JPEG (PNG when the picture has transparency,
 * which JPEG would flatten to black). EXIF orientation is applied by the
 * browser when it decodes the photo, so a portrait shot stays upright after
 * the metadata is dropped.
 *
 * The same `File` comes back when there is nothing to gain: it is already
 * small, or re-encoding would not make it smaller. It never rejects. If the
 * browser can't decode or encode the image, the original is returned and the
 * upload carries on exactly as before.
 */
export const prepareAvatarImage = async (file: File): Promise<File> => {
  let release: (() => void) | undefined;
  let canvas: HTMLCanvasElement | undefined;

  try {
    const loaded = await loadImage(file);
    release = loaded.release;
    const { image } = loaded;

    const target = fitWithin(image.naturalWidth, image.naturalHeight, AVATAR_MAX_EDGE_PX);
    const resized = target.width !== image.naturalWidth || target.height !== image.naturalHeight;
    if (!resized && file.size <= LEAVE_ALONE_UNDER_BYTES) return file;

    canvas = document.createElement("canvas");
    canvas.width = target.width;
    canvas.height = target.height;
    const context = canvas.getContext("2d");
    if (!context) return file;

    context.imageSmoothingQuality = "high";
    context.drawImage(image, 0, 0, target.width, target.height);

    // A JPEG can't have transparency, so there's nothing to look for in one.
    const keepAlpha =
      file.type !== "image/jpeg" && hasTransparency(context, target.width, target.height);
    const type = keepAlpha ? "image/png" : "image/jpeg";

    const blob = await canvasToBlob(canvas, type, JPEG_QUALITY);
    // `toBlob` quietly hands back a PNG when the browser can't encode the type asked for.
    if (!blob || blob.type !== type) return file;
    // Never make it worse.
    if (blob.size >= file.size) return file;

    return new File([blob], renamedFor(file, type), { type, lastModified: Date.now() });
  } catch {
    return file;
  } finally {
    release?.();
    // Hands the pixel memory back promptly; phones are tight on it.
    if (canvas) {
      canvas.width = 0;
      canvas.height = 0;
    }
  }
};
