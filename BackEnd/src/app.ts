import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import config from './config/app.config';
import responseHelper from './shared/utils/response.helper';

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

// Health Check
app.get('/health', (req: Request, res: Response) => {
  responseHelper.success(res, { status: 'OK', env: config.env, version: config.apiVersion });
});

// Import module routers
import authRouter from './modules/auth/auth.router';
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
import { checkvnQrController } from './modules/checkvn-qr/checkvn-qr.controller';

// Global API Router Placeholder
const apiRouter = express.Router();

// Mount module routers conforming to API conventions
apiRouter.use('/auth', authRouter);
apiRouter.use('/farmers', farmerRouter);
apiRouter.use('/farm-zones', farmZoneRouter);
apiRouter.use('/farming-logs', farmingLogRouter);
apiRouter.use('/warehouse', warehouseRouter);
apiRouter.use('/qr', checkvnQrRouter);
apiRouter.use('/carbon', carbonRouter);
apiRouter.use('/reports', reportingRouter);
apiRouter.use('/notifications', notificationRouter);
apiRouter.use('/ocr', ocrRouter);
apiRouter.use('/cooperatives', cooperativeRouter);
apiRouter.use('/seasons', seasonRouter);

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
