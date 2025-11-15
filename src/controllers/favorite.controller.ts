import { Request, Response } from 'express';
import { FavoriteModel } from '../models/Favorite.model';

export class FavoriteController {
  // Add to favorites
  static async add(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      const { wallpaperId } = req.body;

      if (!wallpaperId) {
        res.status(400).json({
          success: false,
          error: 'wallpaperId is required',
        });
        return;
      }

      // Check if already favorited
      const exists = await FavoriteModel.exists(req.user.userId, wallpaperId);
      if (exists) {
        res.status(400).json({
          success: false,
          error: 'Wallpaper already in favorites',
        });
        return;
      }

      const favoriteId = await FavoriteModel.create(req.user.userId, wallpaperId);

      res.status(201).json({
        success: true,
        message: 'Added to favorites',
        data: { favoriteId },
      });
    } catch (error: any) {
      console.error('Add favorite error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to add to favorites',
      });
    }
  }

  // Remove from favorites
  static async remove(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      const { wallpaperId } = req.params;

      await FavoriteModel.delete(req.user.userId, parseInt(wallpaperId));

      res.json({
        success: true,
        message: 'Removed from favorites',
      });
    } catch (error: any) {
      console.error('Remove favorite error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to remove from favorites',
      });
    }
  }

  // Get user favorites
  static async getAll(req: Request, res: Response): Promise<void> {
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

      const { favorites, total } = await FavoriteModel.getUserFavorites(
        req.user.userId,
        page,
        limit
      );

      res.json({
        success: true,
        data: favorites,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error: any) {
      console.error('Get favorites error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch favorites',
      });
    }
  }

  // Check if wallpaper is favorited
  static async check(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.json({
          success: true,
          data: { isFavorited: false },
        });
        return;
      }

      const { wallpaperId } = req.params;

      const isFavorited = await FavoriteModel.exists(
        req.user.userId,
        parseInt(wallpaperId)
      );

      res.json({
        success: true,
        data: { isFavorited },
      });
    } catch (error: any) {
      console.error('Check favorite error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check favorite status',
      });
    }
  }
}
