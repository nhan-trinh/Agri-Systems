import { Router } from 'express';
import { authController } from './auth.controller';
import { requireAuth } from './auth.middleware';
import { validateBody } from '../../shared/pipes/validate.pipe';
import {
  ZaloLoginDto,
  LoginDto,
  RefreshDto,
  ChangePasswordDto,
  FirstLoginChangePasswordDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './auth.dto';

const router = Router();

// ─────────── Public Routes ───────────

// Luồng A: Zalo Mini App
router.post('/zalo-login', validateBody(ZaloLoginDto), authController.zaloLogin);

// Luồng B: Web Admin
router.post('/login', validateBody(LoginDto), authController.login);

// Refresh token
router.post('/refresh', validateBody(RefreshDto), authController.refresh);

// Forgot / Reset password (OTP)
router.post('/forgot-password', validateBody(ForgotPasswordDto), authController.forgotPassword);
router.post('/reset-password', validateBody(ResetPasswordDto), authController.resetPassword);

// ─────────── Authenticated Routes ───────────

// Logout (cần token để biết user nào)
router.post('/logout', requireAuth, validateBody(RefreshDto), authController.logout);

// Lấy thông tin user hiện tại
router.get('/me', requireAuth, authController.getMe);

// Đổi mật khẩu
router.post('/change-password', requireAuth, validateBody(ChangePasswordDto), authController.changePassword);

// Đổi mật khẩu lần đầu bắt buộc
router.post(
  '/first-login-change-password',
  requireAuth,
  validateBody(FirstLoginChangePasswordDto),
  authController.firstLoginChangePassword
);

export default router;
