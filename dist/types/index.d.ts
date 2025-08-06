/**
 * Core type definitions for HTTPCraft MCP
 */
export interface ServerConfig {
    readonly name: string;
    readonly version: string;
    readonly timeout: number;
    readonly maxRequestSize: number;
    readonly httpCraftPath?: string;
}
export interface HealthStatus {
    readonly status: 'healthy' | 'unhealthy';
    readonly timestamp: string;
    readonly uptime: number;
    readonly httpCraftAvailable: boolean;
    readonly details?: Record<string, unknown>;
}
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export interface LogEntry {
    readonly level: LogLevel;
    readonly message: string;
    readonly timestamp: string;
    readonly context?: Record<string, unknown> | undefined;
    readonly error?: Error | undefined;
}
export interface Result<T, E = Error> {
    readonly success: boolean;
    readonly data?: T | undefined;
    readonly error?: E | undefined;
}
export type AsyncResult<T, E = Error> = Promise<Result<T, E>>;
//# sourceMappingURL=index.d.ts.map