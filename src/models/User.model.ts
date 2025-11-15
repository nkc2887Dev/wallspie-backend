import pool from '../config/database';
import { User, UserType, UserRegistration } from '../types';
import { ResultSetHeader, RowDataPacket } from 'mysql2';

export class UserModel {
  // Create new user
  static async create(userData: Partial<User>): Promise<number> {
    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO users (email, password, name, user_type, is_owner, guest_identifier, ip_address, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userData.email || null,
        userData.password || null,
        userData.name,
        userData.user_type || UserType.REGISTERED,
        userData.is_owner || 0,
        userData.guest_identifier || null,
        userData.ip_address || null,
        userData.is_active !== undefined ? userData.is_active : 1,
      ]
    );
    return result.insertId;
  }

  // Find user by ID
  static async findById(id: number): Promise<User | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM users WHERE id = ?',
      [id]
    );
    return rows.length > 0 ? (rows[0] as User) : null;
  }

  // Find user by email
  static async findByEmail(email: string): Promise<User | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM users WHERE email = ? AND is_active = 1',
      [email]
    );
    return rows.length > 0 ? (rows[0] as User) : null;
  }

  // Find user by guest identifier
  static async findByGuestIdentifier(identifier: string): Promise<User | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM users WHERE guest_identifier = ?',
      [identifier]
    );
    return rows.length > 0 ? (rows[0] as User) : null;
  }

  // Update last login
  static async updateLastLogin(userId: number): Promise<void> {
    await pool.query(
      'UPDATE users SET last_login = NOW() WHERE id = ?',
      [userId]
    );
  }

  // Get all users (admin only) - includes inactive users
  static async getAll(
    page: number = 1,
    limit: number = 20,
    userType?: UserType
  ): Promise<{ users: User[]; total: number }> {
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM users';
    const params: any[] = [];

    if (userType) {
      query += ' WHERE user_type = ?';
      params.push(userType);
    }

    query += ' ORDER BY is_active DESC, created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [users] = await pool.query<RowDataPacket[]>(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM users';
    if (userType) {
      countQuery += ' WHERE user_type = ?';
    }
    const [countResult] = await pool.query<RowDataPacket[]>(
      countQuery,
      userType ? [userType] : []
    );

    return {
      users: users as User[],
      total: countResult[0].total,
    };
  }

  // Update user
  static async update(userId: number, updates: Partial<User>): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.email) {
      fields.push('email = ?');
      values.push(updates.email);
    }
    if (updates.name) {
      fields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.password) {
      fields.push('password = ?');
      values.push(updates.password);
    }
    if (updates.is_active !== undefined) {
      fields.push('is_active = ?');
      values.push(updates.is_active);
    }
    if (updates.user_type !== undefined) {
      fields.push('user_type = ?');
      values.push(updates.user_type);
    }

    if (fields.length === 0) return;

    values.push(userId);
    await pool.query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
  }

  // Update password
  static async updatePassword(userId: number, hashedPassword: string): Promise<void> {
    await pool.query('UPDATE users SET password = ? WHERE id = ?', [
      hashedPassword,
      userId,
    ]);
  }

  // Delete user (soft delete by deactivating)
  static async delete(userId: number): Promise<void> {
    await pool.query('UPDATE users SET is_active = 0 WHERE id = ?', [userId]);
  }

  // Check if email exists
  static async emailExists(email: string): Promise<boolean> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM users WHERE email = ?',
      [email]
    );
    return rows[0].count > 0;
  }

  // Get user stats
  static async getStats(): Promise<{
    total: number;
    registered: number;
    guests: number;
    admins: number;
  }> {
    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN user_type = ${UserType.REGISTERED} THEN 1 ELSE 0 END) as registered,
        SUM(CASE WHEN user_type = ${UserType.GUEST} THEN 1 ELSE 0 END) as guests,
        SUM(CASE WHEN user_type = ${UserType.ADMIN} THEN 1 ELSE 0 END) as admins
      FROM users
      WHERE is_active = 1
    `);
    return rows[0] as any;
  }
}
