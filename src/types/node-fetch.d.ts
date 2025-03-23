// Type declaration for node-fetch
declare module 'node-fetch' {
  export default function fetch(url: string | URL | Request, init?: RequestInit): Promise<Response>;
  export class Request extends globalThis.Request {}
  export class Response extends globalThis.Response {}
  export class Headers extends globalThis.Headers {}
  export class FetchError extends Error {
    type: string;
    code: string;
    errno: string;
  }
}
