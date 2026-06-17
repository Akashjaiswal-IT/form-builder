import ImageKit from "imagekit";

let cached: ImageKit | null = null;

export function getImageKitClient(config: {
  publicKey?: string;
  privateKey?: string;
  urlEndpoint?: string;
}): ImageKit | null {
  if (cached) return cached;
  if (config.publicKey && config.privateKey && config.urlEndpoint) {
    cached = new ImageKit({
      publicKey: config.publicKey,
      privateKey: config.privateKey,
      urlEndpoint: config.urlEndpoint,
    });
  }
  return cached;
}

class ImageKitService {
  public getUploadAuthenticationParameters(config: {
    publicKey?: string;
    urlEndpoint?: string;
  }) {
    const client = getImageKitClient(config);
    if (!client) {
      throw new Error("ImageKit is not configured.");
    }
    return {
      ...client.getAuthenticationParameters(),
      publicKey: config.publicKey ?? "",
      urlEndpoint: config.urlEndpoint ?? "",
    };
  }
}

export const imageKitService = new ImageKitService();
export default ImageKitService;