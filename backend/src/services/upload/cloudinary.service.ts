import {
  v2 as cloudinary,
  UploadApiResponse,
  UploadApiErrorResponse,
} from "cloudinary";
import logger from "@utils/logger";
import streamifier from "streamifier";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

interface UploadResult {
  url: string;
  publicId: string;
  width?: number;
  height?: number;
  format?: string;
  resourceType: "image" | "video";
  thumbnailUrl?: string;
}

class CloudinaryService {
  /**
   * Upload image from buffer
   */
  async uploadImage(
    fileBuffer: Buffer,
    folder: string = "instagram/images"
  ): Promise<UploadResult> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: "image",
          transformation: [
            { quality: "auto", fetch_format: "auto" },
            { width: 1080, crop: "limit" },
          ],
          eager: [
            { width: 150, height: 150, crop: "fill", gravity: "auto" }, // thumbnail
            { width: 640, crop: "limit" }, // medium size
          ],
          eager_async: false,
        },
        (
          error: UploadApiErrorResponse | undefined,
          result: UploadApiResponse | undefined
        ) => {
          if (error) {
            logger.error(`Cloudinary image upload error: ${error.message}`);
            reject(new Error("Image upload failed"));
            return;
          }

          if (!result) {
            reject(new Error("Upload result is undefined"));
            return;
          }

          const uploadResult: UploadResult = {
            url: result.secure_url,
            publicId: result.public_id,
            width: result.width,
            height: result.height,
            format: result.format,
            resourceType: "image",
            thumbnailUrl: result.eager?.[0]?.secure_url,
          };

          logger.info(`Image uploaded successfully: ${result.public_id}`);
          resolve(uploadResult);
        }
      );

      streamifier.createReadStream(fileBuffer).pipe(uploadStream);
    });
  }

  /**
   * Upload video from buffer
   */
  async uploadVideo(
    fileBuffer: Buffer,
    folder: string = "instagram/videos"
  ): Promise<UploadResult> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: "video",
          timeout: 600000, // 10 minutes timeout for large videos
          chunk_size: 20000000, // 20MB chunks for more reliable upload
          // Minimal transformations for faster upload
          eager: [
            {
              format: "jpg",
              transformation: [{ width: 480, crop: "fill", gravity: "auto" }],
            },
          ],
          eager_async: false, // Wait for thumbnail generation
        },
        (
          error: UploadApiErrorResponse | undefined,
          result: UploadApiResponse | undefined
        ) => {
          if (error) {
            logger.error(`Cloudinary video upload error: ${error.message}`);
            reject(new Error(`Video upload failed: ${error.message}`));
            return;
          }

          if (!result) {
            logger.error("Cloudinary returned no result for video upload");
            reject(new Error("Upload result is undefined"));
            return;
          }

          if (!result.secure_url) {
            logger.error("Cloudinary returned no URL for video");
            reject(new Error("Upload returned no URL"));
            return;
          }

          const uploadResult: UploadResult = {
            url: result.secure_url,
            publicId: result.public_id,
            width: result.width,
            height: result.height,
            format: result.format,
            resourceType: "video",
            thumbnailUrl:
              result.eager?.[0]?.secure_url ||
              result.secure_url.replace(/\.[^.]+$/, ".jpg"),
          };

          logger.info(
            `Video uploaded successfully: ${result.public_id}, URL: ${result.secure_url}`
          );
          resolve(uploadResult);
        }
      );

      // Add error handler for the stream
      uploadStream.on("error", (err) => {
        logger.error(`Upload stream error: ${err.message}`);
        reject(new Error("Upload stream failed"));
      });

      streamifier.createReadStream(fileBuffer).pipe(uploadStream);
    });
  }

  /**
   * Upload profile photo (circular crop)
   */
  async uploadProfilePhoto(fileBuffer: Buffer): Promise<UploadResult> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "instagram/profiles",
          resource_type: "image",
          transformation: [
            { width: 400, height: 400, crop: "fill", gravity: "face" },
            { quality: "auto", fetch_format: "auto" },
          ],
          eager: [
            {
              width: 150,
              height: 150,
              crop: "fill",
              gravity: "face",
              radius: "max",
            },
            {
              width: 50,
              height: 50,
              crop: "fill",
              gravity: "face",
              radius: "max",
            },
          ],
          eager_async: false,
        },
        (
          error: UploadApiErrorResponse | undefined,
          result: UploadApiResponse | undefined
        ) => {
          if (error) {
            logger.error(
              `Cloudinary profile photo upload error: ${error.message}`
            );
            reject(new Error("Profile photo upload failed"));
            return;
          }

          if (!result) {
            reject(new Error("Upload result is undefined"));
            return;
          }

          const uploadResult: UploadResult = {
            url: result.secure_url,
            publicId: result.public_id,
            width: result.width,
            height: result.height,
            format: result.format,
            resourceType: "image",
          };

          logger.info(
            `Profile photo uploaded successfully: ${result.public_id}`
          );
          resolve(uploadResult);
        }
      );

      streamifier.createReadStream(fileBuffer).pipe(uploadStream);
    });
  }

  /**
   * Delete file from Cloudinary
   */
  async deleteFile(
    publicId: string,
    resourceType: "image" | "video" = "image"
  ): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType,
      });
      logger.info(`File deleted successfully: ${publicId}`);
    } catch (error: any) {
      logger.error(`Cloudinary delete error: ${error.message}`);
      throw new Error("File deletion failed");
    }
  }

  /**
   * Get Cloudinary URL for a public ID
   */
  getUrl(publicId: string, transformation?: any): string {
    return cloudinary.url(publicId, transformation);
  }
}

export default new CloudinaryService();
