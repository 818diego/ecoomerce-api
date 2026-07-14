export interface ApiResponse<T = unknown> {
  success: boolean;
  error: string | null;
  message: string;
  data: T | null;
}

export interface NestErrorResponse {
  statusCode?: number;
  message?: string | string[];
  error?: string;
}