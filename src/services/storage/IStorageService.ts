// Storage service interface for abstraction
export interface UploadResult {
  url: string;
  publicId?: string;
  format?: string;
  width?: number;
  height?: number;
  size?: number;
}

export interface IStorageService {
  // Upload a file
  upload(file: Buffer, options: {
    folder?: string;
    filename?: string;
    format?: string;
  }): Promise<UploadResult>;

  // Delete a file
  delete(publicId: string): Promise<void>;

  // Get URL for a file
  getUrl(publicId: string, options?: {
    width?: number;
    height?: number;
    quality?: number;
    format?: string;
  }): string;

  // Generate multiple resolutions
  generateResolutions(file: Buffer, options: {
    folder?: string;
    filename?: string;
  }): Promise<UploadResult[]>;
}
