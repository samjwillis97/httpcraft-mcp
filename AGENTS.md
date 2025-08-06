# HTTPCraft MCP - AI Agent Development Guide

## Project Overview

You are working on **HTTPCraft MCP**, a Model Context Protocol (MCP) server that enables AI agents to perform sophisticated HTTP API testing and automation through HTTPCraft CLI. This project acts as a thin wrapper around HTTPCraft, providing standardized access to its advanced features like variable resolution, request chaining, authentication flows, and plugin architecture.

## Core Architecture

- **Language**: TypeScript with strict mode enabled
- **Runtime**: Node.js v18+
- **Package Management**: Nix flakes for reproducible development environment
- **Framework**: MCP SDK (@modelcontextprotocol/sdk)
- **Validation**: Zod schemas for all inputs/outputs
- **Testing**: Jest with comprehensive coverage
- **Build**: Standard TypeScript compiler

## Development Workflow

### Nix Development Environment
This project uses **Nix flakes** for reproducible development environments. All system dependencies (Node.js, HTTPCraft CLI, etc.) are managed through Nix.

**Setup**:
1. Install Nix with flakes enabled
2. Install direnv: `nix profile install nixpkgs#direnv`
3. Add direnv hook to your shell
4. Create `.envrc` with `use flake .` in project root
5. Run `direnv allow` to activate the environment

**Adding Dependencies**:
- **System packages**: Add to `devShell.nativeBuildInputs` in `flake.nix`
- **Node.js packages**: Add to `package.json` as usual
- **Development tools**: Add to `devShell.packages` in `flake.nix`

### Follow the Phased Implementation Plan (PIP.md)
Always refer to the PIP.md for the current development phase and tasks. Each phase has specific deliverables and test criteria that must be met before proceeding.

### Project Structure
```
src/
├── server.ts              # MCP server entry point
├── tools/                 # MCP tool implementations
│   ├── base.ts           # Base tool class
│   ├── execute-api.ts    # API execution tool
│   ├── execute-request.ts # Standalone request tool
│   ├── execute-chain.ts  # Chain execution tool
│   └── discovery.ts      # Discovery tools
├── httpcraft/            # HTTPCraft CLI integration
│   ├── cli.ts           # CLI execution wrapper
│   ├── config.ts        # Configuration discovery
│   └── parser.ts        # Response parsing
├── types/               # TypeScript type definitions
├── schemas/             # Zod validation schemas
├── utils/               # Shared utilities
└── config/              # Configuration management
```

## Code Style Guidelines

### TypeScript Standards
- **Strict Mode**: Always use TypeScript strict mode
- **Explicit Types**: Prefer explicit types over `any`
- **Interfaces**: Use interfaces for object shapes, types for unions
- **Enums**: Use const assertions over enums where possible
- **Error Handling**: Use Result<T, E> pattern for error handling

```typescript
// Good: Explicit return type and error handling
async function executeHttpCraft(args: string[]): Promise<Result<HttpCraftOutput, HttpCraftError>> {
  try {
    const result = await spawn('httpcraft', args);
    return { success: true, data: parseOutput(result.stdout) };
  } catch (error) {
    return { success: false, error: new HttpCraftError(error.message) };
  }
}

// Avoid: Implicit any and unclear error handling
async function executeHttpCraft(args) {
  const result = await spawn('httpcraft', args);
  return parseOutput(result.stdout);
}
```

### Naming Conventions
- **Files**: kebab-case (`execute-api.ts`, `http-client.ts`)
- **Classes**: PascalCase (`HttpCraftTool`, `ResponseParser`)
- **Functions/Variables**: camelCase (`executeApi`, `configPath`)
- **Constants**: SCREAMING_SNAKE_CASE (`DEFAULT_TIMEOUT`, `MAX_RETRIES`)
- **Types/Interfaces**: PascalCase (`ApiResponse`, `ToolSchema`)

### Import Organization
```typescript
// 1. Node.js built-ins
import { spawn } from 'child_process';
import { readFile } from 'fs/promises';

// 2. External dependencies
import { z } from 'zod';
import { Tool } from '@modelcontextprotocol/sdk';

// 3. Internal imports (absolute paths)
import { HttpCraftCli } from '../httpcraft/cli.js';
import { ApiResponse } from '../types/responses.js';

// 4. Type-only imports
import type { ToolSchema } from '../types/tools.js';
```

## MCP Tool Development

### Tool Implementation Pattern
Every MCP tool should follow this pattern:

```typescript
export class ExecuteApiTool extends BaseTool {
  name = 'httpcraft_execute_api';
  description = 'Execute a configured API endpoint using HTTPCraft';
  
  inputSchema = z.object({
    api: z.string().describe('API name from configuration'),
    endpoint: z.string().describe('Endpoint name'),
    profile: z.string().describe('Profile to use'),
    environment: z.string().optional().describe('Optional environment'),
    variables: z.record(z.any()).optional().describe('Variable overrides'),
    configPath: z.string().optional().describe('Optional config path')
  });

  async execute(params: z.infer<typeof this.inputSchema>): Promise<ToolResult> {
    // 1. Validate parameters
    const validated = this.inputSchema.parse(params);
    
    // 2. Execute HTTPCraft command
    const result = await this.httpcraft.executeApi(validated);
    
    // 3. Parse and return response
    return this.formatResponse(result);
  }
}
```

### Error Handling Standards
- **Validation Errors**: Use Zod for input validation
- **HTTPCraft Errors**: Preserve original error context
- **System Errors**: Handle process failures gracefully
- **Timeout Handling**: Implement reasonable timeouts

```typescript
// Good: Comprehensive error handling
async function executeWithTimeout<T>(
  operation: () => Promise<T>,
  timeout: number = 30000
): Promise<Result<T, Error>> {
  try {
    const result = await Promise.race([
      operation(),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Operation timeout')), timeout)
      )
    ]);
    return { success: true, data: result };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
}
```

## HTTPCraft Integration Guidelines

### CLI Execution Principles
- **Process Isolation**: Each HTTPCraft command runs in a separate process
- **Working Directory**: Execute from the agent's working directory
- **Environment Variables**: Respect HTTPCraft's environment configuration
- **Error Preservation**: Return full error context from HTTPCraft

### Configuration Discovery
```typescript
// HTTPCraft executable discovery order:
// 1. HTTPCRAFT_PATH environment variable
// 2. System PATH lookup
// 3. Common installation locations
// 4. Explicit configuration

async function discoverHttpCraft(): Promise<string> {
  // Check environment variable first
  if (process.env.HTTPCRAFT_PATH) {
    return process.env.HTTPCRAFT_PATH;
  }
  
  // Check system PATH
  const pathResult = await which('httpcraft');
  if (pathResult) return pathResult;
  
  // Check common locations
  const commonPaths = ['/usr/local/bin/httpcraft', '/opt/homebrew/bin/httpcraft'];
  for (const path of commonPaths) {
    if (await fileExists(path)) return path;
  }
  
  throw new Error('HTTPCraft executable not found');
}
```

### Response Parsing Standards
- **JSON Detection**: Auto-detect and parse JSON responses
- **Metadata Extraction**: Capture status codes, headers, timing
- **Error Context**: Preserve error details from HTTPCraft output
- **Type Safety**: Use Zod schemas for response validation

## Testing Standards

### Test Structure
```typescript
describe('ExecuteApiTool', () => {
  let tool: ExecuteApiTool;
  let mockHttpCraft: jest.Mocked<HttpCraftCli>;

  beforeEach(() => {
    mockHttpCraft = createMockHttpCraft();
    tool = new ExecuteApiTool(mockHttpCraft);
  });

  describe('execute', () => {
    it('should execute API endpoint successfully', async () => {
      // Arrange
      const params = { api: 'test-api', endpoint: 'users', profile: 'dev' };
      mockHttpCraft.executeApi.mockResolvedValue(mockSuccessResponse);

      // Act
      const result = await tool.execute(params);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(expectedData);
      expect(mockHttpCraft.executeApi).toHaveBeenCalledWith(params);
    });

    it('should handle HTTPCraft errors gracefully', async () => {
      // Test error scenarios
    });

    it('should validate input parameters', async () => {
      // Test parameter validation
    });
  });
});
```

### Testing Categories
- **Unit Tests**: Individual functions and classes
- **Integration Tests**: HTTPCraft CLI integration
- **End-to-End Tests**: Full MCP protocol workflow
- **Performance Tests**: Timeout and concurrency handling

### Mock Strategies
- **HTTPCraft CLI**: Mock the CLI wrapper, not the actual process
- **File System**: Mock configuration file access
- **Network**: Use real HTTP endpoints for integration tests
- **Timeouts**: Test timeout scenarios with controlled delays

## Git and Commit Standards

### Commit Message Format
```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`
**Scopes**: `tools`, `httpcraft`, `config`, `types`, `tests`

Examples:
- `feat(tools): add httpcraft_execute_api tool`
- `fix(httpcraft): handle missing executable gracefully`
- `test(tools): add comprehensive error handling tests`

### Pre-commit Workflow
Before committing, ensure:
1. `npm run build` - TypeScript compilation succeeds
2. `npm run lint` - ESLint passes
3. `npm run test` - All tests pass
4. `npm run type-check` - TypeScript type checking passes

## Performance Guidelines

### Execution Timeouts
- **Default Timeout**: 30 seconds for HTTPCraft commands
- **Configurable**: Allow timeout configuration per tool
- **Graceful Degradation**: Handle timeouts without crashing

### Memory Management
- **Process Cleanup**: Ensure child processes are properly terminated
- **Response Limits**: Set reasonable limits on response size
- **Caching**: Cache configuration discovery results

### Concurrency
- **Async/Await**: Use async/await consistently
- **Promise Handling**: Handle concurrent requests appropriately
- **Resource Limits**: Prevent resource exhaustion

## Security Considerations

### Input Validation
- **Zod Schemas**: Validate all inputs with Zod
- **Path Traversal**: Prevent directory traversal in config paths
- **Command Injection**: Sanitize all CLI arguments

### Sensitive Data
- **No Logging**: Never log authentication credentials
- **Environment Variables**: Respect HTTPCraft's credential management
- **Error Context**: Sanitize error messages for sensitive data

## Development Commands

### Available Scripts
```bash
# Development
npm run dev          # Start development server
npm run build        # Build TypeScript
npm run watch        # Watch mode compilation

# Quality Assurance
npm run lint         # ESLint
npm run lint:fix     # Auto-fix linting issues
npm run type-check   # TypeScript type checking
npm run test         # Run all tests
npm run test:watch   # Watch mode testing
npm run test:coverage # Coverage report

# Utilities
npm run clean        # Clean build artifacts
npm run format       # Prettier formatting
```

### Environment Setup
```bash
# Nix-based setup (recommended)
# Install Nix with flakes support, then:
echo "use flake ." > .envrc
direnv allow  # This will install all dependencies via Nix

# Manual setup (if not using Nix)
npm install

# Set up HTTPCraft for testing
export HTTPCRAFT_PATH=/path/to/httpcraft

# Run in development mode
npm run dev
```

## Integration Testing

### HTTPCraft Configuration
Create test configurations for integration testing:

```yaml
# test-config.yaml
apis:
  test-api:
    base_url: "https://httpbin.org"
    endpoints:
      users:
        path: "/json"
        method: GET
      create_user:
        path: "/post"
        method: POST

profiles:
  dev:
    timeout: 30
  prod:
    timeout: 60
```

### Test Environment
- Use HTTPBin (httpbin.org) for HTTP testing
- Mock HTTPCraft CLI for unit tests
- Use real HTTPCraft for integration tests
- Provide sample configurations in `test/fixtures/`

## Debugging Guidelines

### Logging Strategy
```typescript
import { logger } from '../utils/logger.js';

// Log HTTPCraft command execution
logger.debug('Executing HTTPCraft command', { args, workingDir });

// Log parsing results
logger.info('Parsed HTTPCraft response', { statusCode, contentType });

// Log errors with context
logger.error('HTTPCraft execution failed', { error: error.message, args });
```

### Error Diagnosis
1. **Check HTTPCraft Installation**: Verify executable is found
2. **Validate Configuration**: Ensure HTTPCraft configs are valid
3. **Examine Process Output**: Check both stdout and stderr
4. **Review Working Directory**: Ensure correct execution context

## Documentation Standards

### Code Documentation
- **TSDoc Comments**: Use TSDoc for all public APIs
- **Example Usage**: Include usage examples in comments
- **Parameter Descriptions**: Document all parameters clearly

```typescript
/**
 * Executes an HTTPCraft API endpoint with the specified profile.
 * 
 * @param params - The API execution parameters
 * @param params.api - The API name from HTTPCraft configuration
 * @param params.endpoint - The endpoint name to execute
 * @param params.profile - The profile to use for execution
 * @returns Promise that resolves to the API response
 * 
 * @example
 * ```typescript
 * const result = await executeApi({
 *   api: 'github',
 *   endpoint: 'users',
 *   profile: 'production'
 * });
 * ```
 */
async function executeApi(params: ApiParams): Promise<ApiResponse> {
  // Implementation
}
```

### README Updates
Keep the README current with:
- Installation instructions
- Basic usage examples
- Configuration requirements
- Troubleshooting guide

## Common Patterns

### Result Type Pattern
```typescript
type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };

// Usage
async function riskyOperation(): Promise<Result<string>> {
  try {
    const result = await doSomething();
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error as Error };
  }
}
```

### Configuration Pattern
```typescript
interface ToolConfig {
  timeout: number;
  maxRetries: number;
  httpCraftPath?: string;
}

const defaultConfig: ToolConfig = {
  timeout: 30000,
  maxRetries: 3
};

function createTool(config: Partial<ToolConfig> = {}): Tool {
  const mergedConfig = { ...defaultConfig, ...config };
  return new Tool(mergedConfig);
}
```

---

## Quick Reference

### Key Files to Know
- `PRD.md` - Product requirements and scope
- `PIP.md` - Implementation phases and tasks
- `flake.nix` - Nix development environment configuration
- `.envrc` - Direnv configuration for automatic environment loading
- `src/server.ts` - MCP server entry point
- `src/tools/` - All MCP tool implementations
- `src/httpcraft/cli.ts` - HTTPCraft integration

### Development Priorities
1. **Follow PIP.md phases** - Don't skip ahead
2. **Test-driven development** - Write tests first
3. **Error handling** - Handle all failure scenarios
4. **Type safety** - Use TypeScript strictly
5. **Documentation** - Keep docs current

### When Stuck
1. Check the PIP.md for current phase requirements
2. Review the PRD.md for context and scope
3. Look at similar patterns in the codebase
4. Write a test case to clarify the requirement
5. Ask for clarification if requirements are unclear

Remember: This project is a **thin wrapper** around HTTPCraft CLI. Don't reimplement HTTPCraft functionality - delegate to the CLI and focus on providing a clean MCP interface.
