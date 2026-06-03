import { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service';
import responseHelper from '../../shared/utils/response.helper';

export class AuthController {
  /**
   * POST /auth/zalo-login
   * Đăng nhập qua Zalo Mini App (auth code)
   */
  public zaloLogin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await authService.zaloLogin(req.body);
      responseHelper.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /auth/login
   * Đăng nhập Web Admin (SĐT + password)
   */
  public login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await authService.webLogin(req.body);
      responseHelper.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /auth/refresh
   * Đổi refresh token lấy access token mới
   */
  public refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await authService.refreshToken(req.body.refresh_token);
      responseHelper.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /auth/logout
   * Hủy refresh token
   */
  public logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await authService.logout(req.body.refresh_token);
      responseHelper.success(res, { message: 'Đăng xuất thành công' });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /auth/me
   * Lấy thông tin user đang đăng nhập
   */
  public getMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await authService.getMe(req.user!.userId);
      responseHelper.success(res, user);
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /auth/change-password
   * Đổi mật khẩu (Web Admin)
   */
  public changePassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await authService.changePassword(req.user!.userId, req.body);
      responseHelper.success(res, { message: 'Đổi mật khẩu thành công' });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /auth/first-login-change-password
   * Đổi mật khẩu lần đầu bắt buộc
   */
  public firstLoginChangePassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await authService.firstLoginChangePassword(req.user!.userId, req.body);
      responseHelper.success(res, { message: 'Đổi mật khẩu lần đầu thành công. Vui lòng đăng nhập lại.' });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /auth/forgot-password
   * Gửi OTP SMS reset mật khẩu
   */
  public forgotPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await authService.forgotPassword(req.body);
      responseHelper.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /auth/reset-password
   * Reset mật khẩu bằng OTP
   */
  public resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await authService.resetPassword(req.body);
      responseHelper.success(res, { message: 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại.' });
    } catch (error) {
      next(error);
    }
  };
}

export const authController = new AuthController();
