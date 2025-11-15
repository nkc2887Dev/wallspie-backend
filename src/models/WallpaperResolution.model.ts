import pool from '../config/database';
import { WallpaperResolution } from '../types';
import { ResultSetHeader, RowDataPacket } from 'mysql2';

export class WallpaperResolutionModel {
  // Create new resolution
  static async create(resolutionData: Partial<WallpaperResolution>): Promise<number> {
    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO wallpaper_resolutions (
        wallpaper_id, width, height, resolution_name, file_size, url, is_original
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        resolutionData.wallpaper_id,
        resolutionData.width,
        resolutionData.height,
        resolutionData.resolution_name,
        resolutionData.file_size || null,
        resolutionData.url,
        resolutionData.is_original || 0,
      ]
    );
    return result.insertId;
  }

  // Get all resolutions for a wallpaper
  static async getByWallpaperId(wallpaperId: number): Promise<WallpaperResolution[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM wallpaper_resolutions WHERE wallpaper_id = ? ORDER BY width DESC',
      [wallpaperId]
    );
    return rows as WallpaperResolution[];
  }

  // Get resolution by ID
  static async findById(id: number): Promise<WallpaperResolution | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM wallpaper_resolutions WHERE id = ?',
      [id]
    );
    return rows.length > 0 ? (rows[0] as WallpaperResolution) : null;
  }

  // Delete all resolutions for a wallpaper
  static async deleteByWallpaperId(wallpaperId: number): Promise<void> {
    await pool.query('DELETE FROM wallpaper_resolutions WHERE wallpaper_id = ?', [
      wallpaperId,
    ]);
  }

  // Delete specific resolution
  static async delete(resolutionId: number): Promise<void> {
    await pool.query('DELETE FROM wallpaper_resolutions WHERE id = ?', [
      resolutionId,
    ]);
  }

  // Check if resolution exists
  static async exists(
    wallpaperId: number,
    width: number,
    height: number
  ): Promise<boolean> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM wallpaper_resolutions WHERE wallpaper_id = ? AND width = ? AND height = ?',
      [wallpaperId, width, height]
    );
    return rows[0].count > 0;
  }

  // Bulk create resolutions
  static async bulkCreate(resolutions: Partial<WallpaperResolution>[]): Promise<void> {
    if (resolutions.length === 0) return;

    const values = resolutions.map((r) => [
      r.wallpaper_id,
      r.width,
      r.height,
      r.resolution_name,
      r.file_size || null,
      r.url,
      r.is_original || 0,
    ]);

    await pool.query(
      `INSERT INTO wallpaper_resolutions (
        wallpaper_id, width, height, resolution_name, file_size, url, is_original
      ) VALUES ?`,
      [values]
    );
  }
}
