"use client";

import { api } from "~/trpc/server";

/**
 * Uploads a single file to ImageKit using authentication parameters
 * obtained from the public tRPC endpoint. Safe to call outside React.
 */
export async function uploadFileToImageKit(file: File): Promise<{
  url: string;
  fileId: string;
}> {
  // This is a public procedure – no session needed
  const authResult = await api.auth.getImageKitUploadAuthenticationParameters.query();

  if (!authResult) {
    throw new Error("Unable to prepare file upload.");
  }

  const fileName = `${globalThis.crypto.randomUUID()}-${file.name}`;
  const formData = new FormData();
  formData.append("file", file);
  formData.append("fileName", fileName);
  formData.append("folder", "/form-builder/uploads");
  formData.append("publicKey", authResult.publicKey);
  formData.append("signature", authResult.signature);
  formData.append("expire", String(authResult.expire));
  formData.append("token", authResult.token);

  const uploadResponse = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
    method: "POST",
    body: formData,
  });

  if (!uploadResponse.ok) {
    throw new Error("File upload failed.");
  }

  const result = (await uploadResponse.json()) as {
    url?: string;
    fileId?: string;
  };

  if (!result.url) {
    throw new Error("ImageKit did not return a file URL.");
  }

  return {
    url: result.url,
    fileId: result.fileId ?? "",
  };
}