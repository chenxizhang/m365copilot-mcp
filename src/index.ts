#!/usr/bin/env node

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServer } from './server.js';
import { info, warn, error as logError, setLogLevel, LogLevel } from './utils/logger.js';
import { getAuthManager, setAuthenticationState } from './auth/identity.js';

/**
 * Initialize and test authentication on server startup
 * For DeviceCode method, skip auto-authentication to avoid blocking server startup
 */
async function initializeAuthentication(): Promise<void> {
  const authManager = getAuthManager();
  const config = authManager.getConfig();

  if (!authManager.isConfigured()) {
    info('Using default authentication configuration');
    info(`Authentication method: ${config.authMethod}`);
  }

  // Skip auto-authentication for DeviceCode to avoid blocking server startup
  // DeviceCode requires manual user interaction which would hang the server
  if (config.authMethod === 'DeviceCode') {
    info('DeviceCode authentication method detected - skipping auto-authentication on startup');
    info('Please use the authTest tool to authenticate interactively');
    setAuthenticationState(false);
    return;
  }

  // For other auth methods (ClientSecret, InteractiveBrowser, ManagedIdentity), attempt auto-authentication
  // InteractiveBrowser will use cached token if available, or open browser if needed
  try {
    info('Initializing authentication...');
    info(`Using ${config.authMethod} authentication method`);
    await authManager.initialize();

    info('Attempting to authenticate (using cached token if available)...');
    const success = await authManager.testAuthentication();

    if (success) {
      setAuthenticationState(true);
      info('✓ Authentication successful - all tools are now available');
      info('  Token has been cached and will be automatically refreshed');
    } else {
      setAuthenticationState(false);
      warn('✗ Authentication test failed - tools requiring authentication will not work');
      warn('  Use authTest tool to authenticate manually');
    }
  } catch (error) {
    setAuthenticationState(false);
    const errorMessage = error instanceof Error ? error.message : String(error);
    warn(`✗ Authentication initialization failed: ${errorMessage}`);
    warn('  Server will start but tools requiring authentication will not work');
    warn('  Use authTest tool to authenticate manually');
  }
}

/**
 * Main entry point for the M365 Copilot MCP Server
 * Uses stdio transport for local execution with Claude Code CLI
 */
async function main() {
  try {
    // Set log level from environment variable (default: INFO)
    const logLevelEnv = process.env.LOG_LEVEL?.toUpperCase();
    if (logLevelEnv && logLevelEnv in LogLevel) {
      setLogLevel(LogLevel[logLevelEnv as keyof typeof LogLevel]);
    }

    info('Initializing M365 Copilot MCP Server');

    // Initialize authentication on startup
    await initializeAuthentication();

    // Create the MCP server instance
    const server = createServer();

    // Create stdio transport
    const transport = new StdioServerTransport();

    // Connect server to transport
    await server.connect(transport);

    info('M365 Copilot MCP Server started successfully');
    info('Waiting for client connection...');
  } catch (error) {
    logError('Failed to start M365 Copilot MCP Server', error);
    process.exit(1);
  }
}

// Run the server
main();
