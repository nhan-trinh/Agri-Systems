import { z } from 'zod';

// ==================== Regex ====================

const PHONE_VN_REGEX = /^(0[3|5|7|8|9])+([0-9]{8})$/;

// ==================== Luồng Zalo Mini App ====================

export const ZaloLoginDto = z.object({
  code: z.string().min(1, 'Auth code không được để trống'),
});
export type ZaloLoginInput = z.infer<typeof ZaloLoginDto>;

// ==================== Luồng Web Admin ====================

export const LoginDto = z.object({
  phone: z.string().regex(PHONE_VN_REGEX, 'Số điện thoại không hợp lệ'),
  password: z.string().min(8, 'Mật khẩu tối thiểu 8 ký tự'),
});
export type LoginInput = z.infer<typeof LoginDto>;

// ==================== Refresh Token ====================

export const RefreshDto = z.object({
  refresh_token: z.string().min(1, 'Refresh token không được để trống'),
});
export type RefreshInput = z.infer<typeof RefreshDto>;

// ==================== Change Password ====================

export const ChangePasswordDto = z.object({
  old_password: z.string().min(8, 'Mật khẩu cũ tối thiểu 8 ký tự'),
  new_password: z.string().min(8, 'Mật khẩu mới tối thiểu 8 ký tự'),
  confirm_password: z.string().min(8, 'Xác nhận mật khẩu tối thiểu 8 ký tự'),
}).refine((d) => d.new_password === d.confirm_password, {
  message: 'Mật khẩu xác nhận không khớp',
  path: ['confirm_password'],
}).refine((d) => d.old_password !== d.new_password, {
  message: 'Mật khẩu mới phải khác mật khẩu cũ',
  path: ['new_password'],
});
export type ChangePasswordInput = z.infer<typeof ChangePasswordDto>;

// ==================== First Login Change Password ====================

export const FirstLoginChangePasswordDto = z.object({
  new_password: z.string().min(8, 'Mật khẩu mới tối thiểu 8 ký tự'),
  confirm_password: z.string().min(8, 'Xác nhận mật khẩu tối thiểu 8 ký tự'),
}).refine((d) => d.new_password === d.confirm_password, {
  message: 'Mật khẩu xác nhận không khớp',
  path: ['confirm_password'],
});
export type FirstLoginChangePasswordInput = z.infer<typeof FirstLoginChangePasswordDto>;

// ==================== Forgot / Reset Password ====================

export const ForgotPasswordDto = z.object({
  phone: z.string().regex(PHONE_VN_REGEX, 'Số điện thoại không hợp lệ'),
});
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordDto>;

export const ResetPasswordDto = z.object({
  phone: z.string().regex(PHONE_VN_REGEX, 'Số điện thoại không hợp lệ'),
  otp: z.string().length(6, 'OTP phải có đúng 6 chữ số'),
  new_password: z.string().min(8, 'Mật khẩu mới tối thiểu 8 ký tự'),
});
export type ResetPasswordInput = z.infer<typeof ResetPasswordDto>;
