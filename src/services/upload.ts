import api from "./api";
import type { ApiResponse } from "../types";
import type {
  UploadPresignRequest,
  UploadPresignResponse,
  CloudinaryUploadResponse,
  StoreMetadataRequest,
  StoreMetadataResponse,
} from "../types/upload";

/**
 * Step 1: Get upload signature from Laravel
 */
export const getUploadPresign = async (
  request: UploadPresignRequest
): Promise<UploadPresignResponse> => {
  const response = await api.post<ApiResponse<UploadPresignResponse>>(
    "/upload/presign",
    request
  );

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || "Failed to get upload signature");
  }

  return response.data.data;
};

const CLOUDINARY_HOST = "api.cloudinary.com";

/**
 * Where to POST the file. The current backend returns no `upload_url` (older
 * ones did), so the endpoint is built from the cloud and resource type, the
 * same way Cloudinary documents it. A supplied `upload_url` is only honoured
 * if it is https on Cloudinary's own host: the student's photo is about to be
 * sent there, and a response must not be able to redirect it elsewhere.
 */
export const getCloudinaryUploadUrl = (
  signatureData: UploadPresignResponse
): string => {
  if (signatureData.upload_url) {
    try {
      const supplied = new URL(signatureData.upload_url);
      if (supplied.protocol === "https:" && supplied.hostname === CLOUDINARY_HOST) {
        return supplied.toString();
      }
    } catch {
      // Not a URL — fall through to the canonical endpoint.
    }
  }

  const cloud = encodeURIComponent(signatureData.cloud_name);
  const resourceType = signatureData.resource_type || "image";
  return `https://${CLOUDINARY_HOST}/v1_1/${cloud}/${resourceType}/upload`;
};

/**
 * Step 2: Upload file directly to Cloudinary
 * This is a client-side upload to Cloudinary's API
 *
 * Cloudinary re-derives the signature from every parameter it receives (bar
 * `file`, `api_key`, `cloud_name`, `resource_type`), so the form must carry
 * exactly the parameters the backend signed: `timestamp` plus `upload_preset`
 * today. Adding anything unsigned — such as the `folder` the older contract
 * signed — makes the signatures disagree and the upload is refused with
 * "Invalid Signature".
 */
export const uploadToCloudinary = async (
  file: File,
  signatureData: UploadPresignResponse
): Promise<CloudinaryUploadResponse> => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", signatureData.api_key);
  formData.append("timestamp", signatureData.timestamp.toString());
  formData.append("signature", signatureData.signature);
  if (signatureData.upload_preset) {
    formData.append("upload_preset", signatureData.upload_preset);
  } else if (signatureData.folder) {
    // Older contract: the folder was the signed parameter.
    formData.append("folder", signatureData.folder);
  }

  const response = await fetch(getCloudinaryUploadUrl(signatureData), {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error?.message || "Cloudinary upload failed"
    );
  }

  return await response.json();
};

/**
 * Step 3: Store metadata and update avatar
 */
export const storeUploadMetadata = async (
  request: StoreMetadataRequest
): Promise<StoreMetadataResponse> => {
  const response = await api.post<ApiResponse<StoreMetadataResponse>>(
    "/upload/store-metadata",
    request
  );

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || "Failed to store metadata");
  }

  return response.data.data;
};

/**
 * Complete avatar upload flow (all 3 steps)
 */
export const uploadAvatar = async (
  file: File
): Promise<StoreMetadataResponse> => {
  // Step 1: Get upload signature
  const signatureData = await getUploadPresign({
    purpose: "avatar",
    file_type: file.type,
    file_size: file.size,
  });

  // Step 2: Upload to Cloudinary
  const cloudinaryResponse = await uploadToCloudinary(file, signatureData);

  // Step 3: Store metadata (omitting entity_type and entity_id for own avatar)
  const metadataResponse = await storeUploadMetadata({
    cloudinary_data: cloudinaryResponse,
    purpose: "avatar",
  });

  return metadataResponse;
};

