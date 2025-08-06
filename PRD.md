# HTTPCraft MCP - Product Requirements Document

## Overview

HTTPCraft MCP is a Model Context Protocol (MCP) server that enables AI agents to perform sophisticated HTTP API testing and automation through HTTPCraft, a YAML-based HTTP client with advanced features like variable resolution, plugin architecture, request chaining, and authentication flows.

## Problem Statement

AI agents need the ability to:
- Test and interact with HTTP APIs programmatically
- Execute complex authentication flows and request chains
- Validate API responses and extract data
- Automate API workflows with variable resolution and caching
- Access enterprise APIs with sophisticated configuration management

Current solutions lack the advanced features HTTPCraft provides, such as plugin architecture, YAML-based configuration, variable interpolation, and built-in caching mechanisms.

## Solution

HTTPCraft MCP acts as a thin wrapper around the HTTPCraft CLI tool, providing AI agents with access to HTTPCraft's full feature set through the standardized MCP protocol. The solution leverages HTTPCraft's existing capabilities without duplicating functionality.

## Product Scope

### In Scope
- Wrapper interface to HTTPCraft CLI commands
- Execution of API endpoints with profiles and environments
- Standalone HTTP request execution
- Request chain execution for complex workflows
- Discovery of available APIs, endpoints, and profiles
- JSON response parsing and error handling
- Configuration path management and executable discovery

### Out of Scope
- HTTPCraft configuration file management
- Authentication credential storage or management
- Custom plugin development
- HTTPCraft installation or version management
- Direct HTTP client implementation
- State persistence (handled by HTTPCraft)

## Functional Requirements

### FR-1: API Endpoint Execution
**Description**: Execute configured API endpoints using HTTPCraft profiles
**Acceptance Criteria**:
- Accept API name, endpoint name, and profile parameters
- Support optional environment and variable overrides
- Return structured response data and metadata
- Handle HTTPCraft execution errors gracefully

### FR-2: Standalone Request Execution
**Description**: Execute standalone HTTP requests without predefined configurations
**Acceptance Criteria**:
- Accept HTTP method, URL, headers, and body parameters
- Support authentication and request options
- Return response data, status codes, and headers
- Validate request parameters before execution

### FR-3: Request Chain Execution
**Description**: Execute sequences of related HTTP requests
**Acceptance Criteria**:
- Accept chain configuration or reference
- Support variable passing between requests
- Return aggregated results from chain execution
- Handle partial failures in chain execution

### FR-4: Configuration Discovery
**Description**: Discover available HTTPCraft configurations
**Acceptance Criteria**:
- List available APIs from HTTPCraft configuration
- List endpoints for specific APIs
- List available profiles and environments
- Provide metadata about configuration options

### FR-5: Response Processing
**Description**: Parse and structure HTTPCraft responses
**Acceptance Criteria**:
- Parse JSON responses into structured data
- Extract response metadata (status, headers, timing)
- Handle non-JSON responses appropriately
- Preserve error context from HTTPCraft

## Technical Requirements

### TR-1: HTTPCraft Integration
- Integrate with HTTPCraft CLI as external process
- Support configurable HTTPCraft executable path
- Execute commands from agent's working directory
- Pass through all HTTPCraft command-line options

### TR-2: MCP Protocol Compliance
- Implement MCP server using official SDK
- Follow MCP tool specification standards
- Provide proper tool schemas and descriptions
- Handle MCP protocol errors and edge cases

### TR-3: Error Handling
- Capture and forward HTTPCraft error output
- Distinguish between MCP errors and HTTPCraft errors
- Provide meaningful error messages to agents
- Handle missing HTTPCraft installation gracefully

### TR-4: Performance
- Execute HTTPCraft commands asynchronously
- Support reasonable timeout configurations
- Minimize MCP server overhead
- Cache discovery results where appropriate

## Architecture

### High-Level Design
```
┌─────────────────┐    MCP Protocol    ┌─────────────────┐
│   AI Agent      │ ◄─────────────────► │  HTTPCraft MCP  │
│                 │                     │     Server      │
└─────────────────┘                     └─────────────────┘
                                                  │
                                         CLI Execution
                                                  │
                                                  ▼
                                        ┌─────────────────┐
                                        │   HTTPCraft     │
                                        │   CLI Tool      │
                                        └─────────────────┘
```

### Technology Stack
- **Runtime**: Node.js (v18+)
- **Language**: TypeScript
- **MCP SDK**: @modelcontextprotocol/sdk
- **Validation**: Zod schemas
- **Process Execution**: Node.js child_process
- **Testing**: Jest/Vitest

### Component Structure
```
src/
├── server.ts           # MCP server entry point
├── tools/             # MCP tool implementations
│   ├── execute-api.ts
│   ├── execute-request.ts
│   ├── execute-chain.ts
│   └── discovery.ts
├── httpcraft/         # HTTPCraft integration
│   ├── cli.ts         # CLI execution wrapper
│   ├── config.ts      # Configuration discovery
│   └── parser.ts      # Response parsing
├── types/             # TypeScript type definitions
└── utils/             # Shared utilities
```

## MVP Tool Specifications

### 1. httpcraft_execute_api
Execute a configured API endpoint with profile
```typescript
{
  api: string,           // API name from configuration
  endpoint: string,      // Endpoint name
  profile: string,       // Profile to use
  environment?: string,  // Optional environment
  variables?: object,    // Variable overrides
  configPath?: string    // Optional config path
}
```

### 2. httpcraft_execute_request
Execute a standalone HTTP request
```typescript
{
  method: string,        // HTTP method
  url: string,           // Request URL
  headers?: object,      // HTTP headers
  body?: string,         // Request body
  auth?: object,         // Authentication options
  options?: object       // Additional options
}
```

### 3. httpcraft_execute_chain
Execute a request chain
```typescript
{
  chain: string,         // Chain name or configuration
  variables?: object,    // Initial variables
  profile?: string,      // Profile to use
  configPath?: string    // Optional config path
}
```

### 4. httpcraft_list_apis
List available APIs
```typescript
{
  configPath?: string    // Optional config path
}
```

### 5. httpcraft_list_endpoints
List endpoints for an API
```typescript
{
  api: string,           // API name
  configPath?: string    // Optional config path
}
```

### 6. httpcraft_list_profiles
List available profiles
```typescript
{
  configPath?: string    // Optional config path
}
```

## Configuration

### HTTPCraft Discovery
1. Check `HTTPCRAFT_PATH` environment variable
2. Look for `httpcraft` on system PATH
3. Check common installation locations
4. Allow explicit path configuration

### Configuration Files
- Support HTTPCraft's default configuration discovery
- Allow override via `--config` parameter
- Respect HTTPCraft's environment-based configuration

## Success Metrics

### Technical Metrics
- Command execution latency < 5 seconds (95th percentile)
- Error rate < 5% for valid HTTPCraft configurations
- MCP protocol compliance score > 95%

### Functional Metrics
- Support for all common HTTPCraft use cases
- Successful integration with major AI agent platforms
- Positive developer feedback on API usability

## Risks and Mitigations

### Risk: HTTPCraft Not Installed
**Mitigation**: Provide clear error messages with installation instructions

### Risk: Configuration Compatibility
**Mitigation**: Extensive testing with various HTTPCraft configurations

### Risk: Performance Issues
**Mitigation**: Implement timeouts and async execution patterns

### Risk: Security Concerns
**Mitigation**: Validate all inputs, avoid exposing sensitive data in logs

## Implementation Timeline

### Phase 1: Core Infrastructure (Week 1)
- MCP server setup
- HTTPCraft CLI integration
- Basic error handling

### Phase 2: MVP Tools (Week 2)
- Implement execute_api and execute_request tools
- Response parsing and validation
- Basic testing suite

### Phase 3: Advanced Features (Week 3)
- Request chain execution
- Discovery tools
- Configuration management

### Phase 4: Polish and Testing (Week 4)
- Comprehensive error handling
- Performance optimization
- Documentation and examples

## Appendices

### A. HTTPCraft Command Reference
- `httpcraft <api> <endpoint> -p <profile>` - Execute API endpoint
- `httpcraft request <method> <url>` - Standalone request
- `httpcraft chain <chain>` - Execute request chain
- `httpcraft list apis` - List available APIs
- `httpcraft list endpoints <api>` - List API endpoints

### B. MCP Protocol References
- [MCP Specification](https://spec.modelcontextprotocol.io/)
- [MCP SDK Documentation](https://github.com/modelcontextprotocol/typescript-sdk)
- [Tool Implementation Patterns](https://modelcontextprotocol.io/docs/tools)