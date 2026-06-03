import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from '../../config/app.config';
import { AppError } from '../../shared/utils/app-error';
import { JwtPayload } from './auth.types';
import { UserRole } from '@prisma/client';

/**
 * requireAuth — Xác thực JWT access token từ Authorization header.
 * Gắn payload vào req.user nếu hợp lệ.
 */
export const requireAuth = (req: Request, _res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('UNAUTHORIZED', 401, 'Token không được cung cấp'));
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, config.jwt.secret) as JwtPayload;
    req.user = payload;
    next();
  } catch {
    next(new AppError('UNAUTHORIZED', 401, 'Token không hợp lệ hoặc đã hết hạn'));
  }
};

/**
 * requireRole — RBAC middleware.
 * Chỉ cho phép user có role nằm trong danh sách truyền vào.
 * Phải đặt SAU requireAuth.
 */
export const requireRole = (...roles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError('UNAUTHORIZED', 401, 'Chưa xác thực'));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new AppError(
          'FORBIDDEN',
          403,
          `Bạn không có quyền truy cập. Yêu cầu role: ${roles.join(', ')}`
        )
      );
    }

    next();
  };
};

/**
 * requireNotFirstLogin — Chặn user chưa đổi mật khẩu lần đầu.
 * Dùng cho các route cần user đã hoàn tất onboarding.
 * Phải đặt SAU requireAuth.
 */
export const requireNotFirstLogin = (req: Request, _res: Response, next: NextFunction): void => {
  if (!req.user) {
    return next(new AppError('UNAUTHORIZED', 401, 'Chưa xác thực'));
  }

  if (req.user.isFirstLogin) {
    return next(
      new AppError(
        'FIRST_LOGIN_REQUIRED',
        403,
        'Bạn cần đổi mật khẩu trước khi sử dụng hệ thống'
      )
    );
  }

  next();
};
