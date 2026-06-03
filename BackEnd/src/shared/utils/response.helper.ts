import { Response } from 'express';

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export const responseHelper = {
  success: <T>(res: Response, data: T, statusCode = 200) => {
    return res.status(statusCode).json({
      success: true,
      data,
    });
  },

  paginate: <T>(res: Response, data: T[], meta: PaginationMeta, statusCode = 200) => {
    return res.status(statusCode).json({
      success: true,
      data,
      meta,
    });
  },

  error: (
    res: Response,
    code: string,
    message: string,
    details: any[] = [],
    statusCode = 400
  ) => {
    return res.status(statusCode).json({
      success: false,
      error: {
        code,
        message,
        details,
      },
    });
  },
};

export default responseHelper;
