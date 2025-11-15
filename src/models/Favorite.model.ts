import pool from '../config/database';
import { Favorite } from '../types';
import { ResultSetHeader, RowDataPacket } from 'mysql2';

export class FavoriteModel {
  // Add to favorites
  static async create(userId: number, wallpaperId: number): Promise<number> {
    try {
      const [result] = await pool.query<ResultSetHeader>(
        'INSERT INTO favorites (user_id, wallpaper_id) VALUES (?, ?)',
        [userId, wallpaperId]
      );

      // Update favorite count in wallpapers table
      await pool.query(
        'UPDATE wallpapers SET favorite_count = favorite_count + 1 WHERE id = ?',
        [wallpaperId]
      );

      return result.insertId;
    } catch (error: any) {
      // Handle duplicate entry error
      if (error.code === 'ER_DUP_ENTRY') {
        throw new Error('Wallpaper already in favorites');
      }
      throw error;
    }
  }

  // Remove from favorites
  static async delete(userId: number, wallpaperId: number): Promise<void> {
    const [result] = await pool.query<ResultSetHeader>(
      'DELETE FROM favorites WHERE user_id = ? AND wallpaper_id = ?',
      [userId, wallpaperId]
    );

    if (result.affectedRows > 0) {
      // Update favorite count in wallpapers table
      await pool.query(
        'UPDATE wallpapers SET favorite_count = GREATEST(favorite_count - 1, 0) WHERE id = ?',
        [wallpaperId]
      );
    }
  }

  // Check if wallpaper is favorited by user
  static async exists(userId: number, wallpaperId: number): Promise<boolean> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM favorites WHERE user_id = ? AND wallpaper_id = ?',
      [userId, wallpaperId]
    );
    return rows[0].count > 0;
  }

  // Get user's favorites
  static async getUserFavorites(
    userId: number,
    page: number = 1,
    limit: number = 20
  ): Promise<{ favorites: any[]; total: number }> {
    const offset = (page - 1) * limit;

    const [favorites] = await pool.query<RowDataPacket[]>(
      `SELECT
        f.*,
        w.id as wallpaper_id,
        w.title,
        w.slug,
        w.thumbnail_url,
        w.download_count,
        w.view_count
       FROM favorites f
       JOIN wallpapers w ON f.wallpaper_id = w.id
       WHERE f.user_id = ? AND w.is_active = 1
       ORDER BY f.created_at DESC
       LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );

    const [countResult] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as total
       FROM favorites f
       JOIN wallpapers w ON f.wallpaper_id = w.id
       WHERE f.user_id = ? AND w.is_active = 1`,
      [userId]
    );

    return {
      favorites,
      total: countResult[0].total,
    };
  }

  // Get wallpaper's favorite count
  static async getWallpaperFavoriteCount(wallpaperId: number): Promise<number> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM favorites WHERE wallpaper_id = ?',
      [wallpaperId]
    );
    return rows[0].count;
  }

  // Get most favorited wallpapers
  static async getMostFavorited(limit: number = 10): Promise<any[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT
        w.id,
        w.title,
        w.slug,
        w.thumbnail_url,
        COUNT(f.id) as favorite_count
       FROM wallpapers w
       JOIN favorites f ON w.id = f.wallpaper_id
       WHERE w.is_active = 1
       GROUP BY w.id
       ORDER BY favorite_count DESC
       LIMIT ?`,
      [limit]
    );
    return rows;
  }

  // Clear all favorites for a user
  static async clearUserFavorites(userId: number): Promise<void> {
    // Get all favorited wallpaper IDs first
    const [favorites] = await pool.query<RowDataPacket[]>(
      'SELECT wallpaper_id FROM favorites WHERE user_id = ?',
      [userId]
    );

    // Delete favorites
    await pool.query('DELETE FROM favorites WHERE user_id = ?', [userId]);

    // Update favorite counts for affected wallpapers
    if (favorites.length > 0) {
      const wallpaperIds = favorites.map((f) => f.wallpaper_id);
      await pool.query(
        'UPDATE wallpapers SET favorite_count = GREATEST(favorite_count - 1, 0) WHERE id IN (?)',
        [wallpaperIds]
      );
    }
  }
}
