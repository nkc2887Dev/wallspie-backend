import { Request, Response } from 'express';
import { AnalyticsModel } from '../models/Analytics.model';
import { DownloadModel } from '../models/Download.model';
import { WallpaperModel } from '../models/Wallpaper.model';
import { CategoryModel } from '../models/Category.model';

export class AnalyticsController {
  // Get dashboard overview (admin only)
  static async getOverview(req: Request, res: Response): Promise<void> {
    try {
      const overview = await AnalyticsModel.getOverview();

      res.json({
        success: true,
        data: overview,
      });
    } catch (error: any) {
      console.error('Get overview error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch overview',
      });
    }
  }

  // Get download trend (admin only)
  static async getDownloadTrend(req: Request, res: Response): Promise<void> {
    try {
      const period = (req.query.period as 'daily' | 'weekly' | 'monthly') || 'daily';
      const days = parseInt(req.query.days as string) || 30;

      const trend = await AnalyticsModel.getDownloadTrend(period, days);

      res.json({
        success: true,
        data: trend,
      });
    } catch (error: any) {
      console.error('Get download trend error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch download trend',
      });
    }
  }

  // Get top wallpapers (admin only)
  static async getTopWallpapers(req: Request, res: Response): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const days = req.query.days ? parseInt(req.query.days as string) : undefined;

      const topWallpapers = await AnalyticsModel.getTopWallpapers(limit, days);

      res.json({
        success: true,
        data: topWallpapers,
      });
    } catch (error: any) {
      console.error('Get top wallpapers error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch top wallpapers',
      });
    }
  }

  // Get least downloaded wallpapers (admin only)
  static async getLeastDownloaded(req: Request, res: Response): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 10;

      const leastDownloaded = await AnalyticsModel.getLeastDownloadedWallpapers(limit);

      res.json({
        success: true,
        data: leastDownloaded,
      });
    } catch (error: any) {
      console.error('Get least downloaded error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch least downloaded wallpapers',
      });
    }
  }

  // Get category stats (admin only)
  static async getCategoryStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await AnalyticsModel.getCategoryStats();

      res.json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      console.error('Get category stats error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch category stats',
      });
    }
  }

  // Get device stats (admin only)
  static async getDeviceStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await DownloadModel.getStatsByDevice();

      res.json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      console.error('Get device stats error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch device stats',
      });
    }
  }

  // Get resolution stats (admin only)
  static async getResolutionStats(req: Request, res: Response): Promise<void> {
    try {
      const wallpaperId = req.query.wallpaper ? parseInt(req.query.wallpaper as string) : undefined;

      const stats = await DownloadModel.getStatsByResolution(wallpaperId);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      console.error('Get resolution stats error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch resolution stats',
      });
    }
  }

  // Get monthly report (admin only)
  static async getMonthlyReport(req: Request, res: Response): Promise<void> {
    try {
      const year = parseInt(req.query.year as string) || new Date().getFullYear();
      const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;

      const report = await AnalyticsModel.getMonthlyReport(year, month);

      res.json({
        success: true,
        data: report,
      });
    } catch (error: any) {
      console.error('Get monthly report error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch monthly report',
      });
    }
  }

  // Get yearly report (admin only)
  static async getYearlyReport(req: Request, res: Response): Promise<void> {
    try {
      const year = parseInt(req.query.year as string) || new Date().getFullYear();

      const report = await AnalyticsModel.getYearlyReport(year);

      res.json({
        success: true,
        data: report,
      });
    } catch (error: any) {
      console.error('Get yearly report error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch yearly report',
      });
    }
  }

  // Get recent downloads (admin only)
  static async getRecentDownloads(req: Request, res: Response): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 10;

      const downloads = await DownloadModel.getRecent(limit);

      res.json({
        success: true,
        data: downloads,
      });
    } catch (error: any) {
      console.error('Get recent downloads error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch recent downloads',
      });
    }
  }
}
