/* eslint-disable @typescript-eslint/no-explicit-any */
declare module "@playwright/test" {
  export type Locator = any;
  export type Page = any;
  export const test: any;
  export const expect: any;
  export const defineConfig: any;
  export const chromium: any;
}
