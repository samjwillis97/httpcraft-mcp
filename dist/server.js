#!/usr/bin/env node
/**
 * HTTPCraft MCP Server Entry Point
 * Model Context Protocol server for HTTPCraft CLI integration
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { logger } from './utils/logger.js';
import { HttpCraftCli } from './httpcraft/cli-simple.js';
class HttpCraftMcpServer {
    server;
    config;
    startTime;
    httpCraft;
    isShuttingDown = false;
    constructor(config = {}) {
        this.startTime = new Date();
        this.httpCraft = new HttpCraftCli();
        this.config = {
            name: 'httpcraft-mcp',
            version: '0.1.0',
            timeout: 30000,
            maxRequestSize: 10 * 1024 * 1024, // 10MB
            ...config,
        };
        this.server = new Server({
            name: this.config.name,
            version: this.config.version,
        }, {
            capabilities: {
                tools: {},
            },
        });
        this.setupHandlers();
        this.setupGracefulShutdown();
        logger.info('HttpCraft MCP Server initialized', {
            name: this.config.name,
            version: this.config.version,
        });
    }
    setupHandlers() {
        // List available tools
        this.server.setRequestHandler(ListToolsRequestSchema, async () => {
            logger.debug('Received list_tools request');
            return {
                tools: [
                    {
                        name: 'httpcraft_health',
                        description: 'Check the health status of the HTTPCraft MCP server',
                        inputSchema: {
                            type: 'object',
                            properties: {},
                        },
                    },
                ],
            };
        });
        // Handle tool calls
        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            logger.debug('Received call_tool request', { toolName: request.params.name });
            switch (request.params.name) {
                case 'httpcraft_health':
                    return this.handleHealthCheck();
                default:
                    throw new Error(`Unknown tool: ${request.params.name}`);
            }
        });
        logger.debug('Request handlers registered');
    }
    async handleHealthCheck() {
        const health = await this.getHealthStatus();
        logger.debug('Health check performed', { status: health.status });
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(health, null, 2),
                },
            ],
        };
    }
    async getHealthStatus() {
        const uptime = Date.now() - this.startTime.getTime();
        // Check HTTPCraft availability
        const httpCraftAvailable = await this.httpCraft.isAvailable();
        const status = {
            status: httpCraftAvailable ? 'healthy' : 'unhealthy',
            timestamp: new Date().toISOString(),
            uptime,
            httpCraftAvailable,
            details: {
                serverName: this.config.name,
                serverVersion: this.config.version,
                nodeVersion: process.version,
                memoryUsage: process.memoryUsage(),
            },
        };
        return status;
    }
    setupGracefulShutdown() {
        const gracefulShutdown = (signal) => {
            if (this.isShuttingDown) {
                logger.warn('Forced shutdown');
                process.exit(1);
            }
            this.isShuttingDown = true;
            logger.info(`Received ${signal}, shutting down gracefully`);
            setTimeout(() => {
                logger.error('Shutdown timeout, forcing exit');
                process.exit(1);
            }, 5000);
            this.shutdown()
                .then(() => {
                logger.info('Server shutdown complete');
                process.exit(0);
            })
                .catch(error => {
                logger.error('Error during shutdown', {}, error);
                process.exit(1);
            });
        };
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    }
    async start() {
        try {
            const transport = new StdioServerTransport();
            await this.server.connect(transport);
            logger.info('HTTPCraft MCP Server started successfully', {
                serverName: this.config.name,
                serverVersion: this.config.version,
            });
        }
        catch (error) {
            logger.error('Failed to start server', {}, error);
            throw error;
        }
    }
    async shutdown() {
        try {
            logger.info('Shutting down server...');
            await this.server.close();
            logger.info('Server closed successfully');
        }
        catch (error) {
            logger.error('Error during shutdown', {}, error);
            throw error;
        }
    }
    getConfig() {
        return { ...this.config };
    }
}
// Start the server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const server = new HttpCraftMcpServer();
    server.start().catch(error => {
        logger.error('Failed to start HTTPCraft MCP Server', {}, error);
        process.exit(1);
    });
}
export { HttpCraftMcpServer };
//# sourceMappingURL=server.js.map