/**
 * Zod Validation Schemas for HTTPCraft MCP Tools
 */

import { z } from 'zod';

/**
 * Common schemas used across tools
 */

// HTTP methods
export const HttpMethodSchema = z.enum([
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'HEAD',
  'OPTIONS',
]);

// URL validation
export const UrlSchema = z.string().url('Must be a valid URL');

// Headers validation
export const HeadersSchema = z
  .record(z.string())
  .optional()
  .describe(
    'HTTP headers as key-value pairs. Common headers: Content-Type, Authorization, Accept, User-Agent, X-API-Key'
  );

// Config path validation
export const ConfigPathSchema = z
  .string()
  .optional()
  .describe(
    'Optional path to HTTPCraft configuration file. If not specified, HTTPCraft uses its default configuration discovery (looks for .httpcraft.yml, httpcraft.yml, etc.)'
  );

// Environment variables
export const VariablesSchema = z
  .record(z.string(), z.unknown())
  .optional()
  .describe(
    'Variable overrides as key-value pairs. Variables can be referenced in URLs, headers, and body using HTTPCraft templating syntax. These override variables defined in configuration files'
  );

/**
 * Schema for httpcraft_execute_api tool
 */
export const ExecuteApiSchema = z.object({
  api: z
    .string()
    .min(1, 'API name cannot be empty')
    .describe(
      'API name from HTTPCraft configuration. Use httpcraft_list_apis to discover available APIs.'
    ),

  endpoint: z
    .string()
    .min(1, 'Endpoint name cannot be empty')
    .describe(
      'Endpoint name to execute. Use httpcraft_list_endpoints to see available endpoints for the API.'
    ),

  profile: z
    .string()
    .min(1, 'Profile name cannot be empty')
    .describe(
      'Profile to use for execution. Profiles contain authentication, environment settings, and variables. Use httpcraft_list_profiles to see available profiles.'
    ),

  environment: z
    .string()
    .optional()
    .describe(
      'Optional environment override for multi-stage deployments (dev, staging, prod). Overrides profile-specific environment settings.'
    ),

  variables: VariablesSchema.describe(
    'Variable overrides as key-value pairs. These override variables defined in profiles, APIs, or endpoints. Use for dynamic values like user IDs, tokens, or test data.'
  ),

  configPath: ConfigPathSchema.describe(
    "Optional path to HTTPCraft configuration file. If not specified, uses HTTPCraft's default configuration discovery."
  ),

  timeout: z
    .number()
    .positive()
    .optional()
    .describe(
      'Request timeout in milliseconds. Overrides profile timeout settings. Default: 30000ms (30 seconds).'
    ),
});

/**
 * Schema for httpcraft_execute_request tool
 */
export const ExecuteRequestSchema = z.object({
  method: HttpMethodSchema.describe(
    'HTTP method to use (GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS)'
  ),

  url: UrlSchema.describe(
    'Target URL for the request. Must be a complete, valid URL including protocol (http:// or https://)'
  ),

  headers: HeadersSchema.describe(
    'HTTP headers as key-value pairs. Common headers: Content-Type, Authorization, Accept, User-Agent'
  ),

  body: z
    .string()
    .optional()
    .describe(
      'Request body content for POST, PUT, PATCH methods. Can be JSON, XML, form data, or plain text depending on Content-Type header'
    ),

  profile: z
    .string()
    .optional()
    .describe(
      'Optional profile to use for authentication and default settings. Provides authentication credentials and default headers from HTTPCraft configuration'
    ),

  variables: VariablesSchema.describe(
    'Variable overrides as key-value pairs for dynamic request parameters. Variables can be referenced in URL, headers, or body using HTTPCraft templating'
  ),

  configPath: ConfigPathSchema.describe(
    'Optional path to HTTPCraft configuration file. Required if using profiles or variables'
  ),

  timeout: z
    .number()
    .positive()
    .optional()
    .describe('Request timeout in milliseconds. Default: 30000ms (30 seconds)'),

  followRedirects: z
    .boolean()
    .optional()
    .describe('Whether to automatically follow HTTP redirects (3xx status codes). Default: true'),

  maxRedirects: z
    .number()
    .nonnegative()
    .optional()
    .describe(
      'Maximum number of redirects to follow. Default: 5. Only applies when followRedirects is true'
    ),
});

/**
 * Schema for httpcraft_execute_chain tool
 */
export const ExecuteChainSchema = z.object({
  chain: z
    .string()
    .min(1, 'Chain name cannot be empty')
    .describe(
      'Name of the request chain to execute. Chains are defined in HTTPCraft configuration and contain sequential API calls with variable passing'
    ),

  profile: z
    .string()
    .optional()
    .describe(
      'Optional profile to use for the entire chain. Provides authentication and environment settings for all chain steps'
    ),

  environment: z
    .string()
    .optional()
    .describe('Optional environment override for the chain execution (dev, staging, prod)'),

  variables: VariablesSchema.describe(
    'Initial variables for the chain execution. These are available to all steps and can be overridden by step-specific variables or extracted values'
  ),

  configPath: ConfigPathSchema.describe(
    'Optional path to HTTPCraft configuration file containing the chain definition'
  ),

  timeout: z
    .number()
    .positive()
    .optional()
    .describe(
      'Total timeout for the entire chain execution in milliseconds. Default: 60000ms (60 seconds). Should be longer than single request timeouts'
    ),

  stopOnFailure: z
    .boolean()
    .optional()
    .describe(
      'Whether to stop chain execution on the first failed step. Default: true. Set to false to continue executing remaining steps even after failures'
    ),

  parallel: z
    .boolean()
    .optional()
    .describe(
      'Whether to execute independent chain steps in parallel where possible. Default: false. Improves performance for chains with independent operations'
    ),
});

/**
 * Schema for discovery tools
 */
export const ListApisSchema = z.object({
  configPath: ConfigPathSchema.describe(
    "Optional path to HTTPCraft configuration file. If not specified, uses HTTPCraft's default configuration discovery"
  ),
});

export const ListEndpointsSchema = z.object({
  api: z
    .string()
    .min(1, 'API name cannot be empty')
    .describe(
      'API name to list endpoints for. Use httpcraft_list_apis to discover available API names'
    ),

  configPath: ConfigPathSchema.describe(
    'Optional path to HTTPCraft configuration file containing the API definition'
  ),
});

export const ListProfilesSchema = z.object({
  configPath: ConfigPathSchema.describe(
    'Optional path to HTTPCraft configuration file containing profile definitions'
  ),
});

export const ListVariablesSchema = z.object({
  configPath: ConfigPathSchema.describe('Optional path to HTTPCraft configuration file'),
  profiles: z
    .array(z.string())
    .optional()
    .describe(
      'Specific profiles to show variables for. Shows variables from all profiles if not specified'
    ),
  api: z
    .string()
    .optional()
    .describe('Specific API to show variables for. Shows API-level variables and inheritance'),
  endpoint: z
    .string()
    .optional()
    .describe(
      'Specific endpoint to show variables for. Requires api parameter. Shows endpoint-specific variables and full inheritance chain'
    ),
});

export const ListChainsSchema = z.object({
  configPath: ConfigPathSchema,
});

/**
 * Schemas for describe tools
 */
export const DescribeApiSchema = z.object({
  name: z
    .string()
    .min(1, 'API name cannot be empty')
    .describe('API name to describe. Use httpcraft_list_apis to discover available API names'),
  configPath: ConfigPathSchema.describe(
    'Optional path to HTTPCraft configuration file containing the API definition'
  ),
});

export const DescribeEndpointSchema = z.object({
  api: z.string().min(1, 'API name cannot be empty').describe('API name containing the endpoint'),
  endpoint: z
    .string()
    .min(1, 'Endpoint name cannot be empty')
    .describe(
      'Endpoint name to describe. Use httpcraft_list_endpoints to discover available endpoints for the API'
    ),
  configPath: ConfigPathSchema.describe('Optional path to HTTPCraft configuration file'),
});

export const DescribeProfileSchema = z.object({
  name: z
    .string()
    .min(1, 'Profile name cannot be empty')
    .describe(
      'Profile name to describe. Use httpcraft_list_profiles to discover available profile names'
    ),
  configPath: ConfigPathSchema.describe(
    'Optional path to HTTPCraft configuration file containing the profile definition'
  ),
});

/**
 * Schema for health check tool
 */
export const HealthCheckSchema = z.object({});

/**
 * Response schemas for type safety
 */

export const HttpCraftResponseSchema = z.object({
  success: z.boolean(),
  statusCode: z.number().optional(),
  statusText: z.string().optional(),
  headers: z.record(z.string()).optional(),
  data: z.unknown().optional(),
  error: z.string().optional(),
  isBinary: z.boolean().optional(),
  contentType: z.string().optional(),
  contentLength: z.number().optional(),
  timing: z
    .object({
      total: z.number(),
      dns: z.number().optional(),
      connect: z.number().optional(),
      ssl: z.number().optional(),
      send: z.number().optional(),
      wait: z.number().optional(),
      receive: z.number().optional(),
    })
    .optional(),
  meta: z
    .object({
      version: z.number().optional(),
      schemaReference: z.string().optional(),
      type: z.string().optional(),
    })
    .optional(),
});

export const ChainResponseSchema = z.object({
  success: z.boolean(),
  steps: z.array(
    z.object({
      name: z.string(),
      success: z.boolean(),
      response: HttpCraftResponseSchema.optional(),
      error: z.string().optional(),
    })
  ),
  failedStep: z.number().optional(),
  totalDuration: z.number(),
});

export const DiscoveryResponseSchema = z.object({
  success: z.boolean(),
  data: z.unknown(),
  error: z.string().optional(),
});

/**
 * Type exports for TypeScript
 */
export type HttpMethod = z.infer<typeof HttpMethodSchema>;
export type ExecuteApiParams = z.infer<typeof ExecuteApiSchema>;
export type ExecuteRequestParams = z.infer<typeof ExecuteRequestSchema>;
export type ExecuteChainParams = z.infer<typeof ExecuteChainSchema>;
export type ListApisParams = z.infer<typeof ListApisSchema>;
export type ListEndpointsParams = z.infer<typeof ListEndpointsSchema>;
export type ListProfilesParams = z.infer<typeof ListProfilesSchema>;
export type ListVariablesParams = z.infer<typeof ListVariablesSchema>;
export type ListChainsParams = z.infer<typeof ListChainsSchema>;
export type DescribeApiParams = z.infer<typeof DescribeApiSchema>;
export type DescribeEndpointParams = z.infer<typeof DescribeEndpointSchema>;
export type DescribeProfileParams = z.infer<typeof DescribeProfileSchema>;
export type HttpCraftResponse = z.infer<typeof HttpCraftResponseSchema>;
export type ChainResponse = z.infer<typeof ChainResponseSchema>;
export type ChainStep = ChainResponse['steps'][number];
export type DiscoveryResponse = z.infer<typeof DiscoveryResponseSchema>;
