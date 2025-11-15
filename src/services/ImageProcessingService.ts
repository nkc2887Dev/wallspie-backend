import sharp from 'sharp';

export interface ResolutionConfig {
  name: string;
  width: number;
  height: number;
}

export interface ProcessedImage {
  buffer: Buffer;
  width: number;
  height: number;
  format: string;
  size: number;
}

export class ImageProcessingService {
  // Standard resolution configurations
  static readonly RESOLUTIONS: ResolutionConfig[] = [
    { name: '1080p', width: 1920, height: 1080 },
    { name: '1440p', width: 2560, height: 1440 },
    { name: '4K', width: 3840, height: 2160 },
    { name: '5K', width: 5120, height: 2880 },
    { name: 'Mobile HD', width: 1080, height: 1920 },
    { name: 'Mobile 2K', width: 1440, height: 2560 },
    { name: 'Tablet', width: 1536, height: 2048 },
    { name: 'Thumbnail', width: 400, height: 300 },
    { name: 'Medium', width: 800, height: 600 },
  ];

  // Process and resize image
  static async resize(
    imageBuffer: Buffer,
    width: number,
    height: number,
    options?: {
      quality?: number;
      format?: 'jpeg' | 'png' | 'webp';
      fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
    }
  ): Promise<ProcessedImage> {
    const quality = options?.quality || 90;
    const format = options?.format || 'jpeg';
    const fit = options?.fit || 'cover';

    const sharpInstance = sharp(imageBuffer).resize(width, height, {
      fit,
      position: 'center',
    });

    // Apply format-specific options
    if (format === 'jpeg') {
      sharpInstance.jpeg({ quality });
    } else if (format === 'png') {
      sharpInstance.png({ quality });
    } else if (format === 'webp') {
      sharpInstance.webp({ quality });
    }

    const buffer = await sharpInstance.toBuffer();
    const metadata = await sharp(buffer).metadata();

    return {
      buffer,
      width: metadata.width || width,
      height: metadata.height || height,
      format: metadata.format || format,
      size: buffer.length,
    };
  }

  // Generate all standard resolutions
  static async generateAllResolutions(
    imageBuffer: Buffer,
    includeOriginal: boolean = true
  ): Promise<Map<string, ProcessedImage>> {
    const results = new Map<string, ProcessedImage>();

    // Add original
    if (includeOriginal) {
      const metadata = await sharp(imageBuffer).metadata();
      results.set('original', {
        buffer: imageBuffer,
        width: metadata.width || 0,
        height: metadata.height || 0,
        format: metadata.format || 'jpeg',
        size: imageBuffer.length,
      });
    }

    // Generate all resolutions
    for (const res of this.RESOLUTIONS) {
      try {
        const processed = await this.resize(imageBuffer, res.width, res.height);
        results.set(res.name, processed);
      } catch (error) {
        console.error(`Failed to generate ${res.name}:`, error);
      }
    }

    return results;
  }

  // Get image metadata
  static async getMetadata(imageBuffer: Buffer): Promise<sharp.Metadata> {
    return sharp(imageBuffer).metadata();
  }

  // Extract dominant color
  static async extractPrimaryColor(imageBuffer: Buffer): Promise<string> {
    try {
      // Use stats to get average color (dominant was removed in newer sharp versions)
      const stats = await sharp(imageBuffer).stats();
      const r = Math.round(stats.channels[0].mean);
      const g = Math.round(stats.channels[1].mean);
      const b = Math.round(stats.channels[2].mean);

      return `#${r.toString(16).padStart(2, '0')}${g
        .toString(16)
        .padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    } catch (error) {
      console.error('Failed to extract primary color:', error);
      return '#000000';
    }
  }

  // Generate thumbnail
  static async generateThumbnail(
    imageBuffer: Buffer,
    width: number = 400,
    height: number = 300
  ): Promise<ProcessedImage> {
    return this.resize(imageBuffer, width, height, {
      quality: 80,
      format: 'jpeg',
      fit: 'cover',
    });
  }

  // Generate medium size
  static async generateMedium(
    imageBuffer: Buffer,
    width: number = 800,
    height: number = 600
  ): Promise<ProcessedImage> {
    return this.resize(imageBuffer, width, height, {
      quality: 85,
      format: 'jpeg',
      fit: 'cover',
    });
  }

  // Optimize image (reduce size without resizing)
  static async optimize(
    imageBuffer: Buffer,
    quality: number = 85
  ): Promise<ProcessedImage> {
    const metadata = await sharp(imageBuffer).metadata();

    const buffer = await sharp(imageBuffer)
      .jpeg({ quality, progressive: true })
      .toBuffer();

    return {
      buffer,
      width: metadata.width || 0,
      height: metadata.height || 0,
      format: 'jpeg',
      size: buffer.length,
    };
  }

  // Validate image
  static async validate(
    imageBuffer: Buffer,
    options?: {
      maxWidth?: number;
      maxHeight?: number;
      maxSize?: number; // in bytes
      allowedFormats?: string[];
    }
  ): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    try {
      const metadata = await sharp(imageBuffer).metadata();

      // Check format
      if (
        options?.allowedFormats &&
        !options.allowedFormats.includes(metadata.format || '')
      ) {
        errors.push(
          `Invalid format. Allowed: ${options.allowedFormats.join(', ')}`
        );
      }

      // Check dimensions
      if (options?.maxWidth && metadata.width && metadata.width > options.maxWidth) {
        errors.push(`Width exceeds maximum of ${options.maxWidth}px`);
      }

      if (
        options?.maxHeight &&
        metadata.height &&
        metadata.height > options.maxHeight
      ) {
        errors.push(`Height exceeds maximum of ${options.maxHeight}px`);
      }

      // Check file size
      if (options?.maxSize && imageBuffer.length > options.maxSize) {
        const maxSizeMB = (options.maxSize / (1024 * 1024)).toFixed(2);
        errors.push(`File size exceeds maximum of ${maxSizeMB}MB`);
      }

      return {
        valid: errors.length === 0,
        errors,
      };
    } catch (error) {
      errors.push('Invalid image file');
      return { valid: false, errors };
    }
  }

  // Convert format
  static async convertFormat(
    imageBuffer: Buffer,
    targetFormat: 'jpeg' | 'png' | 'webp',
    quality: number = 90
  ): Promise<ProcessedImage> {
    const metadata = await sharp(imageBuffer).metadata();

    let sharpInstance = sharp(imageBuffer);

    if (targetFormat === 'jpeg') {
      sharpInstance = sharpInstance.jpeg({ quality });
    } else if (targetFormat === 'png') {
      sharpInstance = sharpInstance.png({ quality });
    } else if (targetFormat === 'webp') {
      sharpInstance = sharpInstance.webp({ quality });
    }

    const buffer = await sharpInstance.toBuffer();

    return {
      buffer,
      width: metadata.width || 0,
      height: metadata.height || 0,
      format: targetFormat,
      size: buffer.length,
    };
  }
}
