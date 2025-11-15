import pool from '../config/database';
import { Download, DeviceType } from '../types';
import { ResultSetHeader, RowDataPacket } from 'mysql2';

export class DownloadModel {
  // Track a download
  static async create(downloadData: Partial<Download>): Promise<number> {
    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO downloads (
        wallpaper_id, user_id, resolution_id, ip_address, user_agent, device_type
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        downloadData.wallpaper_id,
        downloadData.user_id || null,
        downloadData.resolution_id,
        downloadData.ip_address || null,
        downloadData.user_agent || null,
        downloadData.device_type || DeviceType.UNKNOWN,
      ]
    );
    return result.insertId;
  }

  // Get downloads by wallpaper
  static async getByWallpaperId(
    wallpaperId: number,
    page: number = 1,
    limit: number = 50
  ): Promise<{ downloads: Download[]; total: number }> {
    const offset = (page - 1) * limit;

    const [downloads] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM downloads
       WHERE wallpaper_id = ?
       ORDER BY downloaded_at DESC
       LIMIT ? OFFSET ?`,
      [wallpaperId, limit, offset]
    );

    const [countResult] = await pool.query<RowDataPacket[]>(
      'SELECT COUNT(*) as total FROM downloads WHERE wallpaper_id = ?',
      [wallpaperId]
    );

    return {
      downloads: downloads as Download[],
      total: countResult[0].total,
    };
  }

  // Get downloads by user
  static async getByUserId(
    userId: number,
    page: number = 1,
    limit: number = 20
  ): Promise<{ downloads: Download[]; total: number }> {
    const offset = (page - 1) * limit;

    const [downloads] = await pool.query<RowDataPacket[]>(
      `SELECT d.*, w.title, w.thumbnail_url, w.slug
       FROM downloads d
       JOIN wallpapers w ON d.wallpaper_id = w.id
       WHERE d.user_id = ?
       ORDER BY d.downloaded_at DESC
       LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );

    const [countResult] = await pool.query<RowDataPacket[]>(
      'SELECT COUNT(*) as total FROM downloads WHERE user_id = ?',
      [userId]
    );

    return {
      downloads: downloads as any,
      total: countResult[0].total,
    };
  }

  // Get download stats for a date range
  static async getStatsByDateRange(
    startDate: Date,
    endDate: Date
  ): Promise<any[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT
        DATE(downloaded_at) as date,
        COUNT(*) as downloads,
        COUNT(DISTINCT wallpaper_id) as unique_wallpapers,
        COUNT(DISTINCT user_id) as unique_users
       FROM downloads
       WHERE downloaded_at BETWEEN ? AND ?
       GROUP BY DATE(downloaded_at)
       ORDER BY date ASC`,
      [startDate, endDate]
    );
    return rows;
  }

  // Get download stats by device type
  static async getStatsByDevice(): Promise<any[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT
        device_type,
        COUNT(*) as count,
        ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM downloads), 2) as percentage
       FROM downloads
       GROUP BY device_type
       ORDER BY count DESC`
    );
    return rows;
  }

  // Get most downloaded wallpapers
  static async getMostDownloaded(
    limit: number = 10,
    days?: number
  ): Promise<any[]> {
    let query = `
      SELECT
        w.id,
        w.title,
        w.slug,
        w.thumbnail_url,
        COUNT(d.id) as download_count
      FROM wallpapers w
      JOIN downloads d ON w.id = d.wallpaper_id
    `;

    const params: any[] = [];

    if (days) {
      query += ' WHERE d.downloaded_at >= DATE_SUB(NOW(), INTERVAL ? DAY)';
      params.push(days);
    }

    query += `
      GROUP BY w.id
      ORDER BY download_count DESC
      LIMIT ?
    `;
    params.push(limit);

    const [rows] = await pool.query<RowDataPacket[]>(query, params);
    return rows;
  }

  // Get download trend (daily downloads for chart)
  static async getDownloadTrend(days: number = 30): Promise<any[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT
        DATE(downloaded_at) as date,
        COUNT(*) as downloads
       FROM downloads
       WHERE downloaded_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
       GROUP BY DATE(downloaded_at)
       ORDER BY date ASC`,
      [days]
    );
    return rows;
  }

  // Get total downloads count
  static async getTotalCount(): Promise<number> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT COUNT(*) as total FROM downloads'
    );
    return rows[0].total;
  }

  // Get downloads by resolution
  static async getStatsByResolution(wallpaperId?: number): Promise<any[]> {
    let query = `
      SELECT
        wr.resolution_name,
        wr.width,
        wr.height,
        COUNT(d.id) as download_count
      FROM downloads d
      JOIN wallpaper_resolutions wr ON d.resolution_id = wr.id
    `;

    const params: any[] = [];

    if (wallpaperId) {
      query += ' WHERE d.wallpaper_id = ?';
      params.push(wallpaperId);
    }

    query += `
      GROUP BY wr.resolution_name, wr.width, wr.height
      ORDER BY download_count DESC
    `;

    const [rows] = await pool.query<RowDataPacket[]>(query, params);
    return rows;
  }

  // Get recent downloads (admin)
  static async getRecent(limit: number = 10): Promise<any[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT
        d.id,
        d.downloaded_at,
        d.device_type,
        d.ip_address,
        w.id as wallpaper_id,
        w.title as wallpaper_title,
        w.slug as wallpaper_slug,
        w.thumbnail_url,
        wr.resolution_name,
        wr.width,
        wr.height,
        u.id as user_id,
        u.name as user_name,
        u.email as user_email
       FROM downloads d
       JOIN wallpapers w ON d.wallpaper_id = w.id
       JOIN wallpaper_resolutions wr ON d.resolution_id = wr.id
       LEFT JOIN users u ON d.user_id = u.id
       ORDER BY d.downloaded_at DESC
       LIMIT ?`,
      [limit]
    );
    return rows;
  }
}
