/**
 * HTTPCraft configuration discovery and management
 */
import type { AsyncResult } from '../types/index.js';
export interface HttpCraftConfig {
    readonly executablePath: string;
    readonly configPaths: readonly string[];
    readonly version?: string;
}
export declare class ConfigDiscovery {
    private cachedConfig?;
    /**
     * Discover HTTPCraft executable following the priority order:
     * 1. HTTPCRAFT_PATH environment variable
     * 2. System PATH lookup
     * 3. Common installation locations
     */
    discoverExecutable(): AsyncResult<string>;
    /**
     * Discover HTTPCraft configuration files in common locations
     */
    discoverConfigPaths(): AsyncResult<readonly string[]>;
    /**
     * Get full HTTPCraft configuration
     */
    getConfig(): AsyncResult<HttpCraftConfig>;
    /**
     * Clear cached configuration (useful for testing)
     */
    clearCache(): void;
}
//# sourceMappingURL=config.d.ts.map