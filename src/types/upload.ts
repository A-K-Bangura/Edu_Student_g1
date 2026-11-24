// Upload presign response types
export interface UploadPresignRequest {
  purpose: "avatar" | "credential" | "lesson_media" | "feed_media" | "thumbnail" | "document";
  file_type: string;
  file_size: number;
}

/**
 * `POST /upload/presign`. Mirrors what `UploadController::presign` passes
 * through from `CloudinaryService::generateUploadSignature`.
 *
 * Two generations of this response exist. docs/STUDENT_API_PAYLOADS.md §10
 * still describes the older one (signs `folder`, returns `upload_url`); the
 * backend has signed `timestamp` + `upload_preset` since 2025-11-17 and returns
 * no `upload_url`. Everything beyond the signing basics is therefore optional,
 * and the upload code handles both.
 */
export interface UploadPresignResponse {
  signature: string;
  timestamp: number;
  cloud_name: string;
  api_key: string;
  /** Current backend: the signed preset the upload must name. */
  upload_preset?: string | null;
  /** Older contract: the signed folder. Not signed (so not sent) when a preset is used. */
  folder?: string;
  /** Cloudinary resource type for the upload endpoint; "image" for avatars. */
  resource_type?: string;
  /** Older contract only; current backends return none. */
  upload_url?: string;
  max_size_bytes?: number;
  allowed_types?: string[];
  transformations?: Record<string, unknown> | null;
}

// Cloudinary upload response types
export interface CloudinaryUploadResponse {
  asset_id: string;
  public_id: string;
  version: number;
  width: number;
  height: number;
  format: string;
  resource_type: string;
  created_at: string;
  bytes: number;
  url: string;
  secure_url: string;
}

// Store metadata request types
export interface StoreMetadataRequest {
  cloudinary_data: CloudinaryUploadResponse;
  purpose: "avatar" | "credential" | "lesson_media" | "feed_media" | "thumbnail" | "document";
  entity_type?: string;
  entity_id?: number;
}

export interface FileUpload {
  id: number;
  uuid: string;
  upload_purpose: string;
  cloudinary_secure_url: string;
  format: string;
  bytes: number;
  width?: number;
  height?: number;
  entity_type?: string;
  entity_id?: number;
}

export interface StoreMetadataResponse {
  file_upload: FileUpload;
}

