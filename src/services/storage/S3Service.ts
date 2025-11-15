import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { IStorageService, UploadResult } from './IStorageService';
import sharp from 'sharp';
import crypto from 'crypto';

export class S3Service implements IStorageService {
  private s3Client: S3Client;
  private bucketName: string;
  private region: string;

  constructor() {
    this.bucketName = process.env.AWS_S3_BUCKET || '';
    this.region = process.env.AWS_REGION || 'us-east-1';

    this.s3Client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
    });
  }

  async upload(
    file: Buffer,
    options: { folder?: string; filename?: string; format?: string }
  ): Promise<UploadResult> {
    const filename = options.filename || crypto.randomBytes(16).toString('hex');
    const folder = options.folder || 'wallpapers';
    const key = `${folder}/${filename}`;

    // Get image metadata
    const metadata = await sharp(file).metadata();

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: file,
      ContentType: `image/${options.format || metadata.format || 'jpeg'}`,
    });

    await this.s3Client.send(command);

    const url = `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${key}`;

    return {
      url,
      publicId: key,
      format: options.format || metadata.format,
      width: metadata.width,
      height: metadata.height,
      size: file.length,
    };
  }

  async delete(publicId: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: publicId,
    });

    await this.s3Client.send(command);
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
    // S3 doesn't support on-the-fly transformations
    // Return base URL (transformations should be done before upload)
    return `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${publicId}`;
  }

  async generateResolutions(
    file: Buffer,
    options: { folder?: string; filename?: string }
  ): Promise<UploadResult[]> {
    const resolutions = [
      { name: 'original', width: null, height: null },
      { name: '1080p', width: 1920, height: 1080 },
      { name: '1440p', width: 2560, height: 1440 },
      { name: '4K', width: 3840, height: 2160 },
      { name: 'mobile', width: 1080, height: 1920 },
      { name: 'tablet', width: 1536, height: 2048 },
    ];

    const results: UploadResult[] = [];

    for (const res of resolutions) {
      try {
        let processedBuffer = file;
        let width = res.width;
        let height = res.height;

        if (res.width && res.height) {
          // Resize image
          processedBuffer = await sharp(file)
            .resize(res.width, res.height, {
              fit: 'cover',
              position: 'center',
            })
            .jpeg({ quality: 90 })
            .toBuffer();

          const metadata = await sharp(processedBuffer).metadata();
          width = metadata.width;
          height = metadata.height;
        } else {
          // Original
          const metadata = await sharp(file).metadata();
          width = metadata.width;
          height = metadata.height;
        }

        const filename = options.filename
          ? `${options.filename}-${res.name}`
          : `${crypto.randomBytes(16).toString('hex')}-${res.name}`;

        const result = await this.upload(processedBuffer, {
          folder: options.folder,
          filename,
          format: 'jpeg',
        });

        results.push({
          ...result,
          width,
          height,
        });
      } catch (error) {
        console.error(`Failed to generate ${res.name} resolution:`, error);
      }
    }

    return results;
  }
}
