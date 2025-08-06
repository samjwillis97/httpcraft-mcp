/**
 * Process management utilities for HTTPCraft MCP
 */
import type { AsyncResult } from '../types/index.js';
export interface ProcessResult {
    readonly stdout: string;
    readonly stderr: string;
    readonly exitCode: number;
    readonly signal?: NodeJS.Signals | undefined;
    readonly duration: number;
}
export interface ProcessOptions {
    readonly cwd?: string;
    readonly env?: Record<string, string>;
    readonly timeout?: number;
    readonly maxBuffer?: number;
}
export declare function executeCommand(command: string, args: readonly string[], options?: ProcessOptions): AsyncResult<ProcessResult>;
export declare function checkExecutableExists(path: string): Promise<boolean>;
export declare function findExecutableInPath(name: string): Promise<string | null>;
//# sourceMappingURL=process.d.ts.map