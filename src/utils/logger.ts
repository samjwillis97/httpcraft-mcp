/**
 * Simple logging utility for HTTPCraft MCP
 */

import type { LogLevel, LogEntry } from '../types/index.js';

class Logger {
  private readonly name: string;

  constructor(name: string) {
    this.name = name;
  }

  public debug(message: string, context?: Record<string, unknown>): void {
    this.log('debug', message, context);
  }

  public info(message: string, context?: Record<string, unknown>): void {
    this.log('info', message, context);
  }

  public warn(message: string, context?: Record<string, unknown>): void {
    this.log('warn', message, context);
  }

  public error(message: string, context?: Record<string, unknown>, error?: Error): void {
    this.log('error', message, context, error);
  }

  private log(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>,
    error?: Error
  ): void {
    const logEntry: LogEntry = {
      level,
      message: `[${this.name}] ${message}`,
      timestamp: new Date().toISOString(),
      context,
      error,
    };

    // Simple console logging for now
    const logMessage = this.formatLogEntry(logEntry);

    switch (level) {
      case 'debug':
        console.debug(logMessage);
        break;
      case 'info':
        console.info(logMessage);
        break;
      case 'warn':
        console.warn(logMessage);
        break;
      case 'error':
        console.error(logMessage);
        if (error) {
          console.error(error.stack);
        }
        break;
    }
  }

  private formatLogEntry(entry: LogEntry): string {
    const contextStr = entry.context ? ` ${JSON.stringify(entry.context)}` : '';
    return `${entry.timestamp} [${entry.level.toUpperCase()}] ${entry.message}${contextStr}`;
  }
}

export function createLogger(name: string): Logger {
  return new Logger(name);
}

export const logger = createLogger('HTTPCraft-MCP');
