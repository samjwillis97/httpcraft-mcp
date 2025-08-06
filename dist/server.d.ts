#!/usr/bin/env node
/**
 * HTTPCraft MCP Server Entry Point
 * Model Context Protocol server for HTTPCraft CLI integration
 */
import type { ServerConfig } from './types/index.js';
declare class HttpCraftMcpServer {
    private readonly server;
    private readonly config;
    private readonly startTime;
    private readonly httpCraft;
    private isShuttingDown;
    constructor(config?: Partial<ServerConfig>);
    private setupTools;
    private setupHandlers;
    private handleHealthCheck;
    private getHealthStatus;
    private setupGracefulShutdown;
    start(): Promise<void>;
    shutdown(): Promise<void>;
    getConfig(): ServerConfig;
}
export { HttpCraftMcpServer };
//# sourceMappingURL=server.d.ts.map