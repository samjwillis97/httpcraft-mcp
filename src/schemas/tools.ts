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
  .describe('HTTP headers as key-value pairs');

// Config path validation
export const ConfigPathSchema = z
  .string()
  .optional()
  .describe('Optional path to HTTPCraft configuration file');

// Environment variables
export const VariablesSchema = z
  .record(z.any())
  .optional()
  .describe('Variable overrides as key-value pairs');

/**
 * Schema for httpcraft_execute_api tool
 */
export const ExecuteApiSchema = z.object({
  api: z
    .string()
    .min(1, 'API name cannot be empty')
    .describe('API name from HTTPCraft configuration'),

  endpoint: z.string().min(1, 'Endpoint name cannot be empty').describe('Endpoint name to execute'),

  profile: z
    .string()
    .min(1, 'Profile name cannot be empty')
    .describe('Profile to use for execution'),

  environment: z.string().optional().describe('Optional environment override'),

  variables: VariablesSchema,

  configPath: ConfigPathSchema,

  timeout: z.number().positive().optional().describe('Request timeout in milliseconds'),
});

/**
 * Schema for httpcraft_execute_request tool
 */
export const ExecuteRequestSchema = z.object({
  method: HttpMethodSchema.describe('HTTP method to use'),

  url: UrlSchema.describe('Target URL for the request'),

  headers: HeadersSchema,

  body: z.string().optional().describe('Request body (for POST, PUT, PATCH methods)'),

  profile: z
    .string()
    .optional()
    .describe('Optional profile to use for authentication and settings'),

  variables: VariablesSchema,

  configPath: ConfigPathSchema,

  timeout: z.number().positive().optional().describe('Request timeout in milliseconds'),

  followRedirects: z.boolean().optional().describe('Whether to follow HTTP redirects'),

  maxRedirects: z
    .number()
    .nonnegative()
    .optional()
    .describe('Maximum number of redirects to follow'),
});

/**
 * Schema for httpcraft_execute_chain tool
 */
export const ExecuteChainSchema = z.object({
  chain: z
    .string()
    .min(1, 'Chain name cannot be empty')
    .describe('Name of the request chain to execute'),

  profile: z.string().optional().describe('Optional profile to use for the chain'),

  environment: z.string().optional().describe('Optional environment override'),

  variables: VariablesSchema,

  configPath: ConfigPathSchema,

  timeout: z
    .number()
    .positive()
    .optional()
    .describe('Total timeout for the entire chain in milliseconds'),

  stopOnFailure: z
    .boolean()
    .optional()
    .describe('Whether to stop chain execution on first failure'),

  parallel: z
    .boolean()
    .optional()
    .describe('Whether to execute chain steps in parallel where possible'),
});

/**
 * Schema for discovery tools
 */
export const ListApisSchema = z.object({
  configPath: ConfigPathSchema,
});

export const ListEndpointsSchema = z.object({
  api: z.string().min(1, 'API name cannot be empty').describe('API name to list endpoints for'),

  configPath: ConfigPathSchema,
});

export const ListProfilesSchema = z.object({
  configPath: ConfigPathSchema,
});

export const ListChainsSchema = z.object({
  configPath: ConfigPathSchema,
});

/**
 * Schemas for describe tools
 */
export const DescribeApiSchema = z.object({
  name: z.string().min(1, 'API name cannot be empty').describe('API name to describe'),
  configPath: ConfigPathSchema,
});

export const DescribeEndpointSchema = z.object({
  api: z.string().min(1, 'API name cannot be empty').describe('API name'),
  endpoint: z
    .string()
    .min(1, 'Endpoint name cannot be empty')
    .describe('Endpoint name to describe'),
  configPath: ConfigPathSchema,
});

export const DescribeProfileSchema = z.object({
  name: z.string().min(1, 'Profile name cannot be empty').describe('Profile name to describe'),
  configPath: ConfigPathSchema,
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
  data: z.any().optional(),
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
  data: z.any(),
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
export type ListChainsParams = z.infer<typeof ListChainsSchema>;
export type DescribeApiParams = z.infer<typeof DescribeApiSchema>;
export type DescribeEndpointParams = z.infer<typeof DescribeEndpointSchema>;
export type DescribeProfileParams = z.infer<typeof DescribeProfileSchema>;
export type HttpCraftResponse = z.infer<typeof HttpCraftResponseSchema>;
export type ChainResponse = z.infer<typeof ChainResponseSchema>;
export type ChainStep = ChainResponse['steps'][number];
export type DiscoveryResponse = z.infer<typeof DiscoveryResponseSchema>;
