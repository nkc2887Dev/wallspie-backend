import crypto from 'crypto';
import { Request } from 'express';
import { DeviceType } from '../types';

export class FingerprintUtil {
  // Generate device fingerprint from request
  static generate(req: Request): string {
    const components = [
      req.headers['user-agent'] || '',
      req.headers['accept-language'] || '',
      req.headers['accept-encoding'] || '',
      req.ip || '',
    ];

    const fingerprint = components.join('|');
    return crypto.createHash('sha256').update(fingerprint).digest('hex');
  }

  // Get device type from user agent
  static getDeviceType(userAgent: string): DeviceType {
    if (!userAgent) return DeviceType.UNKNOWN;

    const ua = userAgent.toLowerCase();

    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobile))/i.test(ua)) {
      return DeviceType.TABLET;
    }

    if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile|wpdesktop/i.test(ua)) {
      return DeviceType.MOBILE;
    }

    if (/windows|macintosh|linux/i.test(ua)) {
      return DeviceType.DESKTOP;
    }

    return DeviceType.UNKNOWN;
  }

  // Get IP address from request
  static getClientIP(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      return (forwarded as string).split(',')[0].trim();
    }
    return req.ip || req.socket.remoteAddress || 'unknown';
  }
}
