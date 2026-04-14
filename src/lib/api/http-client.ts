import axios, {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";

export interface ApiErrorPayload {
  error?: string;
  message?: string;
  [key: string]: unknown;
}

export class ApiError extends Error {
  readonly status?: number;
  readonly data?: ApiErrorPayload;

  constructor(message: string, status?: number, data?: ApiErrorPayload) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

let authToken: string | null = null;

export const setAuthToken = (token: string | null): void => {
  authToken = token;
};

const getBaseUrl = (): string => {
  const configured = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!configured) {
    return "/api";
  }

  return configured.endsWith("/") ? configured.slice(0, -1) : configured;
};

const logger = {
  debug: (message: string, payload?: unknown) => {
    if (process.env.NODE_ENV !== "production") {
      console.debug(`[api] ${message}`, payload ?? "");
    }
  },
  error: (message: string, payload?: unknown) => {
    console.error(`[api] ${message}`, payload ?? "");
  },
};

const toApiError = (error: AxiosError<ApiErrorPayload>): ApiError => {
  const status = error.response?.status;
  const data = error.response?.data;
  const message = data?.error ?? data?.message ?? error.message ?? "Не удалось выполнить запрос";

  return new ApiError(message, status, data);
};

const createHttpClient = (): AxiosInstance => {
  const instance = axios.create({
    baseURL: getBaseUrl(),
    withCredentials: true,
    timeout: 30000,
    headers: {
      "Content-Type": "application/json",
    },
  });

  instance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    if (authToken) {
      config.headers.Authorization = `Bearer ${authToken}`;
    }

    logger.debug(`${config.method?.toUpperCase()} ${config.url}`);
    return config;
  });

  instance.interceptors.response.use(
    (response: AxiosResponse) => {
      logger.debug(`Response ${response.status} ${response.config.url}`);
      return response;
    },
    (error: AxiosError<ApiErrorPayload>) => {
      const normalizedError = toApiError(error);
      logger.error(normalizedError.message, {
        status: normalizedError.status,
        url: error.config?.url,
      });
      return Promise.reject(normalizedError);
    },
  );

  return instance;
};

const httpClient = createHttpClient();

export const apiClient = {
  get: async <TResponse>(url: string, config?: AxiosRequestConfig): Promise<TResponse> => {
    const response = await httpClient.get<TResponse>(url, config);
    return response.data;
  },

  post: async <TResponse, TBody = unknown>(
    url: string,
    body?: TBody,
    config?: AxiosRequestConfig,
  ): Promise<TResponse> => {
    const response = await httpClient.post<TResponse>(url, body, config);
    return response.data;
  },

  put: async <TResponse, TBody = unknown>(
    url: string,
    body?: TBody,
    config?: AxiosRequestConfig,
  ): Promise<TResponse> => {
    const response = await httpClient.put<TResponse>(url, body, config);
    return response.data;
  },

  delete: async <TResponse>(url: string, config?: AxiosRequestConfig): Promise<TResponse> => {
    const response = await httpClient.delete<TResponse>(url, config);
    return response.data;
  },

  patch: async <TResponse, TBody = unknown>(
    url: string,
    body?: TBody,
    config?: AxiosRequestConfig,
  ): Promise<TResponse> => {
    const response = await httpClient.patch<TResponse>(url, body, config);
    return response.data;
  },
};
