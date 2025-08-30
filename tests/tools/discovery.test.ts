/**
 * Discovery Tools Tests
 * Tests for HTTPCraft configuration discovery tools
 */

import { describe, beforeEach, it, expect, jest } from '@jest/globals';
import { ListApisTool, ListEndpointsTool, ListProfilesTool } from '../../src/tools/discovery.js';
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
    } as any;
  });

  describe('ListApisTool', () => {
    let tool: ListApisTool;

    beforeEach(() => {
      tool = new ListApisTool(mockHttpCraft);
    });

    it('should have correct name and description', () => {
      expect(tool.name).toBe('httpcraft_list_apis');
      expect(tool.description).toBe('List all available APIs from HTTPCraft configuration');
    });

    it('should execute successfully and return API list', async () => {
      const mockApis = ['github', 'slack', 'stripe'];
      mockHttpCraft.executeWithTextOutput.mockResolvedValue({
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

      expect(mockHttpCraft.executeWithTextOutput).toHaveBeenCalledWith(['--get-api-names'], {
        timeout: 30000,
      });
    });

    it('should handle HTTPCraft errors gracefully', async () => {
      mockHttpCraft.executeWithTextOutput.mockResolvedValue({
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
      mockHttpCraft.executeWithTextOutput.mockResolvedValue({
        success: true,
        data: [],
      });

      const configPath = '/custom/config.yaml';
      await tool.execute({ configPath });

      expect(mockHttpCraft.executeWithTextOutput).toHaveBeenCalledWith(
        ['--get-api-names', '--config', configPath],
        { timeout: 30000 }
      );
    });
  });

  describe('ListEndpointsTool', () => {
    let tool: ListEndpointsTool;

    beforeEach(() => {
      tool = new ListEndpointsTool(mockHttpCraft);
    });

    it('should have correct name and description', () => {
      expect(tool.name).toBe('httpcraft_list_endpoints');
      expect(tool.description).toBe('List all endpoints for a specific API');
    });

    it('should execute successfully and return endpoint list', async () => {
      const mockEndpoints = ['users', 'repos', 'issues'];
      const apiName = 'github';

      mockHttpCraft.executeWithTextOutput.mockResolvedValue({
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

      expect(mockHttpCraft.executeWithTextOutput).toHaveBeenCalledWith(
        ['--get-endpoint-names', apiName],
        { timeout: 30000 }
      );
    });

    it('should handle HTTPCraft errors gracefully', async () => {
      mockHttpCraft.executeWithTextOutput.mockResolvedValue({
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
      mockHttpCraft.executeWithTextOutput.mockResolvedValue({
        success: true,
        data: [],
      });

      const configPath = '/custom/config.yaml';
      const apiName = 'test-api';
      await tool.execute({ api: apiName, configPath });

      expect(mockHttpCraft.executeWithTextOutput).toHaveBeenCalledWith(
        ['--get-endpoint-names', apiName, '--config', configPath],
        { timeout: 30000 }
      );
    });
  });

  describe('ListProfilesTool', () => {
    let tool: ListProfilesTool;

    beforeEach(() => {
      tool = new ListProfilesTool(mockHttpCraft);
    });

    it('should have correct name and description', () => {
      expect(tool.name).toBe('httpcraft_list_profiles');
      expect(tool.description).toBe('List all available profiles from HTTPCraft configuration');
    });

    it('should execute successfully and return profile list', async () => {
      const mockProfiles = ['dev', 'staging', 'prod'];
      mockHttpCraft.executeWithTextOutput.mockResolvedValue({
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

      expect(mockHttpCraft.executeWithTextOutput).toHaveBeenCalledWith(['--get-profile-names'], {
        timeout: 30000,
      });
    });

    it('should handle HTTPCraft errors gracefully', async () => {
      mockHttpCraft.executeWithTextOutput.mockResolvedValue({
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
      mockHttpCraft.executeWithTextOutput.mockResolvedValue({
        success: true,
        data: [],
      });

      const configPath = '/custom/config.yaml';
      await tool.execute({ configPath });

      expect(mockHttpCraft.executeWithTextOutput).toHaveBeenCalledWith(
        ['--get-profile-names', '--config', configPath],
        { timeout: 30000 }
      );
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
});
