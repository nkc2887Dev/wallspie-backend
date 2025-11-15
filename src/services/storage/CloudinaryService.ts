import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { IStorageService, UploadResult } from './IStorageService';

export class CloudinaryService implements IStorageService {
  constructor() {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  async upload(
    file: Buffer,
    options: { folder?: string; filename?: string; format?: string }
  ): Promise<UploadResult> {
    return new Promise((resolve, reject) => {
      const uploadOptions: any = {
        folder: options.folder || 'wallpapers',
        resource_type: 'image',
        public_id: options.filename,
      };

      if (options.format) {
        uploadOptions.format = options.format;
      }

      const uploadStream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result) => {
          if (error) {
            reject(error);
          } else if (result) {
            resolve({
              url: result.secure_url,
              publicId: result.public_id,
              format: result.format,
              width: result.width,
              height: result.height,
              size: result.bytes,
            });
          }
        }
      );

      uploadStream.end(file);
    });
  }

  async delete(publicId: string): Promise<void> {
    await cloudinary.uploader.destroy(publicId);
  }

  getUrl(
    publicId: string,
    options?: {
      width?: number;
      height?: number;
      quality?: number;
      format?: string;
    }
  ): string {
    const transformations: any = {};

    if (options?.width) transformations.width = options.width;
    if (options?.height) transformations.height = options.height;
    if (options?.quality) transformations.quality = options.quality;
    if (options?.format) transformations.format = options.format;

    return cloudinary.url(publicId, transformations);
  }

  async generateResolutions(
    file: Buffer,
    options: { folder?: string; filename?: string }
  ): Promise<UploadResult[]> {
    const resolutions = [
      { name: '1080p', width: 1920, height: 1080 },
      { name: '1440p', width: 2560, height: 1440 },
      { name: '4K', width: 3840, height: 2160 },
      { name: 'Mobile', width: 1080, height: 1920 },
      { name: 'Tablet', width: 1536, height: 2048 },
    ];

    // Upload original first
    const originalUpload = await this.upload(file, {
      folder: options.folder,
      filename: options.filename ? `${options.filename}-original` : undefined,
    });

    const results: UploadResult[] = [
      {
        ...originalUpload,
        width: originalUpload.width,
        height: originalUpload.height,
      },
    ];

    // Generate and upload resized versions
    for (const res of resolutions) {
      try {
        const resizedUrl = this.getUrl(originalUpload.publicId!, {
          width: res.width,
          height: res.height,
          quality: 90,
        });

        results.push({
          url: resizedUrl,
          publicId: `${originalUpload.publicId}-${res.name.toLowerCase()}`,
          width: res.width,
          height: res.height,
        });
      } catch (error) {
        console.error(`Failed to generate ${res.name} resolution:`, error);
      }
    }

    return results;
  }
}
