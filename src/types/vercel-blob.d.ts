declare module "@vercel/blob" {
  export type PutOptions = {
    access?: "public" | "private";
    token?: string;
    contentType?: string;
  };

  export type PutResult = {
    url: string;
  };

  export function put(
    pathname: string,
    body: Blob | ArrayBuffer | Uint8Array,
    options?: PutOptions,
  ): Promise<PutResult>;
}
