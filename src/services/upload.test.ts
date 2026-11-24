import { createHash } from "node:crypto";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./api", () => ({ default: { post: vi.fn() } }));

import api from "./api";
import { uploadAvatar } from "./upload";

// ---------------------------------------------------------------------------
// A stand-in for the two servers the upload talks to, written from their rules:
//
// * The backend (CloudinaryService::generateUploadSignature) signs
//   `timestamp` + `upload_preset` — sorted, "k=v" joined by "&", + API secret,
//   SHA-1 — and returns the signature with the preset. Today's backend returns
//   NO `upload_url`. (Older contract, still in docs/STUDENT_API_PAYLOADS.md:
//   signs `folder` + `timestamp` and returns `upload_url`.)
// * Cloudinary re-derives the signature from *every* parameter it receives
//   except `file`, `api_key`, `cloud_name`, `resource_type` — so the client
//   must send exactly the signed set, no more and no fewer.
// ---------------------------------------------------------------------------
const SECRET = "test-api-secret";

const stringToSign = (params: Record<string, string | number>) =>
  Object.keys(params)
    .sort()
    .filter((key) => params[key] !== "" && params[key] != null)
    .map((key) => `${key}=${params[key]}`)
    .join("&");

const sign = (params: Record<string, string | number>) =>
  createHash("sha1").update(stringToSign(params) + SECRET).digest("hex");

const TIMESTAMP = 1_758_800_000;

/** What `POST /upload/presign` returns today (the keys UploadController passes through). */
const currentPresign = () => ({
  signature: sign({ timestamp: TIMESTAMP, upload_preset: "edulift_avatar_preset" }),
  timestamp: TIMESTAMP,
  cloud_name: "demo",
  api_key: "key-123",
  upload_preset: "edulift_avatar_preset",
  folder: "edulift/avatars",
  resource_type: "image",
  max_size_bytes: 5 * 1024 * 1024,
  allowed_types: ["image/jpeg", "image/png", "image/webp"],
  transformations: { width: 400, height: 400, crop: "fill", quality: "auto" },
});

/** The older shape documented in STUDENT_API_PAYLOADS.md §10. */
const legacyPresign = () => ({
  signature: sign({ folder: "edulift/avatars", timestamp: TIMESTAMP }),
  timestamp: TIMESTAMP,
  cloud_name: "demo",
  api_key: "key-123",
  folder: "edulift/avatars",
  upload_url: "https://api.cloudinary.com/v1_1/demo/image/upload",
});

interface CloudinaryCall {
  url: string;
  fields: Record<string, string>;
  fileName: string | null;
}

let cloudinaryCalls: CloudinaryCall[];
let cloudinaryReply: (call: CloudinaryCall) => { ok: boolean; status: number; body: unknown };

/** Verifies the signature the way Cloudinary does; 401 "Invalid Signature" on mismatch. */
const verifyLikeCloudinary = (call: CloudinaryCall) => {
  const { signature, api_key: _apiKey, cloud_name: _cloud, resource_type: _type, ...signed } =
    call.fields;
  void _apiKey;
  void _cloud;
  void _type;
  if (sign(signed) !== signature) {
    return {
      ok: false,
      status: 401,
      body: {
        error: {
          message: `Invalid Signature ${signature}. String to sign - '${stringToSign(signed)}'.`,
        },
      },
    };
  }
  return {
    ok: true,
    status: 200,
    body: {
      public_id: "edulift/avatars/abc123",
      resource_type: "image",
      secure_url: "https://res.cloudinary.com/demo/image/upload/v1/edulift/avatars/abc123.png",
      url: "http://res.cloudinary.com/demo/image/upload/v1/edulift/avatars/abc123.png",
    },
  };
};

const file = () => new File([new Uint8Array(2048)], "me.png", { type: "image/png" });

const apiPost = vi.mocked(api.post);

const presignReturns = (data: unknown) => {
  apiPost.mockImplementation(async (url: string) => {
    if (url === "/upload/presign") {
      return { data: { success: true, data } };
    }
    if (url === "/upload/store-metadata") {
      return { data: { success: true, data: { file_upload: { id: 42 } } } };
    }
    throw new Error(`unexpected POST ${url}`);
  });
};

beforeEach(() => {
  vi.resetAllMocks();
  cloudinaryCalls = [];
  cloudinaryReply = verifyLikeCloudinary;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: unknown, init?: { body?: FormData }) => {
      const fields: Record<string, string> = {};
      let fileName: string | null = null;
      init?.body?.forEach((value, key) => {
        if (value instanceof File) fileName = value.name;
        else fields[key] = String(value);
      });
      const call = { url: String(input), fields, fileName };
      cloudinaryCalls.push(call);
      const reply = cloudinaryReply(call);
      return {
        ok: reply.ok,
        status: reply.status,
        json: async () => {
          if (reply.body === "not json") throw new SyntaxError("Unexpected token <");
          return reply.body;
        },
      };
    })
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("uploadAvatar — against the current backend", () => {
  it("uploads to Cloudinary's endpoint for the returned cloud, which the presign response gives no URL for", async () => {
    presignReturns(currentPresign());

    await uploadAvatar(file());

    expect(cloudinaryCalls).toHaveLength(1);
    // Used to be `fetch(undefined)`: the photo was POSTed to the app's own origin ("/undefined").
    expect(cloudinaryCalls[0].url).toBe("https://api.cloudinary.com/v1_1/demo/image/upload");
    expect(cloudinaryCalls[0].fileName).toBe("me.png");
  });

  it("sends exactly the signed parameters: the preset, not an unsigned folder", async () => {
    presignReturns(currentPresign());

    await uploadAvatar(file());

    const { fields } = cloudinaryCalls[0];
    expect(fields.upload_preset).toBe("edulift_avatar_preset");
    expect(fields.timestamp).toBe(String(TIMESTAMP));
    expect(fields.api_key).toBe("key-123");
    // An extra, unsigned parameter changes the string Cloudinary signs -> "Invalid Signature".
    expect(fields).not.toHaveProperty("folder");
  });

  it("produces a signature Cloudinary accepts, then stores the result against the signed-in student's avatar", async () => {
    presignReturns(currentPresign());

    const result = await uploadAvatar(file());

    expect(cloudinaryReply(cloudinaryCalls[0]).ok).toBe(true);
    expect(apiPost).toHaveBeenCalledWith(
      "/upload/store-metadata",
      expect.objectContaining({
        purpose: "avatar",
        cloudinary_data: expect.objectContaining({
          public_id: "edulift/avatars/abc123",
          resource_type: "image",
          secure_url: expect.stringMatching(/^https:\/\/res\.cloudinary\.com\/demo\//),
        }),
      })
    );
    expect(result.file_upload.id).toBe(42);
  });

  it("asks for the signature with the file's real type and size", async () => {
    presignReturns(currentPresign());

    await uploadAvatar(file());

    expect(apiPost).toHaveBeenCalledWith("/upload/presign", {
      purpose: "avatar",
      file_type: "image/png",
      file_size: 2048,
    });
  });
});

describe("uploadAvatar — against the older documented contract", () => {
  it("still works: posts to the given Cloudinary URL with the signed folder", async () => {
    presignReturns(legacyPresign());

    await uploadAvatar(file());

    expect(cloudinaryCalls[0].url).toBe("https://api.cloudinary.com/v1_1/demo/image/upload");
    expect(cloudinaryCalls[0].fields.folder).toBe("edulift/avatars");
    expect(cloudinaryCalls[0].fields).not.toHaveProperty("upload_preset");
    expect(cloudinaryReply(cloudinaryCalls[0]).ok).toBe(true);
  });
});

describe("uploadAvatar — what the backend tells it to do with the photo", () => {
  it("won't send the photo to a host that isn't Cloudinary, even if the response says to", async () => {
    presignReturns({ ...currentPresign(), upload_url: "https://evil.example/collect" });

    await uploadAvatar(file());

    expect(cloudinaryCalls[0].url).toBe("https://api.cloudinary.com/v1_1/demo/image/upload");
  });

  it("won't use a non-https upload URL either", async () => {
    presignReturns({
      ...currentPresign(),
      upload_url: "http://api.cloudinary.com/v1_1/demo/image/upload",
    });

    await uploadAvatar(file());

    expect(cloudinaryCalls[0].url).toBe("https://api.cloudinary.com/v1_1/demo/image/upload");
  });

  it("keeps the cloud name from escaping the URL path", async () => {
    presignReturns({ ...currentPresign(), cloud_name: "demo/../x" });

    await uploadAvatar(file());

    expect(cloudinaryCalls[0].url).toBe(
      "https://api.cloudinary.com/v1_1/demo%2F..%2Fx/image/upload"
    );
  });
});

describe("uploadAvatar — failures say what went wrong", () => {
  it("surfaces Cloudinary's own message and never records a photo that wasn't uploaded", async () => {
    presignReturns(currentPresign());
    cloudinaryReply = () => ({
      ok: false,
      status: 401,
      body: { error: { message: "Invalid Signature abc" } },
    });

    await expect(uploadAvatar(file())).rejects.toThrow("Invalid Signature abc");
    expect(apiPost).not.toHaveBeenCalledWith("/upload/store-metadata", expect.anything());
  });

  it("copes with an error response that isn't JSON", async () => {
    presignReturns(currentPresign());
    cloudinaryReply = () => ({ ok: false, status: 404, body: "not json" });

    await expect(uploadAvatar(file())).rejects.toThrow(/upload failed/i);
  });

  it("passes the backend's refusal (wrong type / too big) straight through", async () => {
    apiPost.mockRejectedValue(new Error("File type 'image/gif' is not allowed"));

    await expect(uploadAvatar(file())).rejects.toThrow("not allowed");
    expect(cloudinaryCalls).toHaveLength(0);
  });
});
