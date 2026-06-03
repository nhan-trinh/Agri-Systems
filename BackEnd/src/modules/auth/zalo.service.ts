import axios from 'axios';
import config from '../../config/app.config';
import { AppError } from '../../shared/utils/app-error';
import { ZaloProfile, ZaloTokenResponse } from './auth.types';

/**
 * ZaloService — Gọi Zalo OAuth2 + Graph API.
 *
 * Luồng đúng của Zalo Mini App:
 *   1. Frontend gọi getAuthCode() → nhận auth code
 *   2. Backend gọi exchangeCodeForToken(code) → nhận access_token
 *   3. Backend gọi getUserProfile(access_token) → nhận profile (id, name, picture)
 */
export class ZaloService {
  /**
   * Đổi auth code từ Zalo SDK thành access_token.
   * POST https://oauth.zaloapp.com/v4/oa/access_token
   */
  async exchangeCodeForToken(code: string): Promise<string> {
    try {
      const response = await axios.post<ZaloTokenResponse>(
        config.zalo.oauthUrl,
        null,
        {
          params: {
            app_id: config.zalo.appId,
            app_secret: config.zalo.appSecret,
            code,
            grant_type: 'authorization_code',
          },
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      if (response.data.error || !response.data.access_token) {
        throw new AppError(
          'ZALO_AUTH_FAILED',
          502,
          response.data.message || 'Không thể xác thực với Zalo'
        );
      }

      return response.data.access_token;
    } catch (error) {
      if (error instanceof AppError) throw error;

      throw new AppError(
        'ZALO_AUTH_FAILED',
        502,
        'Lỗi kết nối đến Zalo OAuth server'
      );
    }
  }

  /**
   * Lấy thông tin profile user từ Zalo Graph API.
   * GET https://graph.zalo.me/v2.0/me?fields=id,name,picture
   */
  async getUserProfile(accessToken: string): Promise<ZaloProfile> {
    try {
      const response = await axios.get(config.zalo.graphApiUrl, {
        params: { fields: 'id,name,picture' },
        headers: { access_token: accessToken },
      });

      if (!response.data.id) {
        throw new AppError(
          'ZALO_AUTH_FAILED',
          502,
          'Không thể lấy thông tin user từ Zalo'
        );
      }

      return {
        zaloId: response.data.id,
        name: response.data.name || '',
        avatar: response.data.picture?.data?.url || null,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;

      throw new AppError(
        'ZALO_AUTH_FAILED',
        502,
        'Lỗi kết nối đến Zalo Graph API'
      );
    }
  }
}

export const zaloService = new ZaloService();
