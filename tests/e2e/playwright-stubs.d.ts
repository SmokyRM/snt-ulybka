declare module "@playwright/test" {
  export type Locator = {
    click(options?: Record<string, unknown>): Promise<void>;
    fill(value: string, options?: Record<string, unknown>): Promise<void>;
    selectOption(value: unknown): Promise<void>;
    first(): Locator;
    filter(options: Record<string, unknown>): Locator;
    getByRole(role: string | RegExp, options?: Record<string, unknown>): Locator;
    toBeVisible(options?: Record<string, unknown>): Promise<void>;
    toContainText(text: string | RegExp, options?: Record<string, unknown>): Promise<void>;
  };

  export type Page = {
    goto(url: string, options?: Record<string, unknown>): Promise<void>;
    getByTestId(id: string): Locator;
    getByLabel(text: string | RegExp, options?: Record<string, unknown>): Locator;
    getByRole(role: string | RegExp, options?: Record<string, unknown>): Locator;
    locator(selector: string | RegExp, options?: Record<string, unknown>): Locator;
    waitForURL(urlOrPattern: string | RegExp, options?: Record<string, unknown>): Promise<void>;
    waitForLoadState(state?: string, options?: Record<string, unknown>): Promise<void>;
    waitForResponse(
      predicate: (response: Response) => boolean,
      options?: Record<string, unknown>,
    ): Promise<Response>;
    context(): { storageState: (options?: { path?: string }) => Promise<void> };
    locator(selector: string | RegExp, options?: Record<string, unknown>): Locator;
  };

  export type Response = {
    url(): string;
    status(): number;
    headers(): Record<string, string>;
  };

  export type DefineConfig = (...args: unknown[]) => unknown;

  export const test: {
    (name: string, fn: (args: { page: Page }) => Promise<void>): unknown;
    describe: (name: string, fn: () => void) => unknown;
    use: (options: Record<string, unknown>) => void;
    skip: (condition: boolean | string, description?: string) => void;
  };

  export const expect: (locator: Locator | Page | unknown) => {
    toHaveURL: (url: string | RegExp) => Promise<void>;
    not: {
      toHaveURL: (url: string | RegExp) => Promise<void>;
      toContainText: (text: string | RegExp) => Promise<void>;
    };
    toBeVisible: () => Promise<void>;
    toContainText: (text: string | RegExp) => Promise<void>;
  };

  export const defineConfig: DefineConfig;

  export const chromium: {
    launch: (options?: Record<string, unknown>) => Promise<{
      newPage: () => Promise<Page>;
      close: () => Promise<void>;
    }>;
  };
}
