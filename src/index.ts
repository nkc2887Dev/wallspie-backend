import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { testConnection } from './config/database';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';

// Import routes
import authRoutes from './routes/auth.routes';
import categoryRoutes from './routes/category.routes';
import wallpaperRoutes from './routes/wallpaper.routes';
import downloadRoutes from './routes/download.routes';
import favoriteRoutes from './routes/favorite.routes';
import analyticsRoutes from './routes/analytics.routes';
import userRoutes from './routes/user.routes';

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging in development
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.info(`${req.method} ${req.path}`);
    next();
  });
}

// Root route
app.get('/', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Welcome to WallsPie API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/v1/auth',
      categories: '/api/v1/categories',
      wallpapers: '/api/v1/wallpapers',
      downloads: '/api/v1/downloads',
      favorites: '/api/v1/favorites',
      analytics: '/api/v1/admin/analytics',
      users: '/api/v1/admin/users',
      health: '/health',
    },
  });
});

// Health check route
app.get('/health', async (req: Request, res: Response) => {
  try {
    await testConnection();
    res.json({
      success: true,
      status: 'OK',
      timestamp: new Date().toISOString(),
      database: 'Connected',
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      status: 'Service Unavailable',
      timestamp: new Date().toISOString(),
      database: 'Disconnected',
    });
  }
});

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/categories', categoryRoutes);
app.use('/api/v1/wallpapers', wallpaperRoutes);
app.use('/api/v1/downloads', downloadRoutes);
app.use('/api/v1/favorites', favoriteRoutes);
app.use('/api/v1/admin/analytics', analyticsRoutes);
app.use('/api/v1/admin/users', userRoutes);

// 404 handler
app.use(notFoundHandler);

// Error handler
app.use(errorHandler);

// Start server
app.listen(PORT, async () => {
  console.info(`
╔════════════════════════════════════════╗
║                                        ║
║       🎨 WallsPie API Server 🎨        ║
║                                        ║
╚════════════════════════════════════════╝

🚀 Server running on: http://localhost:${PORT}
📊 Environment: ${process.env.NODE_ENV || 'development'}
🌐 CORS enabled for: ${process.env.CLIENT_URL || 'http://localhost:3000'}
  `);

  // Test database connection
  try {
    await testConnection();
    console.info('✅ Database connection: SUCCESS\n');
  } catch (error) {
    console.error('❌ Database connection: FAILED');
    console.error('   Please check your .env configuration\n');
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.info('\n🛑 SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.info('\n🛑 SIGINT received, shutting down gracefully...');
  process.exit(0);
});

export default app;
