/**
 * Simple logging utility for HTTPCraft MCP
 */
class Logger {
    name;
    constructor(name) {
        this.name = name;
    }
    debug(message, context) {
        this.log('debug', message, context);
    }
    info(message, context) {
        this.log('info', message, context);
    }
    warn(message, context) {
        this.log('warn', message, context);
    }
    error(message, context, error) {
        this.log('error', message, context, error);
    }
    log(level, message, context, error) {
        const logEntry = {
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
    formatLogEntry(entry) {
        const contextStr = entry.context ? ` ${JSON.stringify(entry.context)}` : '';
        return `${entry.timestamp} [${entry.level.toUpperCase()}] ${entry.message}${contextStr}`;
    }
}
export function createLogger(name) {
    return new Logger(name);
}
export const logger = createLogger('HTTPCraft-MCP');
//# sourceMappingURL=logger.js.map