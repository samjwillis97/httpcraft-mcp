/**
 * Simple logging utility for HTTPCraft MCP
 */
declare class Logger {
    private readonly name;
    constructor(name: string);
    debug(message: string, context?: Record<string, unknown>): void;
    info(message: string, context?: Record<string, unknown>): void;
    warn(message: string, context?: Record<string, unknown>): void;
    error(message: string, context?: Record<string, unknown>, error?: Error): void;
    private log;
    private formatLogEntry;
}
export declare function createLogger(name: string): Logger;
export declare const logger: Logger;
export {};
//# sourceMappingURL=logger.d.ts.map