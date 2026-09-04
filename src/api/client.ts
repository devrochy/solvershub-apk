import { authUrl } from "../config";
import { isAccessTokenExpired } from "../session/jwt";
import type { TokenPair } from "../types/auth";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface SessionGateway {
  getTokens(): Promise<TokenPair | null>;
  saveTokens(pair: TokenPair): Promise<void>;
  clear(): Promise<void>;
}

export interface RequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string | FormData | Uint8Array | ArrayBuffer;
}

/**
 * Cliente HTTP tipado hacia el backend de CobraIA. Adjunta el Bearer,
 * refresca el access token al expirar y reintenta una vez ante un 401.
 * Si el refresh falla, limpia la sesión (el guard de rutas vuelve al login).
 */
export class ApiClient {
  private refreshing: Promise<TokenPair | null> | null = null;

  constructor(private readonly gateway: SessionGateway) {}

  async request<T>(path: string, init: RequestOptions = {}): Promise<T> {
    const pair = await this.pairAutenticado();
    if (!pair) {
      throw new ApiError(401, "Sesión expirada");
    }

    const res = await this.rawFetch(path, init, pair.accessToken);

    if (res.status === 401) {
      const refreshed = await this.tryRefresh(pair.refreshToken);
      if (!refreshed) {
        throw new ApiError(401, "No autorizado");
      }
      const retry = await this.rawFetch(path, init, refreshed.accessToken);
      if (retry.status === 401) {
        throw new ApiError(401, "No autorizado");
      }
      return this.toJson<T>(retry);
    }

    return this.toJson<T>(res);
  }

  /** Petición que devuelve el body como bytes (p. ej. un PDF). */
  async requestBytes(path: string): Promise<Uint8Array> {
    const pair = await this.pairAutenticado();
    if (!pair) {
      throw new ApiError(401, "Sesión expirada");
    }

    const res = await this.rawFetch(path, {}, pair.accessToken);

    if (res.status === 401) {
      const refreshed = await this.tryRefresh(pair.refreshToken);
      if (!refreshed) {
        throw new ApiError(401, "No autorizado");
      }
      const retry = await this.rawFetch(path, {}, refreshed.accessToken);
      if (retry.status === 401) {
        throw new ApiError(401, "No autorizado");
      }
      return this.aBytes(retry);
    }

    return this.aBytes(res);
  }

  /** Token vigente (con refresh si el access expiró localmente). */
  private async pairAutenticado(): Promise<TokenPair | null> {
    let pair = await this.gateway.getTokens();
    if (!pair) {
      return null;
    }
    if (isAccessTokenExpired(pair.accessToken)) {
      const refreshed = await this.tryRefresh(pair.refreshToken);
      if (!refreshed) {
        return null;
      }
      pair = refreshed;
    }
    return pair;
  }

  private async aBytes(res: Response): Promise<Uint8Array> {
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new ApiError(res.status, body || res.statusText);
    }
    const buffer = await res.arrayBuffer();
    return new Uint8Array(buffer);
  }

  private rawFetch(
    path: string,
    init: RequestOptions,
    accessToken: string,
  ): Promise<Response> {
    return fetch(authUrl(path), {
      method: init.method ?? "GET",
      headers: {
        ...init.headers,
        Authorization: `Bearer ${accessToken}`,
      },
      body: init.body as BodyInit,
    });
  }

  private tryRefresh(refreshToken: string): Promise<TokenPair | null> {
    if (!this.refreshing) {
      this.refreshing = this.doRefresh(refreshToken).finally(() => {
        this.refreshing = null;
      });
    }
    return this.refreshing;
  }

  private async doRefresh(refreshToken: string): Promise<TokenPair | null> {
    const res = await fetch(authUrl("/auth/refresh"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) {
      await this.gateway.clear();
      return null;
    }
    const pair = (await res.json()) as TokenPair;
    await this.gateway.saveTokens(pair);
    return pair;
  }

  private async toJson<T>(res: Response): Promise<T> {
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new ApiError(res.status, body || res.statusText);
    }
    if (res.status === 204) {
      return undefined as T;
    }
    return (await res.json()) as T;
  }
}

export function apiErrorStatus(err: unknown): number | null {
  return err instanceof ApiError ? err.status : null;
}

/** Un error de red es cualquier fallo que NO sea una respuesta HTTP del backend. */
export function esErrorDeRed(err: unknown): boolean {
  return !(err instanceof ApiError);
}

export { isAccessTokenExpired };