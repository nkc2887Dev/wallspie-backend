import { Router } from 'express';
import { AnalyticsController } from '../controllers/analytics.controller';
import { authAdmin } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/error.middleware';

const router = Router();

// All analytics routes require admin access

// Primary routes
router.get('/overview', authAdmin, asyncHandler(AnalyticsController.getOverview));
router.get('/downloads/trend', authAdmin, asyncHandler(AnalyticsController.getDownloadTrend));
router.get('/downloads/recent', authAdmin, asyncHandler(AnalyticsController.getRecentDownloads));
router.get('/wallpapers/top', authAdmin, asyncHandler(AnalyticsController.getTopWallpapers));
router.get('/wallpapers/least', authAdmin, asyncHandler(AnalyticsController.getLeastDownloaded));
router.get('/categories', authAdmin, asyncHandler(AnalyticsController.getCategoryStats));
router.get('/devices', authAdmin, asyncHandler(AnalyticsController.getDeviceStats));
router.get('/resolutions', authAdmin, asyncHandler(AnalyticsController.getResolutionStats));
router.get('/reports/monthly', authAdmin, asyncHandler(AnalyticsController.getMonthlyReport));
router.get('/reports/yearly', authAdmin, asyncHandler(AnalyticsController.getYearlyReport));

// Aliases for frontend compatibility
router.get('/overall', authAdmin, asyncHandler(AnalyticsController.getOverview));
router.get('/trends', authAdmin, asyncHandler(AnalyticsController.getDownloadTrend));
router.get('/popular', authAdmin, asyncHandler(AnalyticsController.getTopWallpapers));

export default router;
