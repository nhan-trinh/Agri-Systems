/**
 * Custom application error with HTTP status code and error code.
 * Used throughout the application for consistent error handling.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details: any[];

  constructor(code: string, statusCode: number, message?: string, details: any[] = []) {
    super(message || code);
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;

    // Maintain proper stack trace (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }

    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export default AppError;
