/**
 * Discovery Tools Tests
 * Tests for HTTPCraft configuration discovery tools
 */

import { describe, beforeEach, it, expect, jest } from '@jest/globals';
import {
  ListApisTool,
  ListEndpointsTool,
  ListProfilesTool,
  DescribeApiTool,
  DescribeEndpointTool,
  DescribeProfileTool,
} from '../../src/tools/discovery.js';
import type { HttpCraftCli } from '../../src/httpcraft/cli.js';

// Mock logger
jest.mock('../../src/utils/logger.js', () => ({
  logger: {
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}));

describe('Discovery Tools', () => {
  let mockHttpCraft: jest.Mocked<HttpCraftCli>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockHttpCraft = {
      execute: jest.fn(),
      executeWithJsonOutput: jest.fn(),
      executeWithTextOutput: jest.fn(),
      getVersion: jest.fn(),
      isAvailable: jest.fn(),
      getConfig: jest.fn(),
      clearCache: jest.fn(),
      // New CLI methods
      listApis: jest.fn(),
      listEndpoints: jest.fn(),
      listProfiles: jest.fn(),
      describeApi: jest.fn(),
      describeEndpoint: jest.fn(),
      describeProfile: jest.fn(),
    } as any;
  });

  describe('ListApisTool', () => {
    let tool: ListApisTool;

    beforeEach(() => {
      tool = new ListApisTool(mockHttpCraft);
    });

    it('should have correct name and description', () => {
      expect(tool.name).toBe('httpcraft_list_apis');
      expect(tool.description).toContain('List all available APIs from HTTPCraft configuration');
      expect(tool.description).toContain('Discover the APIs configured in your HTTPCraft setup');
      expect(tool.description).toContain('Follow up with httpcraft_list_endpoints');
    });

    it('should execute successfully and return API list', async () => {
      const mockApis = ['github', 'slack', 'stripe'];
      mockHttpCraft.listApis.mockResolvedValue({
        success: true,
        data: mockApis,
      });

      const result = await tool.execute({});

      expect(result.isError).toBe(false);
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect('text' in result.content[0] && result.content[0].text).toBeTruthy();

      const response = JSON.parse((result.content[0] as any).text);
      expect(response.success).toBe(true);
      expect(response.apis).toEqual(mockApis);
      expect(response.timestamp).toBeDefined();

      expect(mockHttpCraft.listApis).toHaveBeenCalledWith(undefined);
    });

    it('should handle HTTPCraft errors gracefully', async () => {
      mockHttpCraft.listApis.mockResolvedValue({
        success: false,
        error: new Error('Configuration file not found'),
      });

      const result = await tool.execute({});

      expect(result.isError).toBe(true);
      expect(result.content).toHaveLength(1);

      const response = JSON.parse(result.content[0].text!);
      expect(response.error).toBe(true);
      expect(response.message).toContain('Failed to list APIs');
    });

    it('should pass config path parameter', async () => {
      mockHttpCraft.listApis.mockResolvedValue({
        success: true,
        data: [],
      });

      const configPath = '/custom/config.yaml';
      await tool.execute({ configPath });

      expect(mockHttpCraft.listApis).toHaveBeenCalledWith(configPath);
    });
  });

  describe('ListEndpointsTool', () => {
    let tool: ListEndpointsTool;

    beforeEach(() => {
      tool = new ListEndpointsTool(mockHttpCraft);
    });

    it('should have correct name and description', () => {
      expect(tool.name).toBe('httpcraft_list_endpoints');
      expect(tool.description).toContain('List all endpoints for a specific API');
      expect(tool.description).toContain(
        'Discover the available endpoints within a specific API configuration'
      );
      expect(tool.description).toContain('Typically used after httpcraft_list_apis');
    });

    it('should execute successfully and return endpoint list', async () => {
      const mockEndpoints = ['users', 'repos', 'issues'];
      const apiName = 'github';

      mockHttpCraft.listEndpoints.mockResolvedValue({
        success: true,
        data: mockEndpoints,
      });

      const result = await tool.execute({ api: apiName });

      expect(result.isError).toBe(false);
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect('text' in result.content[0] && result.content[0].text).toBeTruthy();

      const response = JSON.parse((result.content[0] as any).text);
      expect(response.success).toBe(true);
      expect(response.api).toBe(apiName);
      expect(response.endpoints).toEqual(mockEndpoints);
      expect(response.timestamp).toBeDefined();

      expect(mockHttpCraft.listEndpoints).toHaveBeenCalledWith(apiName, undefined);
    });

    it('should handle HTTPCraft errors gracefully', async () => {
      mockHttpCraft.listEndpoints.mockResolvedValue({
        success: false,
        error: new Error('API not found'),
      });

      const result = await tool.execute({ api: 'nonexistent' });

      expect(result.isError).toBe(true);
      expect(result.content).toHaveLength(1);

      const response = JSON.parse(result.content[0].text!);
      expect(response.error).toBe(true);
      expect(response.message).toContain('Failed to list endpoints for API "nonexistent"');
    });

    it('should require API parameter', async () => {
      const result = await tool.execute({});

      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text!);
      expect(response.message).toContain('Parameter validation failed');
    });

    it('should pass config path parameter', async () => {
      mockHttpCraft.listEndpoints.mockResolvedValue({
        success: true,
        data: [],
      });

      const configPath = '/custom/config.yaml';
      const apiName = 'test-api';
      await tool.execute({ api: apiName, configPath });

      expect(mockHttpCraft.listEndpoints).toHaveBeenCalledWith(apiName, configPath);
    });
  });

  describe('ListProfilesTool', () => {
    let tool: ListProfilesTool;

    beforeEach(() => {
      tool = new ListProfilesTool(mockHttpCraft);
    });

    it('should have correct name and description', () => {
      expect(tool.name).toBe('httpcraft_list_profiles');
      expect(tool.description).toContain(
        'List all available profiles from HTTPCraft configuration'
      );
      expect(tool.description).toContain('Profiles are environment-specific configurations');
      expect(tool.description).toContain('Essential for httpcraft_execute_api calls');
    });

    it('should execute successfully and return profile list', async () => {
      const mockProfiles = ['dev', 'staging', 'prod'];
      mockHttpCraft.listProfiles.mockResolvedValue({
        success: true,
        data: mockProfiles,
      });

      const result = await tool.execute({});

      expect(result.isError).toBe(false);
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect('text' in result.content[0] && result.content[0].text).toBeTruthy();

      const response = JSON.parse((result.content[0] as any).text);
      expect(response.success).toBe(true);
      expect(response.profiles).toEqual(mockProfiles);
      expect(response.timestamp).toBeDefined();

      expect(mockHttpCraft.listProfiles).toHaveBeenCalledWith(undefined);
    });

    it('should handle HTTPCraft errors gracefully', async () => {
      mockHttpCraft.listProfiles.mockResolvedValue({
        success: false,
        error: new Error('No profiles configured'),
      });

      const result = await tool.execute({});

      expect(result.isError).toBe(true);
      expect(result.content).toHaveLength(1);

      const response = JSON.parse(result.content[0].text!);
      expect(response.error).toBe(true);
      expect(response.message).toContain('Failed to list profiles');
    });

    it('should pass config path parameter', async () => {
      mockHttpCraft.listProfiles.mockResolvedValue({
        success: true,
        data: [],
      });

      const configPath = '/custom/config.yaml';
      await tool.execute({ configPath });

      expect(mockHttpCraft.listProfiles).toHaveBeenCalledWith(configPath);
    });
  });

  describe('Tool Integration', () => {
    it('should register all discovery tools successfully', () => {
      const listApisTool = new ListApisTool(mockHttpCraft);
      const listEndpointsTool = new ListEndpointsTool(mockHttpCraft);
      const listProfilesTool = new ListProfilesTool(mockHttpCraft);

      expect(listApisTool.name).toBe('httpcraft_list_apis');
      expect(listEndpointsTool.name).toBe('httpcraft_list_endpoints');
      expect(listProfilesTool.name).toBe('httpcraft_list_profiles');

      // Verify each tool has the required methods
      expect(typeof listApisTool.execute).toBe('function');
      expect(typeof listEndpointsTool.execute).toBe('function');
      expect(typeof listProfilesTool.execute).toBe('function');

      expect(typeof listApisTool.getToolDefinition).toBe('function');
      expect(typeof listEndpointsTool.getToolDefinition).toBe('function');
      expect(typeof listProfilesTool.getToolDefinition).toBe('function');
    });

    it('should generate valid MCP tool definitions', () => {
      const listApisTool = new ListApisTool(mockHttpCraft);
      const listEndpointsTool = new ListEndpointsTool(mockHttpCraft);
      const listProfilesTool = new ListProfilesTool(mockHttpCraft);

      const apisDefinition = listApisTool.getToolDefinition();
      const endpointsDefinition = listEndpointsTool.getToolDefinition();
      const profilesDefinition = listProfilesTool.getToolDefinition();

      // Verify structure
      expect(apisDefinition.name).toBe('httpcraft_list_apis');
      expect(apisDefinition.description).toBeDefined();
      expect(apisDefinition.inputSchema).toBeDefined();

      expect(endpointsDefinition.name).toBe('httpcraft_list_endpoints');
      expect(endpointsDefinition.description).toBeDefined();
      expect(endpointsDefinition.inputSchema).toBeDefined();

      expect(profilesDefinition.name).toBe('httpcraft_list_profiles');
      expect(profilesDefinition.description).toBeDefined();
      expect(profilesDefinition.inputSchema).toBeDefined();
    });
  });

  describe('DescribeApiTool', () => {
    let tool: DescribeApiTool;

    beforeEach(() => {
      tool = new DescribeApiTool(mockHttpCraft);
    });

    it('should have correct name and description', () => {
      expect(tool.name).toBe('httpcraft_describe_api');
      expect(tool.description).toContain('Get detailed information about a specific API');
      expect(tool.description).toContain('Provides comprehensive details about an API');
      expect(tool.description).toContain('foundation knowledge needed for effective API testing');
    });

    it('should execute successfully and return API description', async () => {
      const mockApiDescription = {
        name: 'github',
        base_url: 'https://api.github.com',
        description: 'GitHub REST API',
        endpoints: { users: { method: 'GET', path: '/users' } },
      };

      mockHttpCraft.describeApi.mockResolvedValue({
        success: true,
        data: mockApiDescription,
      });

      const result = await tool.execute({ name: 'github' });

      expect(result.isError).toBe(false);
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');

      const response = JSON.parse((result.content[0] as any).text);
      expect(response.success).toBe(true);
      expect(response.api).toEqual(mockApiDescription);
      expect(response.timestamp).toBeDefined();

      expect(mockHttpCraft.describeApi).toHaveBeenCalledWith('github', undefined);
    });

    it('should handle API not found errors', async () => {
      mockHttpCraft.describeApi.mockResolvedValue({
        success: false,
        error: new Error('API not found'),
      });

      const result = await tool.execute({ name: 'nonexistent' });

      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text!);
      expect(response.message).toContain('Failed to describe API "nonexistent"');
    });
  });

  describe('DescribeEndpointTool', () => {
    let tool: DescribeEndpointTool;

    beforeEach(() => {
      tool = new DescribeEndpointTool(mockHttpCraft);
    });

    it('should have correct name and description', () => {
      expect(tool.name).toBe('httpcraft_describe_endpoint');
      expect(tool.description).toContain('Get detailed information about a specific endpoint');
      expect(tool.description).toContain(
        'Provides comprehensive details about a specific endpoint'
      );
      expect(tool.description).toContain('Essential step before calling httpcraft_execute_api');
    });

    it('should execute successfully and return endpoint description', async () => {
      const mockEndpointDescription = {
        name: 'users',
        api: 'github',
        method: 'GET',
        path: '/users',
        description: 'List users',
      };

      mockHttpCraft.describeEndpoint.mockResolvedValue({
        success: true,
        data: mockEndpointDescription,
      });

      const result = await tool.execute({ api: 'github', endpoint: 'users' });

      expect(result.isError).toBe(false);
      const response = JSON.parse((result.content[0] as any).text);
      expect(response.success).toBe(true);
      expect(response.endpoint).toEqual(mockEndpointDescription);

      expect(mockHttpCraft.describeEndpoint).toHaveBeenCalledWith('github', 'users', undefined);
    });
  });

  describe('DescribeProfileTool', () => {
    let tool: DescribeProfileTool;

    beforeEach(() => {
      tool = new DescribeProfileTool(mockHttpCraft);
    });

    it('should have correct name and description', () => {
      expect(tool.name).toBe('httpcraft_describe_profile');
      expect(tool.description).toContain('Get detailed information about a specific profile');
      expect(tool.description).toContain('Profiles define environment-specific settings');
      expect(tool.description).toContain('Essential for understanding how different environments');
    });

    it('should execute successfully and return profile description', async () => {
      const mockProfileDescription = {
        name: 'dev',
        description: 'Development environment',
        variables: { api_base: 'https://dev-api.example.com' },
        timeout: 30,
      };

      mockHttpCraft.describeProfile.mockResolvedValue({
        success: true,
        data: mockProfileDescription,
      });

      const result = await tool.execute({ name: 'dev' });

      expect(result.isError).toBe(false);
      const response = JSON.parse((result.content[0] as any).text);
      expect(response.success).toBe(true);
      expect(response.profile).toEqual(mockProfileDescription);

      expect(mockHttpCraft.describeProfile).toHaveBeenCalledWith('dev', undefined);
    });
  });
});
