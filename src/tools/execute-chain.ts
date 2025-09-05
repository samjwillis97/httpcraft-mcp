/**
 * Execute Chain Tool
 * Executes HTTPCraft request chains with variable passing and error handling
 */

import { BaseTool, type ToolExecutionContext } from './base.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import {
  ExecuteChainSchema,
  type ExecuteChainParams,
  type ChainResponse,
  type ChainStep,
} from '../schemas/tools.js';
import {
  formatChainResponse,
  formatHttpCraftError,
  extractHttpCraftError,
} from '../utils/response.js';
import { logger } from '../utils/logger.js';
import type { HttpCraftCli } from '../httpcraft/cli.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type HttpCraftExecuteResult = any;

export class ExecuteChainTool extends BaseTool {
  public readonly name = 'httpcraft_execute_chain';
  public readonly description = `Execute a request chain using HTTPCraft with variable passing between steps.

Chains enable complex multi-step workflows where requests depend on previous responses. Perfect for authentication flows, multi-step API operations, and testing complete user journeys that require sequential API calls.

Chain capabilities:
- Sequential request execution with automatic variable extraction
- Pass data between requests (auth tokens, IDs, computed values)
- Handle dependent API calls automatically
- Aggregate results from multiple requests
- Optional parallel execution for independent steps
- Fail-fast or continue-on-error execution modes

Common workflow patterns:
- Authentication flow: login → get token → use token for API calls
- Resource creation: create resource → get ID → perform operations on resource
- Data pipeline: fetch data → transform → POST to another service
- Integration testing: setup → execute tests → cleanup

Chain configuration:
- Chains are defined in HTTPCraft configuration files
- Each step can reference variables from previous steps
- Variable extraction uses JSONPath or custom extractors
- Error handling can be configured per step or globally

Performance considerations:
- Chain execution typically takes longer than single requests
- Use timeout parameter for complex chains (default: 60 seconds)
- Consider parallel execution for independent operations
- Use stopOnFailure=true to halt on first error for fail-fast behavior

Use httpcraft_list_chains to discover available chains, or httpcraft_describe_chain for detailed chain configuration.`;
  public readonly inputSchema = ExecuteChainSchema;

  constructor(httpcraft: HttpCraftCli) {
    super(httpcraft);
  }

  protected async executeInternal(
    params: ExecuteChainParams,
    context: ToolExecutionContext
  ): Promise<CallToolResult> {
    logger.debug('Executing request chain', {
      chain: params.chain,
      profile: params.profile,
      hasVariables: !!params.variables && Object.keys(params.variables).length > 0,
      requestId: context.requestId,
    });

    const startTime = Date.now();

    // Build HTTPCraft command arguments
    const args = this.buildCommandArgs(params);

    // Execute HTTPCraft chain command
    const result = await this.httpcraft.execute(args, {
      timeout: params.timeout || context.timeout || 60000, // Chains typically take longer
    });

    if (!result.success) {
      logger.error('HTTPCraft CLI execution failed', {
        error: result.error?.message,
        requestId: context.requestId,
      });

      return formatHttpCraftError(result.error?.message || 'Unknown error', -1, undefined, args);
    }

    const httpcraftResult = result.data;

    // Handle HTTPCraft command failure
    if (!httpcraftResult.success) {
      const errorMessage = extractHttpCraftError(httpcraftResult.stderr);
      logger.error('HTTPCraft chain command failed', {
        exitCode: httpcraftResult.exitCode,
        stderr: httpcraftResult.stderr,
        requestId: context.requestId,
      });

      return formatHttpCraftError(
        errorMessage,
        httpcraftResult.exitCode,
        httpcraftResult.stderr,
        args
      );
    }

    // Parse and format the chain response
    try {
      return await this.parseAndFormatChainResponse(httpcraftResult, context, startTime);
    } catch (parseError) {
      logger.error('Failed to parse HTTPCraft chain output', {
        error: (parseError as Error).message,
        stdout: httpcraftResult.stdout,
        requestId: context.requestId,
      });

      return this.formatError(
        new Error(`Failed to parse HTTPCraft chain response: ${(parseError as Error).message}`)
      );
    }
  }

  /**
   * Build HTTPCraft command arguments for chain execution
   */
  private buildCommandArgs(params: ExecuteChainParams): string[] {
    const args: string[] = ['chain', 'exec'];

    // Chain name
    args.push(params.chain);

    // Profile
    if (params.profile) {
      args.push('--profile', params.profile);
    }

    // Environment (if specified)
    if (params.environment) {
      args.push('--env', params.environment);
    }

    // Variables (if specified)
    if (params.variables && Object.keys(params.variables).length > 0) {
      for (const [key, value] of Object.entries(params.variables)) {
        args.push('--var', `${key}=${String(value)}`);
      }
    }

    // Config path (if specified)
    if (params.configPath) {
      args.push('--config', params.configPath);
    }

    // Stop on first failure (if specified)
    if (params.stopOnFailure === true) {
      args.push('--stop-on-failure');
    }

    // Parallel execution (if specified)
    if (params.parallel === true) {
      args.push('--parallel');
    }

    // Request JSON output for easier parsing
    args.push('--json');

    return args;
  }

  /**
   * Parse and format the chain response using the enhanced parser
   */
  private async parseAndFormatChainResponse(
    httpcraftResult: HttpCraftExecuteResult,
    context: ToolExecutionContext,
    startTime: number
  ): Promise<CallToolResult> {
    const { ResponseParser } = await import('../httpcraft/parser.js');
    const parser = new ResponseParser();

    const parseResult = await parser.parseHttpCraftOutput(httpcraftResult.stdout);

    if (!parseResult.success) {
      logger.error('Failed to parse HTTPCraft chain output', {
        error: parseResult.error?.message,
        requestId: context.requestId,
      });

      return this.formatError(
        new Error(`Failed to parse HTTPCraft chain response: ${parseResult.error?.message}`)
      );
    }

    const rawResponse = parseResult.data;

    // Transform raw response into ChainResponse format
    const chainResponse = this.transformToChainResponse(rawResponse, startTime);

    // Validate the parsed response
    const validation = this.validateChainResponse(chainResponse);
    if (!validation.valid) {
      logger.warn('HTTPCraft chain response validation failed', {
        errors: validation.errors,
        requestId: context.requestId,
      });
    }

    logger.debug('Chain execution completed', {
      success: chainResponse.success,
      totalSteps: chainResponse.steps.length,
      successfulSteps: chainResponse.steps.filter(s => s.success).length,
      failedStep: chainResponse.failedStep,
      totalDuration: chainResponse.totalDuration,
      requestId: context.requestId,
    });

    return formatChainResponse(chainResponse);
  }

  /**
   * Transform raw HTTPCraft output into ChainResponse format
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private transformToChainResponse(rawResponse: any, startTime: number): ChainResponse {
    const totalDuration = Date.now() - startTime;

    // Handle different possible response formats from HTTPCraft
    if (rawResponse.steps && Array.isArray(rawResponse.steps)) {
      // Direct chain response format
      return {
        success: rawResponse.success ?? true,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        steps: rawResponse.steps.map((step: any, index: number) => this.transformStep(step, index)),
        failedStep: rawResponse.failedStep,
        totalDuration: rawResponse.totalDuration ?? totalDuration,
      };
    } else if (rawResponse.chain) {
      // Nested chain format
      return this.transformToChainResponse(rawResponse.chain, startTime);
    } else {
      // Single step response - convert to chain format
      const step: ChainStep = {
        name: 'single-request',
        success: rawResponse.success ?? true,
        response: rawResponse,
        error: rawResponse.error,
      };

      return {
        success: step.success,
        steps: [step],
        failedStep: step.success ? undefined : 0,
        totalDuration,
      };
    }
  }

  /**
   * Transform a single step response
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private transformStep(stepData: any, index: number): ChainStep {
    return {
      name: stepData.name || `step-${index + 1}`,
      success: stepData.success ?? (stepData.statusCode ? stepData.statusCode < 400 : true),
      response: stepData.response || stepData,
      error: stepData.error,
    };
  }

  /**
   * Validate the chain response structure
   */
  private validateChainResponse(response: ChainResponse): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check required fields
    if (!Array.isArray(response.steps)) {
      errors.push('Steps must be an array');
      // Early return if steps is not an array to avoid forEach error
      return { valid: false, errors };
    }

    if (typeof response.success !== 'boolean') {
      errors.push('Success must be a boolean');
    }

    if (typeof response.totalDuration !== 'number' || response.totalDuration < 0) {
      errors.push('Total duration must be a non-negative number');
    }

    // Validate each step
    response.steps.forEach((step, index) => {
      if (!step.name) {
        errors.push(`Step ${index} missing name`);
      }

      if (typeof step.success !== 'boolean') {
        errors.push(`Step ${index} success must be boolean`);
      }

      if (!step.success && !step.error) {
        errors.push(`Failed step ${index} should have error message`);
      }
    });

    // Check failedStep consistency
    if (response.failedStep !== undefined) {
      if (response.failedStep < 0 || response.failedStep >= response.steps.length) {
        errors.push('Failed step index out of range');
      }

      if (response.steps[response.failedStep]?.success) {
        errors.push('Failed step index points to successful step');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
