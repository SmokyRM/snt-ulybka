/**
 * Утилиты для устойчивых запросов в QA проверках
 * - Таймауты на запросы
 * - Ограничение параллелизма
 * - Корректная обработка сетевых ошибок
 */

const REQUEST_TIMEOUT_MS = 7000; // 7 секунд
const MAX_CONCURRENT_REQUESTS = 5; // Максимум 5 одновременных запросов

/**
 * Fetch с таймаутом
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = REQUEST_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Таймаут запроса");
    }
    throw error;
  }
}

/**
 * Простой пул для ограничения параллелизма
 */
class RequestPool {
  private queue: Array<() => Promise<unknown>> = [];
  private running = 0;
  private maxConcurrent: number;

  constructor(maxConcurrent: number = MAX_CONCURRENT_REQUESTS) {
    this.maxConcurrent = maxConcurrent;
  }

  async add<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          this.running--;
          this.processQueue();
        }
      });
      this.processQueue();
    });
  }

  private processQueue() {
    while (this.running < this.maxConcurrent && this.queue.length > 0) {
      const task = this.queue.shift();
      if (task) {
        this.running++;
        task();
      }
    }
  }
}

/**
 * Создаёт новый пул запросов
 */
export function createRequestPool(maxConcurrent: number = MAX_CONCURRENT_REQUESTS): RequestPool {
  return new RequestPool(maxConcurrent);
}

/**
 * Определяет, является ли ошибка сетевой (не 500)
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError && error.message.includes("fetch")) {
    return true;
  }
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes("network") ||
      message.includes("failed to fetch") ||
      message.includes("networkerror") ||
      message.includes("таймаут") ||
      message.includes("timeout")
    );
  }
  return false;
}
