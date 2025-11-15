import { Request, Response } from 'express';
import { DownloadModel } from '../models/Download.model';
import { WallpaperModel } from '../models/Wallpaper.model';
import { WallpaperResolutionModel } from '../models/WallpaperResolution.model';
import { FingerprintUtil } from '../utils/fingerprint.util';
import axios from 'axios';

export class DownloadController {
  // Download wallpaper
  static async downloadWallpaper(req: Request, res: Response): Promise<void> {
    try {
      const { wallpaperId, resolutionId } = req.query;

      if (!wallpaperId || !resolutionId) {
        res.status(400).json({
          success: false,
          error: 'wallpaperId and resolutionId are required',
        });
        return;
      }

      // Verify wallpaper exists
      const wallpaper = await WallpaperModel.findById(parseInt(wallpaperId as string));
      if (!wallpaper) {
        res.status(404).json({
          success: false,
          error: 'Wallpaper not found',
        });
        return;
      }

      // Verify resolution exists
      const resolution = await WallpaperResolutionModel.findById(parseInt(resolutionId as string));
      if (!resolution) {
        res.status(404).json({
          success: false,
          error: 'Resolution not found',
        });
        return;
      }

      // Track download
      await DownloadModel.create({
        wallpaper_id: parseInt(wallpaperId as string),
        user_id: req.user?.userId,
        resolution_id: parseInt(resolutionId as string),
        ip_address: FingerprintUtil.getClientIP(req),
        user_agent: req.headers['user-agent'],
        device_type: FingerprintUtil.getDeviceType(req.headers['user-agent'] || ''),
        downloaded_at: new Date(),
      });

      // Increment wallpaper download count
      await WallpaperModel.incrementDownloadCount(parseInt(wallpaperId as string));

      // Fetch the image from the URL
      const response = await axios.get(resolution.url, {
        responseType: 'arraybuffer',
      });

      // Generate filename
      const extension = resolution.url.split('.').pop()?.split('?')[0] || 'jpg';
      const filename = `${wallpaper.slug}-${resolution.resolution_name}.${extension}`;

      // Set headers to force download
      res.setHeader('Content-Type', response.headers['content-type'] || 'image/jpeg');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', response.data.length);

      // Send the file
      res.send(response.data);
    } catch (error: any) {
      console.error('Download wallpaper error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to download wallpaper',
      });
    }
  }

  // Track download
  static async trackDownload(req: Request, res: Response): Promise<void> {
    try {
      const { wallpaperId, resolutionId } = req.body;

      if (!wallpaperId || !resolutionId) {
        res.status(400).json({
          success: false,
          error: 'wallpaperId and resolutionId are required',
        });
        return;
      }

      // Verify wallpaper exists
      const wallpaper = await WallpaperModel.findById(wallpaperId);
      if (!wallpaper) {
        res.status(404).json({
          success: false,
          error: 'Wallpaper not found',
        });
        return;
      }

      // Verify resolution exists
      const resolution = await WallpaperResolutionModel.findById(resolutionId);
      if (!resolution) {
        res.status(404).json({
          success: false,
          error: 'Resolution not found',
        });
        return;
      }

      // Track download
      const downloadId = await DownloadModel.create({
        wallpaper_id: wallpaperId,
        user_id: req.user?.userId,
        resolution_id: resolutionId,
        ip_address: FingerprintUtil.getClientIP(req),
        user_agent: req.headers['user-agent'],
        device_type: FingerprintUtil.getDeviceType(req.headers['user-agent'] || ''),
        downloaded_at: new Date(),
      });

      // Increment wallpaper download count
      await WallpaperModel.incrementDownloadCount(wallpaperId);

      res.json({
        success: true,
        message: 'Download tracked successfully',
        data: {
          downloadId,
          downloadUrl: resolution.url,
        },
      });
    } catch (error: any) {
      console.error('Track download error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to track download',
      });
    }
  }

  // Get user download history
  static async getHistory(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const { downloads, total } = await DownloadModel.getByUserId(
        req.user.userId,
        page,
        limit
      );

      res.json({
        success: true,
        data: downloads,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error: any) {
      console.error('Get download history error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch download history',
      });
    }
  }
}
