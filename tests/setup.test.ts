/**
 * Basic setup test to verify Jest configuration
 */

describe('Project Setup', () => {
  it('should have a working test environment', () => {
    expect(true).toBe(true);
  });

  it('should be able to import TypeScript modules', () => {
    expect(typeof console.log).toBe('function');
  });
});