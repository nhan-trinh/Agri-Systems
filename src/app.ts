import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import config from './config/app.config';
import responseHelper from './shared/utils/response.helper';

const app = express();

// Middlewares
app.use(helmet());
app.use(cors());
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

app.use(`/api/${config.apiVersion}`, apiRouter);

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
