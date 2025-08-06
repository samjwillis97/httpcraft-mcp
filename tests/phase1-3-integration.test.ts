/**
 * Test Phase 1.3 criteria - Integration test
 */

import { spawn } from 'child_process';

describe('Phase 1.3: HTTPCraft CLI Integration', () => {
  it('should have HTTPCraft available in system', async () => {
    const result = await new Promise<{stdout: string, exitCode: number}>((resolve) => {
      const child = spawn('httpcraft', ['--version'], { 
        stdio: ['pipe', 'pipe', 'pipe'] 
      });
      
      let stdout = '';
      child.stdout?.on('data', (chunk) => {
        stdout += chunk.toString();
      });
      
      child.on('close', (exitCode) => {
        resolve({ stdout, exitCode: exitCode ?? -1 });
      });
      
      child.on('error', () => {
        resolve({ stdout: '', exitCode: -1 });
      });
    });
    
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('1.0.0'); // Our mock outputs version 1.0.0
  }, 10000);

  it('should have MCP server with working health check', async () => {
    const result = await new Promise<{stdout: string, exitCode: number}>((resolve) => {
      const child = spawn('node', ['dist/server.js'], { 
        stdio: ['pipe', 'pipe', 'pipe'] 
      });
      
      let stdout = '';
      child.stdout?.on('data', (chunk) => {
        stdout += chunk.toString();
      });
      
      child.on('close', (exitCode) => {
        resolve({ stdout, exitCode: exitCode ?? -1 });
      });
      
      // Send health check request
      const healthRequest = JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: {
          name: "httpcraft_health",
          arguments: {}
        }
      });
      
      child.stdin?.write(healthRequest + '\n');
      child.stdin?.end();
      
      // Kill after 3 seconds
      setTimeout(() => {
        child.kill();
      }, 3000);
    });
    
    expect(result.stdout).toContain('\\"httpCraftAvailable\\": true');
    expect(result.stdout).toContain('\\"status\\": \\"healthy\\"');
  }, 10000);
});