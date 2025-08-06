/**
 * Simplified HTTPCraft CLI wrapper for Phase 1.3
 */

import { spawn } from 'child_process';
import { access, constants } from 'fs/promises';
import which from 'which';

export interface HttpCraftResult {
  readonly success: boolean;
  readonly stdout: string;
  readonly stderr: string;
  readonly exitCode: number;
}

export class HttpCraftCli {
  private executablePath?: string;

  /**
   * Discover HTTPCraft executable
   */
  private async discoverExecutable(): Promise<string | null> {
    // Check environment variable
    if (process.env.HTTPCRAFT_PATH) {
      try {
        await access(process.env.HTTPCRAFT_PATH, constants.F_OK | constants.X_OK);
        return process.env.HTTPCRAFT_PATH;
      } catch {
        // Continue to other methods
      }
    }

    // Check system PATH
    try {
      return await which('httpcraft');
    } catch {
      return null;
    }
  }

  /**
   * Execute HTTPCraft command
   */
  public async execute(args: string[]): Promise<HttpCraftResult> {
    if (!this.executablePath) {
      const discovered = await this.discoverExecutable();
      if (!discovered) {
        return {
          success: false,
          stdout: '',
          stderr: 'HTTPCraft executable not found',
          exitCode: -1,
        };
      }
      this.executablePath = discovered;
    }

    return new Promise(resolve => {
      const child = spawn(this.executablePath!, args, {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', chunk => {
        stdout += chunk.toString();
      });

      child.stderr?.on('data', chunk => {
        stderr += chunk.toString();
      });

      child.on('close', exitCode => {
        resolve({
          success: exitCode === 0,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          exitCode: exitCode ?? -1,
        });
      });

      child.on('error', error => {
        resolve({
          success: false,
          stdout: '',
          stderr: error.message,
          exitCode: -1,
        });
      });
    });
  }

  /**
   * Get HTTPCraft version
   */
  public async getVersion(): Promise<{ success: boolean; data?: string; error?: string }> {
    const result = await this.execute(['--version']);
    if (result.success) {
      return { success: true, data: result.stdout };
    } else {
      return { success: false, error: result.stderr || 'Failed to get version' };
    }
  }

  /**
   * Check if HTTPCraft is available
   */
  public async isAvailable(): Promise<boolean> {
    try {
      const versionResult = await this.getVersion();
      return versionResult.success;
    } catch {
      return false;
    }
  }
}
