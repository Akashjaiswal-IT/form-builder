import ImageKit from "imagekit";
import { env } from "../env";

function createImageKitClient(): ImageKit | null {
  if (env.IMAGEKIT_PUBLIC_KEY && env.IMAGEKIT_PRIVATE_KEY && env.IMAGEKIT_URL_ENDPOINT) {
    return new ImageKit({
      publicKey: env.IMAGEKIT_PUBLIC_KEY,
      privateKey: env.IMAGEKIT_PRIVATE_KEY,
      urlEndpoint: env.IMAGEKIT_URL_ENDPOINT,
    });
  }
  return null;
}

const _client = createImageKitClient();

export const imageKitClient = _client!;

class ImageKitService {
  public getUploadAuthenticationParameters() {
    if (!_client) {
      throw new Error("ImageKit is not configured.");
    }
    return {
      ..._client.getAuthenticationParameters(),
      publicKey: env.IMAGEKIT_PUBLIC_KEY!,
      urlEndpoint: env.IMAGEKIT_URL_ENDPOINT!,
    };
  }
}

export const imageKitService = new ImageKitService();
export default ImageKitService;