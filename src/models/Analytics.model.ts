import pool from '../config/database';
import { DailyAnalytics, AnalyticsOverview, CategoryStats } from '../types';
import { ResultSetHeader, RowDataPacket } from 'mysql2';

export class AnalyticsModel {
  // Update or create daily analytics
  static async updateDaily(date: Date, updates: Partial<DailyAnalytics>): Promise<void> {
    const dateStr = date.toISOString().split('T')[0];

    const [existing] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM analytics_daily WHERE date = ?',
      [dateStr]
    );

    if (existing.length > 0) {
      // Update existing record
      const fields: string[] = [];
      const values: any[] = [];

      if (updates.total_visitors !== undefined) {
        fields.push('total_visitors = ?');
        values.push(updates.total_visitors);
      }
      if (updates.unique_visitors !== undefined) {
        fields.push('unique_visitors = ?');
        values.push(updates.unique_visitors);
      }
      if (updates.total_downloads !== undefined) {
        fields.push('total_downloads = ?');
        values.push(updates.total_downloads);
      }
      if (updates.total_views !== undefined) {
        fields.push('total_views = ?');
        values.push(updates.total_views);
      }
      if (updates.new_users !== undefined) {
        fields.push('new_users = ?');
        values.push(updates.new_users);
      }

      if (fields.length > 0) {
        values.push(dateStr);
        await pool.query(
          `UPDATE analytics_daily SET ${fields.join(', ')} WHERE date = ?`,
          values
        );
      }
    } else {
      // Insert new record
      await pool.query(
        `INSERT INTO analytics_daily (date, total_visitors, unique_visitors, total_downloads, total_views, new_users)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          dateStr,
          updates.total_visitors || 0,
          updates.unique_visitors || 0,
          updates.total_downloads || 0,
          updates.total_views || 0,
          updates.new_users || 0,
        ]
      );
    }
  }

  // Increment today's download count
  static async incrementTodayDownloads(): Promise<void> {
    const today = new Date().toISOString().split('T')[0];

    await pool.query(
      `INSERT INTO analytics_daily (date, total_downloads)
       VALUES (?, 1)
       ON DUPLICATE KEY UPDATE total_downloads = total_downloads + 1`,
      [today]
    );
  }

  // // Increment today's view count
  // static async incrementTodayViews(): Promise<void> {
  //   const today = new Date().toISOString().split('T')[0];

  //   await pool.query(
  //     `INSERT INTO analytics_daily (date, total_views)
  //      VALUES (?, 1)
  //      ON DUPLICATE KEY UPDATE total_views = total_views + 1`,
  //     [today]
  //   );
  // }

  // Get overview stats
  static async getOverview(): Promise<AnalyticsOverview> {
    // Get total stats (excluding owner from user count)
    const [totals] = await pool.query<RowDataPacket[]>(`
      SELECT
        -- User stats: Single table scan with conditional aggregation
        SUM(CASE WHEN u.is_owner = 0 AND u.is_active = 1 THEN 1 ELSE 0 END) as totalUsers,
        SUM(CASE WHEN u.user_type = 1 AND u.is_owner = 0 AND u.is_active = 1 THEN 1 ELSE 0 END) as adminUsers,
        SUM(CASE WHEN u.user_type = 2 AND u.is_active = 1 THEN 1 ELSE 0 END) as registeredUsers,
        SUM(CASE WHEN u.user_type = 3 AND u.is_active = 1 THEN 1 ELSE 0 END) as guestUsers,

        -- Wallpaper/Category stats: Efficient with indexes
        (SELECT COUNT(*) FROM wallpapers WHERE is_active = 1) as totalWallpapers,
        (SELECT COUNT(*) FROM categories WHERE is_active = 1) as totalCategories,
        (SELECT COALESCE(SUM(download_count), 0) FROM wallpapers) as totalDownloads,
        (SELECT COALESCE(SUM(view_count), 0) FROM wallpapers) as totalVisitors
      FROM users u
    `);
    // Get today's stats
    // const today = new Date().toISOString().split('T')[0];
    // const [todayStats] = await pool.query<RowDataPacket[]>(
    //   'SELECT total_downloads as todayDownloads, total_views as todayVisitors FROM analytics_daily WHERE date = ?',
    //   [today]
    // );

    return {
      totalUsers: totals[0].totalUsers || 0,
      adminUsers: totals[0].adminUsers || 0,
      registeredUsers: totals[0].registeredUsers || 0,
      guestUsers: totals[0].guestUsers || 0,
      totalWallpapers: totals[0].totalWallpapers || 0,
      totalCategories: totals[0].totalCategories || 0,
      totalDownloads: totals[0].totalDownloads || 0,
      totalVisitors: totals[0].totalVisitors || 0,
      // todayDownloads: todayStats[0]?.todayDownloads || 0,
      // todayVisitors: todayStats[0]?.todayVisitors || 0,
    };
  }

  // Get daily stats for a date range
  static async getByDateRange(startDate: Date, endDate: Date): Promise<DailyAnalytics[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM analytics_daily
       WHERE date BETWEEN ? AND ?
       ORDER BY date ASC`,
      [startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]]
    );
    return rows as DailyAnalytics[];
  }

  // Get category-wise stats
  static async getCategoryStats(): Promise<CategoryStats[]> {
    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT
        c.id as category_id,
        c.name as category_name,
        c.slug as category_slug,
        COUNT(DISTINCT wc.wallpaper_id) as wallpaper_count,
        SUM(w.download_count) as total_downloads,
        SUM(w.view_count) as total_views
      FROM categories c
      LEFT JOIN wallpaper_categories wc ON c.id = wc.category_id
      LEFT JOIN wallpapers w ON wc.wallpaper_id = w.id AND w.is_active = 1
      WHERE c.is_active = 1
      GROUP BY c.id
      ORDER BY total_downloads DESC
    `);
    return rows as CategoryStats[];
  }

  // Get download trend (for charts)
  static async getDownloadTrend(period: 'daily' | 'weekly' | 'monthly' = 'daily', days: number = 30): Promise<any[]> {
    let groupByExpression = 'DATE(date)';
    let dateFormat = '%Y-%m-%d';

    if (period === 'weekly') {
      groupByExpression = 'YEARWEEK(date)';
      dateFormat = '%Y-W%u';
    } else if (period === 'monthly') {
      groupByExpression = 'DATE_FORMAT(date, "%Y-%m")';
      dateFormat = '%Y-%m';
    }

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT
        DATE_FORMAT(date, ?) as date,
        SUM(total_downloads) as downloads,
        SUM(total_views) as views,
        SUM(unique_visitors) as visitors
       FROM analytics_daily
       WHERE date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       GROUP BY DATE_FORMAT(date, ?)
       ORDER BY DATE_FORMAT(date, ?) ASC`,
      [dateFormat, days, dateFormat, dateFormat]
    );
    return rows;
  }

  // Get top wallpapers by downloads
  static async getTopWallpapers(limit: number = 10, days?: number): Promise<any[]> {
    let query = `
      SELECT
        w.id,
        w.title,
        w.slug,
        w.thumbnail_url,
        w.download_count,
        w.view_count,
        w.favorite_count
      FROM wallpapers w
      WHERE w.is_active = 1
    `;

    const params: any[] = [];

    if (days) {
      query += `
        AND w.id IN (
          SELECT DISTINCT wallpaper_id
          FROM downloads
          WHERE downloaded_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
        )
      `;
      params.push(days);
    }

    query += ' ORDER BY w.download_count DESC LIMIT ?';
    params.push(limit);

    const [rows] = await pool.query<RowDataPacket[]>(query, params);
    return rows;
  }

  // Get least downloaded wallpapers
  static async getLeastDownloadedWallpapers(limit: number = 10): Promise<any[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT
        w.id,
        w.title,
        w.slug,
        w.thumbnail_url,
        w.download_count,
        w.view_count
       FROM wallpapers w
       WHERE w.is_active = 1
       ORDER BY w.download_count ASC
       LIMIT ?`,
      [limit]
    );
    return rows;
  }

  // Get monthly report
  static async getMonthlyReport(year: number, month: number): Promise<any> {
    const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];

    const [stats] = await pool.query<RowDataPacket[]>(
      `SELECT
        SUM(total_visitors) as total_visitors,
        SUM(unique_visitors) as unique_visitors,
        SUM(total_downloads) as total_downloads,
        SUM(total_views) as total_views,
        SUM(new_users) as new_users
       FROM analytics_daily
       WHERE date BETWEEN ? AND ?`,
      [startDate, endDate]
    );

    return stats[0];
  }

  // Get yearly report
  static async getYearlyReport(year: number): Promise<any> {
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;

    const [stats] = await pool.query<RowDataPacket[]>(
      `SELECT
        SUM(total_visitors) as total_visitors,
        SUM(unique_visitors) as unique_visitors,
        SUM(total_downloads) as total_downloads,
        SUM(total_views) as total_views,
        SUM(new_users) as new_users
       FROM analytics_daily
       WHERE date BETWEEN ? AND ?`,
      [startDate, endDate]
    );

    return stats[0];
  }
}
