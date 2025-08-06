/**
 * HTTPCraft CLI execution wrapper
 */
import { logger } from '../utils/logger.js';
import { executeCommand } from '../utils/process.js';
import { ConfigDiscovery } from './config.js';
export class HttpCraftCli {
    configDiscovery;
    config;
    constructor() {
        this.configDiscovery = new ConfigDiscovery();
    }
    /**
     * Execute HTTPCraft command with the given arguments
     */
    async execute(args, options = {}) {
        logger.debug('Executing HTTPCraft command', {
            args: args.join(' '),
            options,
        });
        // Ensure we have HTTPCraft configuration
        if (!this.config) {
            const configResult = await this.configDiscovery.getConfig();
            if (!configResult.success) {
                return {
                    success: false,
                    error: new Error(`Failed to discover HTTPCraft: ${configResult.error?.message}`),
                };
            }
            this.config = configResult.data;
        }
        const processResult = await executeCommand(this.config.executablePath, args, {
            cwd: options.cwd ?? process.cwd(),
            timeout: options.timeout ?? 30000,
            env: options.env,
        });
        if (!processResult.success) {
            return {
                success: false,
                error: processResult.error,
            };
        }
        const result = {
            stdout: processResult.data.stdout,
            stderr: processResult.data.stderr,
            exitCode: processResult.data.exitCode,
            duration: processResult.data.duration,
            success: processResult.data.exitCode === 0,
        };
        logger.debug('HTTPCraft command completed', {
            exitCode: result.exitCode,
            duration: result.duration,
            success: result.success,
            stdoutLength: result.stdout.length,
            stderrLength: result.stderr.length,
        });
        return { success: true, data: result };
    }
    /**
     * Get HTTPCraft version
     */
    async getVersion() {
        logger.debug('Getting HTTPCraft version');
        const result = await this.execute(['--version']);
        if (!result.success) {
            return {
                success: false,
                error: new Error(`Failed to get HTTPCraft version: ${result.error?.message}`),
            };
        }
        const version = result.data.stdout.trim();
        logger.info('HTTPCraft version retrieved', { version });
        return { success: true, data: version };
    }
    /**
     * Check if HTTPCraft is available and working
     */
    async isAvailable() {
        try {
            const versionResult = await this.getVersion();
            return versionResult.success;
        }
        catch (error) {
            logger.warn('HTTPCraft availability check failed', {}, error);
            return false;
        }
    }
    /**
     * Execute HTTPCraft with JSON output parsing
     */
    async executeWithJsonOutput(args, options = {}) {
        const result = await this.execute(args, options);
        if (!result.success) {
            return result;
        }
        if (result.data.exitCode !== 0) {
            return {
                success: false,
                error: new Error(`HTTPCraft command failed: ${result.data.stderr || result.data.stdout}`),
            };
        }
        try {
            const parsedData = JSON.parse(result.data.stdout);
            return { success: true, data: parsedData };
        }
        catch (parseError) {
            logger.error('Failed to parse HTTPCraft JSON output', {
                stdout: result.data.stdout,
                stderr: result.data.stderr,
            });
            return {
                success: false,
                error: new Error(`Failed to parse HTTPCraft JSON output: ${parseError.message}`),
            };
        }
    }
    /**
     * Get current HTTPCraft configuration
     */
    async getConfig() {
        return this.configDiscovery.getConfig();
    }
    /**
     * Clear cached configuration (useful for testing)
     */
    clearCache() {
        this.config = undefined;
        this.configDiscovery.clearCache();
    }
}
//# sourceMappingURL=cli.js.map