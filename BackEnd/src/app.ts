import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import config from './config/app.config';
import responseHelper from './shared/utils/response.helper';
import { requireAuth } from './modules/auth/auth.middleware';
import { UserRole } from '@prisma/client';

const app = express();

// Middlewares
app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or server-to-server calls)
      if (!origin) return callback(null, true);
      
      // Allow any localhost port for local development
      if (/^http:\/\/localhost(:\d+)?$/.test(origin) || /^http:\/\/127\.0\.0\.1(:\d+)?$/.test(origin)) {
        return callback(null, true);
      }
      
      // Add other production origins here if needed
      callback(null, false);
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (config.env !== 'test') {
  app.use(morgan('dev'));
}

// Serve static uploads. OCR originals are sensitive, so local-storage OCR paths
// require auth before falling through to express.static.
app.use('/uploads/ocr/:cooperativeId', requireAuth, (req: Request, res: Response, next: NextFunction) => {
  const requestedCoop = req.params.cooperativeId;
  if (req.user?.role === UserRole.SUPER_ADMIN || req.user?.cooperativeId === requestedCoop) {
    return next();
  }

  return responseHelper.error(res, 'FORBIDDEN', 'Bạn không có quyền truy cập tệp OCR này', [], 403);
});
app.use('/uploads', express.static(path.resolve(process.cwd(), config.storage?.localPath || './public/uploads')));

// Health Check
app.get('/health', (req: Request, res: Response) => {
  responseHelper.success(res, { status: 'OK', env: config.env, version: config.apiVersion });
});

// Import module routers
import authRouter from './modules/auth/auth.router';
import userRouter from './modules/user/user.router';
import farmerRouter from './modules/farmer/farmer.router';
import farmZoneRouter from './modules/farm-zone/farm-zone.router';
import farmingLogRouter from './modules/farming-log/farming-log.router';
import warehouseRouter from './modules/warehouse/warehouse.router';
import checkvnQrRouter from './modules/checkvn-qr/checkvn-qr.router';
import carbonRouter from './modules/carbon/carbon.router';
import reportingRouter from './modules/reporting/reporting.router';
import notificationRouter from './modules/notification/notification.router';
import ocrRouter from './modules/ocr/ocr.router';
import cooperativeRouter from './modules/cooperative/cooperative.router';
import seasonRouter from './modules/season/season.router';
import dashboardRouter from './modules/dashboard/dashboard.router';
import harvestWarehouseRouter from './modules/harvest-warehouse/harvest-warehouse.router';
import { checkvnQrController } from './modules/checkvn-qr/checkvn-qr.controller';

// Start BullMQ background workers (except in test mode)
if (config.env !== 'test') {
  require('./workers/carbon-calculation.worker');
  require('./workers/carbon-certificate.worker');
  require('./workers/ocr.worker');
}

// Global API Router Placeholder
const apiRouter = express.Router();

// Mount module routers conforming to API conventions
apiRouter.use('/auth', authRouter);
apiRouter.use('/users', userRouter);
apiRouter.use('/farmers', farmerRouter);
apiRouter.use('/farm-zones', farmZoneRouter);
apiRouter.use('/farming-logs', farmingLogRouter);
apiRouter.use('/warehouse', warehouseRouter);
apiRouter.use('/harvest-warehouse', harvestWarehouseRouter);
apiRouter.use('/qr', checkvnQrRouter);
apiRouter.use('/carbon', carbonRouter);
apiRouter.use('/reports', reportingRouter);
apiRouter.use('/notifications', notificationRouter);
apiRouter.use('/ocr', ocrRouter);
apiRouter.use('/cooperatives', cooperativeRouter);
apiRouter.use('/seasons', seasonRouter);
apiRouter.use('/dashboard', dashboardRouter);

app.use(`/api/${config.apiVersion}`, apiRouter);

// Public Trace Root Endpoint
app.get('/public/trace/:qrCode', checkvnQrController.publicTrace);

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  const statusCode = err.status || err.statusCode || 500;
  const errorCode = err.code || 'INTERNAL_SERVER_ERROR';
  const message = err.message || 'Lỗi server không xác định';
  
  if (config.env === 'development') {
    console.error(err);
  }

  responseHelper.error(res, errorCode, message, err.details || [], statusCode);
});

export default app;
export { apiRouter };
