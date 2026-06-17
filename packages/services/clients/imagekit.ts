import ImageKit from "imagekit";
import { env } from "../env";

export const imageKitClient = new ImageKit({
  publicKey: env.IMAGEKIT_PUBLIC_KEY ?? "",
  privateKey: env.IMAGEKIT_PRIVATE_KEY ?? "",
  urlEndpoint: env.IMAGEKIT_URL_ENDPOINT ?? "",
});

class ImageKitService {
  public getUploadAuthenticationParameters() {
    return {
      ...imageKitClient.getAuthenticationParameters(),
      publicKey: env.IMAGEKIT_PUBLIC_KEY ?? "",
      urlEndpoint: env.IMAGEKIT_URL_ENDPOINT ?? "",
    };
  }
}

export const imageKitService = new ImageKitService();
export default ImageKitService;