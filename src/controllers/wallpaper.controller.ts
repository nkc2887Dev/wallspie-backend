import { Request, Response } from 'express';
import { WallpaperModel } from '../models/Wallpaper.model';
import { WallpaperResolutionModel } from '../models/WallpaperResolution.model';
import { SlugUtil } from '../utils/slug.util';
import { StorageFactory } from '../services/storage/StorageFactory';
import { ImageProcessingService } from '../services/ImageProcessingService';
import { WallpaperSource } from '../types';
import multer from 'multer';

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB default
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = (process.env.ALLOWED_FILE_TYPES || 'image/jpeg,image/png,image/webp').split(',');
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  },
});

export class WallpaperController {
  static upload = upload.single('image');

  // Get all wallpapers (public)
  static async getAll(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const categoryId = req.query.category ? parseInt(req.query.category as string) : undefined;
      const isFeatured = req.query.featured === 'true' ? true : undefined;
      const search = req.query.search as string;

      const { wallpapers, total } = await WallpaperModel.getAll(page, limit, {
        categoryId,
        isFeatured,
        search,
      });

      res.json({
        success: true,
        data: wallpapers,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error: any) {
      console.error('Get wallpapers error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch wallpapers',
      });
    }
  }

  // Get wallpaper by slug (public)
  static async getBySlug(req: Request, res: Response): Promise<void> {
    try {
      const { slug } = req.params;

      const wallpaper = await WallpaperModel.findBySlug(slug);

      if (!wallpaper) {
        res.status(404).json({
          success: false,
          error: 'Wallpaper not found',
        });
        return;
      }

      // Increment view count
      await WallpaperModel.incrementViewCount(wallpaper.id);

      res.json({
        success: true,
        data: wallpaper,
      });
    } catch (error: any) {
      console.error('Get wallpaper error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch wallpaper',
      });
    }
  }

  // Get featured wallpapers (public)
  static async getFeatured(req: Request, res: Response): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const wallpapers = await WallpaperModel.getFeatured(limit);

      res.json({
        success: true,
        data: wallpapers,
      });
    } catch (error: any) {
      console.error('Get featured wallpapers error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch featured wallpapers',
      });
    }
  }

  // Get trending wallpapers (public)
  static async getTrending(req: Request, res: Response): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const wallpapers = await WallpaperModel.getTrending(limit);

      res.json({
        success: true,
        data: wallpapers,
      });
    } catch (error: any) {
      console.error('Get trending wallpapers error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch trending wallpapers',
      });
    }
  }

  // Search wallpapers (public)
  static async search(req: Request, res: Response): Promise<void> {
    try {
      const query = req.query.q as string;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      if (!query || query.trim().length === 0) {
        res.status(400).json({
          success: false,
          error: 'Search query is required',
        });
        return;
      }

      const { wallpapers, total } = await WallpaperModel.search(query, page, limit);

      res.json({
        success: true,
        data: wallpapers,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error: any) {
      console.error('Search wallpapers error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to search wallpapers',
      });
    }
  }

  // Upload wallpaper (admin only)
  static async create(req: Request, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          error: 'Image file is required',
        });
        return;
      }

      const { title, description, tags, category_ids, is_featured } = req.body;

      // Parse category_ids
      let categoryIds: number[] = [];
      try {
        categoryIds = typeof category_ids === 'string' ? JSON.parse(category_ids) : category_ids;
      } catch (e) {
        res.status(400).json({
          success: false,
          error: 'Invalid category_ids format',
        });
        return;
      }

      // Validate image
      const validation = await ImageProcessingService.validate(req.file.buffer, {
        maxWidth: 10000,
        maxHeight: 10000,
        maxSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'),
        allowedFormats: ['jpeg', 'jpg', 'png', 'webp'],
      });

      if (!validation.valid) {
        res.status(400).json({
          success: false,
          errors: validation.errors,
        });
        return;
      }

      // Extract metadata
      const metadata = await ImageProcessingService.getMetadata(req.file.buffer);
      const primaryColor = await ImageProcessingService.extractPrimaryColor(req.file.buffer);

      // Generate slug
      const slug = SlugUtil.generateWithTimestamp(title);

      // Get storage service
      const storageService = await StorageFactory.getActiveService();

      // Generate thumbnail and medium
      const thumbnail = await ImageProcessingService.generateThumbnail(req.file.buffer);
      const medium = await ImageProcessingService.generateMedium(req.file.buffer);

      // Upload images
      const [originalUpload, thumbnailUpload, mediumUpload] = await Promise.all([
        storageService.upload(req.file.buffer, {
          folder: 'wallpapers/original',
          filename: slug,
        }),
        storageService.upload(thumbnail.buffer, {
          folder: 'wallpapers/thumbnails',
          filename: `${slug}-thumb`,
        }),
        storageService.upload(medium.buffer, {
          folder: 'wallpapers/medium',
          filename: `${slug}-medium`,
        }),
      ]);

      // Get storage provider ID (default to Cloudinary)
      const storageProviderId = 1; // You can make this dynamic

      // Create wallpaper
      const wallpaperId = await WallpaperModel.create({
        title,
        slug,
        description,
        original_url: originalUpload.url,
        thumbnail_url: thumbnailUpload.url,
        medium_url: mediumUpload.url,
        primary_color: primaryColor,
        tags: tags ? (typeof tags === 'string' ? JSON.parse(tags) : tags) : [],
        source: WallpaperSource.ADMIN,
        uploaded_by: req.user!.userId,
        storage_provider_id: storageProviderId,
        is_featured: is_featured === 'true' || is_featured === true ? 1 : 0,
      });

      // Add categories
      if (categoryIds.length > 0) {
        await WallpaperModel.addCategories(wallpaperId, categoryIds);
      }

      // Generate resolutions
      const resolutions = await ImageProcessingService.generateAllResolutions(req.file.buffer, false);

      const resolutionData = [];
      for (const [name, processed] of resolutions) {
        const resUpload = await storageService.upload(processed.buffer, {
          folder: 'wallpapers/resolutions',
          filename: `${slug}-${name.toLowerCase().replace(/\s+/g, '-')}`,
        });

        resolutionData.push({
          wallpaper_id: wallpaperId,
          width: processed.width,
          height: processed.height,
          resolution_name: name,
          file_size: processed.size,
          url: resUpload.url,
          is_original: (name === 'original' ? 1 : 0) as 0 | 1,
        });
      }

      // Add original resolution
      resolutionData.push({
        wallpaper_id: wallpaperId,
        width: metadata.width || 0,
        height: metadata.height || 0,
        resolution_name: 'Original',
        file_size: req.file.size,
        url: originalUpload.url,
        is_original: 1 as 0 | 1,
      });

      await WallpaperResolutionModel.bulkCreate(resolutionData);

      // Get created wallpaper with all data
      const wallpaper = await WallpaperModel.findById(wallpaperId);

      res.status(201).json({
        success: true,
        message: 'Wallpaper uploaded successfully',
        data: wallpaper,
      });
    } catch (error: any) {
      console.error('Upload wallpaper error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to upload wallpaper',
      });
    }
  }

  // Update wallpaper (admin only)
  static async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { title, description, tags, category_ids, is_featured } = req.body;

      const wallpaper = await WallpaperModel.findById(parseInt(id));
      if (!wallpaper) {
        res.status(404).json({
          success: false,
          error: 'Wallpaper not found',
        });
        return;
      }

      // Update wallpaper
      await WallpaperModel.update(parseInt(id), {
        title,
        description,
        tags: tags ? (typeof tags === 'string' ? JSON.parse(tags) : tags) : undefined,
        is_featured: is_featured !== undefined ? (is_featured === 'true' || is_featured === true ? 1 : 0) : undefined,
      });

      // Update categories if provided
      if (category_ids) {
        const categoryIds = typeof category_ids === 'string' ? JSON.parse(category_ids) : category_ids;
        await WallpaperModel.removeCategories(parseInt(id));
        await WallpaperModel.addCategories(parseInt(id), categoryIds);
      }

      const updatedWallpaper = await WallpaperModel.findById(parseInt(id));

      res.json({
        success: true,
        message: 'Wallpaper updated successfully',
        data: updatedWallpaper,
      });
    } catch (error: any) {
      console.error('Update wallpaper error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update wallpaper',
      });
    }
  }

  // Delete wallpaper (admin only)
  static async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const wallpaper = await WallpaperModel.findById(parseInt(id));
      if (!wallpaper) {
        res.status(404).json({
          success: false,
          error: 'Wallpaper not found',
        });
        return;
      }

      await WallpaperModel.delete(parseInt(id));

      res.json({
        success: true,
        message: 'Wallpaper deleted successfully',
      });
    } catch (error: any) {
      console.error('Delete wallpaper error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete wallpaper',
      });
    }
  }

  // Get wallpaper resolutions (public)
  static async getResolutions(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const wallpaper = await WallpaperModel.findById(parseInt(id));
      if (!wallpaper) {
        res.status(404).json({
          success: false,
          error: 'Wallpaper not found',
        });
        return;
      }

      const resolutions = await WallpaperResolutionModel.getByWallpaperId(parseInt(id));

      res.json({
        success: true,
        data: resolutions,
      });
    } catch (error: any) {
      console.error('Get wallpaper resolutions error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch resolutions',
      });
    }
  }
}
