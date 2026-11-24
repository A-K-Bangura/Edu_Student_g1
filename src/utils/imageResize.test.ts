import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AVATAR_MAX_EDGE_PX, fitWithin, prepareAvatarImage } from "./imageResize";

describe("fitWithin", () => {
  it("scales the longest side down to the limit, keeping proportions", () => {
    expect(fitWithin(4000, 3000, 800)).toEqual({ width: 800, height: 600 });
    expect(fitWithin(3000, 4000, 800)).toEqual({ width: 600, height: 800 });
    expect(fitWithin(5000, 5000, 800)).toEqual({ width: 800, height: 800 });
  });

  it("never enlarges", () => {
    expect(fitWithin(600, 400, 800)).toEqual({ width: 600, height: 400 });
    expect(fitWithin(800, 800, 800)).toEqual({ width: 800, height: 800 });
  });

  it("never rounds a thin image down to nothing", () => {
    // 4 × (800 / 10000) = 0.32, which rounds to 0 without the clamp.
    expect(fitWithin(10000, 4, 800)).toEqual({ width: 800, height: 1 });
  });
});

// ---------------------------------------------------------------------------
// jsdom can't decode images or draw on a canvas, so those two seams are
// stubbed. (Real decoding, EXIF orientation and the real encoders are checked
// in a browser — see docs/KNOWN_ISSUES.md.)
// ---------------------------------------------------------------------------
interface Drawn {
  canvasWidth: number;
  canvasHeight: number;
  drawArgs: unknown[];
}

let decode: { width: number; height: number } | "fails";
let alphaPixels: number[]; // alpha values handed back by getImageData
let encoded: { bytes: number; type?: string } | null;
let drawn: Drawn | null;
let getContextReturnsNull: boolean;
let drawThrows: boolean;
let toBlobCalls: Array<{ type: string; quality: number }>;
let getImageData: ReturnType<typeof vi.fn>;
let created: ReturnType<typeof vi.fn>;
let revoked: ReturnType<typeof vi.fn>;
let canvases: HTMLCanvasElement[];

const file = (size: number, type = "image/jpeg", name = "IMG_1234.jpg") =>
  new File([new Uint8Array(size)], name, { type });

const MB = 1024 * 1024;

beforeEach(() => {
  decode = { width: 4000, height: 3000 };
  alphaPixels = [255];
  encoded = { bytes: 150 * 1024 };
  drawn = null;
  getContextReturnsNull = false;
  drawThrows = false;
  toBlobCalls = [];
  canvases = [];

  created = vi.fn(() => "blob:fake");
  revoked = vi.fn();
  Object.defineProperty(URL, "createObjectURL", { value: created, configurable: true });
  Object.defineProperty(URL, "revokeObjectURL", { value: revoked, configurable: true });

  vi.stubGlobal(
    "Image",
    class {
      naturalWidth = 0;
      naturalHeight = 0;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_value: string) {
        queueMicrotask(() => {
          if (decode === "fails") {
            this.onerror?.();
            return;
          }
          this.naturalWidth = decode.width;
          this.naturalHeight = decode.height;
          this.onload?.();
        });
      }
    }
  );

  getImageData = vi.fn(() => ({ data: Uint8ClampedArray.from(alphaPixels.flatMap((a) => [0, 0, 0, a])) }));

  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(function (
    this: HTMLCanvasElement
  ) {
    canvases.push(this);
    if (getContextReturnsNull) return null;
    return {
      imageSmoothingQuality: "low",
      drawImage: (...args: unknown[]) => {
        if (drawThrows) throw new Error("out of memory");
        drawn = { canvasWidth: this.width, canvasHeight: this.height, drawArgs: args.slice(1) };
      },
      getImageData,
    } as unknown as CanvasRenderingContext2D;
  } as never);

  vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(function (
    callback: BlobCallback,
    type?: string,
    quality?: number
  ) {
    toBlobCalls.push({ type: type ?? "", quality: quality ?? 0 });
    callback(
      encoded ? new Blob([new Uint8Array(encoded.bytes)], { type: encoded.type ?? type }) : null
    );
  } as never);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("prepareAvatarImage — shrinking", () => {
  it("scales a big phone photo down to 800px on its longest side and re-encodes it as JPEG", async () => {
    const original = file(8 * MB);

    const result = await prepareAvatarImage(original);

    expect(AVATAR_MAX_EDGE_PX).toBe(800);
    expect(drawn).toMatchObject({ canvasWidth: 800, canvasHeight: 600 });
    expect(drawn?.drawArgs).toEqual([0, 0, 800, 600]);
    expect(toBlobCalls).toEqual([{ type: "image/jpeg", quality: 0.85 }]);
    expect(result).not.toBe(original);
    expect(result.type).toBe("image/jpeg");
    expect(result.size).toBe(150 * 1024);
    expect(result.size).toBeLessThan(5 * MB);
  });

  it("keeps a portrait photo's proportions", async () => {
    decode = { width: 3000, height: 4000 };

    await prepareAvatarImage(file(6 * MB));

    expect(drawn).toMatchObject({ canvasWidth: 600, canvasHeight: 800 });
  });

  it("draws with high-quality smoothing", async () => {
    const smoothing: string[] = [];
    vi.mocked(HTMLCanvasElement.prototype.getContext).mockImplementation(function (
      this: HTMLCanvasElement
    ) {
      const context = {
        set imageSmoothingQuality(value: string) {
          smoothing.push(value);
        },
        drawImage: () => {},
        getImageData,
      };
      return context as unknown as CanvasRenderingContext2D;
    } as never);

    await prepareAvatarImage(file(8 * MB));

    expect(smoothing).toEqual(["high"]);
  });

  it("gives the result a matching name and type", async () => {
    const result = await prepareAvatarImage(file(8 * MB, "image/jpeg", "holiday.photo.JPEG"));
    expect(result.name).toBe("holiday.photo.jpg");

    const unnamed = await prepareAvatarImage(file(8 * MB, "image/jpeg", ""));
    expect(unnamed.name).toBe("avatar.jpg");
  });

  it("shrinks a heavy photo that is within the size limit without enlarging it", async () => {
    decode = { width: 700, height: 700 }; // already ≤ 800px, but 2 MB
    encoded = { bytes: 90 * 1024 };

    const result = await prepareAvatarImage(file(2 * MB, "image/png", "screenshot.png"));

    expect(drawn).toMatchObject({ canvasWidth: 700, canvasHeight: 700 });
    expect(result.size).toBe(90 * 1024);
  });
});

describe("prepareAvatarImage — leaving things alone", () => {
  it("returns the very same file, untouched, when it's already small and light", async () => {
    decode = { width: 600, height: 400 };
    const original = file(100 * 1024);

    const result = await prepareAvatarImage(original);

    expect(result).toBe(original);
    expect(canvases).toHaveLength(0); // never even drew it: no recompression loss
  });

  it("keeps the original when re-encoding wouldn't make it smaller", async () => {
    decode = { width: 700, height: 700 };
    encoded = { bytes: 600 * 1024 };
    const original = file(400 * 1024, "image/png", "logo.png");

    expect(await prepareAvatarImage(original)).toBe(original);
  });
});

describe("prepareAvatarImage — transparency", () => {
  it("keeps a PNG that has transparency as a PNG (JPEG would turn it black)", async () => {
    alphaPixels = [255, 0, 255];
    encoded = { bytes: 200 * 1024 };

    const result = await prepareAvatarImage(file(6 * MB, "image/png", "logo.png"));

    expect(toBlobCalls[0].type).toBe("image/png");
    expect(result.type).toBe("image/png");
    expect(result.name).toBe("logo.png");
  });

  it("turns a fully opaque PNG (e.g. a screenshot) into a much smaller JPEG", async () => {
    alphaPixels = [255, 255, 255];

    const result = await prepareAvatarImage(file(6 * MB, "image/png", "screenshot.png"));

    expect(toBlobCalls[0].type).toBe("image/jpeg");
    expect(result.type).toBe("image/jpeg");
    expect(result.name).toBe("screenshot.jpg");
  });

  it("treats a partly transparent pixel as transparent", async () => {
    alphaPixels = [255, 254];

    await prepareAvatarImage(file(6 * MB, "image/webp", "a.webp"));

    expect(toBlobCalls[0].type).toBe("image/png");
  });

  it("doesn't scan a JPEG for transparency — it can't have any", async () => {
    await prepareAvatarImage(file(8 * MB, "image/jpeg"));

    expect(getImageData).not.toHaveBeenCalled();
  });

  it("preserves transparency when the pixels can't be read, rather than flattening it", async () => {
    getImageData.mockImplementation(() => {
      throw new Error("canvas is tainted");
    });

    await prepareAvatarImage(file(6 * MB, "image/png"));

    expect(toBlobCalls[0].type).toBe("image/png");
  });
});

describe("prepareAvatarImage — when the browser can't do it", () => {
  it("returns the original, never rejecting, when the image can't be decoded", async () => {
    decode = "fails";
    const original = file(8 * MB);

    await expect(prepareAvatarImage(original)).resolves.toBe(original);
  });

  it("returns the original when there is no 2D canvas", async () => {
    getContextReturnsNull = true;
    const original = file(8 * MB);

    expect(await prepareAvatarImage(original)).toBe(original);
  });

  it("returns the original when encoding produces nothing", async () => {
    encoded = null;
    const original = file(8 * MB);

    expect(await prepareAvatarImage(original)).toBe(original);
  });

  it("returns the original when the browser encodes a different type than asked (it falls back to PNG)", async () => {
    encoded = { bytes: 100 * 1024, type: "image/png" }; // asked for JPEG
    const original = file(8 * MB);

    expect(await prepareAvatarImage(original)).toBe(original);
  });

  it("returns the original when drawing runs out of memory", async () => {
    drawThrows = true;
    const original = file(8 * MB);

    expect(await prepareAvatarImage(original)).toBe(original);
  });
});

describe("prepareAvatarImage — housekeeping", () => {
  it("releases the temporary image URL whether it worked, was skipped, or failed", async () => {
    await prepareAvatarImage(file(8 * MB)); // worked
    decode = { width: 600, height: 400 };
    await prepareAvatarImage(file(50 * 1024)); // skipped
    decode = "fails";
    await prepareAvatarImage(file(8 * MB)); // failed

    expect(created).toHaveBeenCalledTimes(3);
    expect(revoked).toHaveBeenCalledTimes(3);
    expect(revoked).toHaveBeenCalledWith("blob:fake");
  });

  it("hands the canvas memory back afterwards", async () => {
    await prepareAvatarImage(file(8 * MB));

    expect(canvases).toHaveLength(1);
    expect(canvases[0].width).toBe(0);
    expect(canvases[0].height).toBe(0);
  });
});
