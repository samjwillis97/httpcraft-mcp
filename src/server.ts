#!/usr/bin/env node

/**
 * HTTPCraft MCP Server Entry Point
 * Model Context Protocol server for HTTPCraft CLI integration
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

import { logger } from './utils/logger.js';
import type { ServerConfig, HealthStatus } from './types/index.js';
import { HttpCraftCli } from './httpcraft/cli-simple.js';
import { toolRegistry } from './tools/registry.js';
import { ExecuteApiTool } from './tools/execute-api.js';
import { ExecuteRequestTool } from './tools/execute-request.js';

class HttpCraftMcpServer {
  private readonly server: Server;
  private readonly config: ServerConfig;
  private readonly startTime: Date;
  private readonly httpCraft: HttpCraftCli;
  private isShuttingDown = false;

  constructor(config: Partial<ServerConfig> = {}) {
    this.startTime = new Date();
    this.httpCraft = new HttpCraftCli();
    this.config = {
      name: 'httpcraft-mcp',
      version: '0.1.0',
      timeout: 30000,
      maxRequestSize: 10 * 1024 * 1024, // 10MB
      ...config,
    };

    this.server = new Server(
      {
        name: this.config.name,
        version: this.config.version,
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupTools();
    this.setupHandlers();
    this.setupGracefulShutdown();

    logger.info('HttpCraft MCP Server initialized', {
      name: this.config.name,
      version: this.config.version,
    });
  }

  private setupTools(): void {
    // We need to create HttpCraftCli instance for the tools
    // Note: this is a simplified version for now, will be enhanced with the full CLI in later phases
    const httpCraftCli = this.httpCraft as any; // Type assertion for now

    // Register core tools
    try {
      toolRegistry.register(new ExecuteApiTool(httpCraftCli));
      toolRegistry.register(new ExecuteRequestTool(httpCraftCli));
      
      logger.info('Tools registered successfully', {
        toolCount: toolRegistry.getToolCount(),
        tools: toolRegistry.getToolNames(),
      });
    } catch (error) {
      logger.error('Failed to register tools', {}, error as Error);
    }
  }

  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      logger.debug('Received list_tools request');
      
      // Get tools from registry plus the health check tool
      const registryTools = toolRegistry.getToolDefinitions();
      
      return {
        tools: [
          ...registryTools,
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
    this.server.setRequestHandler(CallToolRequestSchema, async request => {
      logger.debug('Received call_tool request', { toolName: request.params.name });

      // Handle health check tool separately
      if (request.params.name === 'httpcraft_health') {
        return this.handleHealthCheck();
      }

      // Use tool registry for other tools
      try {
        const result = await toolRegistry.executeTool(
          request.params.name,
          request.params.arguments,
          {
            requestId: `req-${Date.now()}`,
            timestamp: new Date(),
          }
        );

        return result;
      } catch (error) {
        logger.error('Tool execution failed', {
          toolName: request.params.name,
          error: (error as Error).message,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: true,
                message: (error as Error).message,
                timestamp: new Date().toISOString(),
              }, null, 2),
            },
          ],
          isError: true,
        };
      }
    });

    logger.debug('Request handlers registered');
  }

  private async handleHealthCheck(): Promise<{
    content: Array<{ type: 'text'; text: string }>;
  }> {
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

  private async getHealthStatus(): Promise<HealthStatus> {
    const uptime = Date.now() - this.startTime.getTime();

    // Check HTTPCraft availability
    const httpCraftAvailable = await this.httpCraft.isAvailable();

    const status: HealthStatus = {
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

  private setupGracefulShutdown(): void {
    const gracefulShutdown = (signal: string): void => {
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
          logger.error('Error during shutdown', {}, error as Error);
          process.exit(1);
        });
    };

    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  }

  public async start(): Promise<void> {
    try {
      const transport = new StdioServerTransport();
      await this.server.connect(transport);

      logger.info('HTTPCraft MCP Server started successfully', {
        serverName: this.config.name,
        serverVersion: this.config.version,
      });
    } catch (error) {
      logger.error('Failed to start server', {}, error as Error);
      throw error;
    }
  }

  public async shutdown(): Promise<void> {
    try {
      logger.info('Shutting down server...');
      await this.server.close();
      logger.info('Server closed successfully');
    } catch (error) {
      logger.error('Error during shutdown', {}, error as Error);
      throw error;
    }
  }

  public getConfig(): ServerConfig {
    return { ...this.config };
  }
}

// Start the server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new HttpCraftMcpServer();

  server.start().catch(error => {
    logger.error('Failed to start HTTPCraft MCP Server', {}, error as Error);
    process.exit(1);
  });
}

export { HttpCraftMcpServer };
