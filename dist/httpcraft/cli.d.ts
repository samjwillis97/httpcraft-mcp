/**
 * HTTPCraft CLI execution wrapper
 */
import { type HttpCraftConfig } from './config.js';
import type { AsyncResult } from '../types/index.js';
export interface HttpCraftResult {
    readonly stdout: string;
    readonly stderr: string;
    readonly exitCode: number;
    readonly duration: number;
    readonly success: boolean;
}
export interface HttpCraftOptions {
    readonly cwd?: string;
    readonly timeout?: number;
    readonly env?: Record<string, string>;
}
export declare class HttpCraftCli {
    private readonly configDiscovery;
    private config?;
    constructor();
    /**
     * Execute HTTPCraft command with the given arguments
     */
    execute(args: readonly string[], options?: HttpCraftOptions): AsyncResult<HttpCraftResult>;
    /**
     * Get HTTPCraft version
     */
    getVersion(): AsyncResult<string>;
    /**
     * Check if HTTPCraft is available and working
     */
    isAvailable(): Promise<boolean>;
    /**
     * Execute HTTPCraft with JSON output parsing
     */
    executeWithJsonOutput<T = unknown>(args: readonly string[], options?: HttpCraftOptions): AsyncResult<T>;
    /**
     * Get current HTTPCraft configuration
     */
    getConfig(): AsyncResult<HttpCraftConfig>;
    /**
     * Clear cached configuration (useful for testing)
     */
    clearCache(): void;
}
//# sourceMappingURL=cli.d.ts.map