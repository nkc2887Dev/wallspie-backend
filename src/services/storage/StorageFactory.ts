import { IStorageService } from './IStorageService';
import { CloudinaryService } from './CloudinaryService';
import { S3Service } from './S3Service';
import pool from '../../config/database';
import { RowDataPacket } from 'mysql2';

export class StorageFactory {
  private static instance: IStorageService | null = null;

  // Get active storage service from database
  static async getActiveService(): Promise<IStorageService> {
    if (this.instance) {
      return this.instance;
    }

    try {
      // Get active storage provider from database
      const [rows] = await pool.query<RowDataPacket[]>(
        'SELECT provider_name FROM storage_providers WHERE is_active = 1 ORDER BY priority DESC LIMIT 1'
      );

      const providerName = rows.length > 0 ? rows[0].provider_name : 'cloudinary';

      this.instance = this.createService(providerName);
      return this.instance;
    } catch (error) {
      console.error('Failed to get storage provider from database:', error);
      // Fallback to cloudinary
      this.instance = new CloudinaryService();
      return this.instance;
    }
  }

  // Create service by name
  static createService(provider: string): IStorageService {
    switch (provider.toLowerCase()) {
      case 'cloudinary':
        return new CloudinaryService();
      case 's3':
        return new S3Service();
      default:
        console.warn(`Unknown storage provider: ${provider}, falling back to Cloudinary`);
        return new CloudinaryService();
    }
  }

  // Reset instance (useful for switching providers)
  static reset(): void {
    this.instance = null;
  }

  // Get service by ID from database
  static async getServiceById(providerId: number): Promise<IStorageService> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT provider_name FROM storage_providers WHERE id = ?',
      [providerId]
    );

    if (rows.length === 0) {
      throw new Error('Storage provider not found');
    }

    return this.createService(rows[0].provider_name);
  }
}
