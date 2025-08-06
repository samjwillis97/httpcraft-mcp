/**
 * Simplified HTTPCraft CLI wrapper for Phase 1.3
 */
export interface HttpCraftResult {
    readonly success: boolean;
    readonly stdout: string;
    readonly stderr: string;
    readonly exitCode: number;
}
export declare class HttpCraftCli {
    private executablePath?;
    /**
     * Discover HTTPCraft executable
     */
    private discoverExecutable;
    /**
     * Execute HTTPCraft command
     */
    execute(args: string[]): Promise<HttpCraftResult>;
    /**
     * Get HTTPCraft version
     */
    getVersion(): Promise<{
        success: boolean;
        data?: string;
        error?: string;
    }>;
    /**
     * Check if HTTPCraft is available
     */
    isAvailable(): Promise<boolean>;
}
//# sourceMappingURL=cli-simple.d.ts.map