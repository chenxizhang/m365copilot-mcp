#!/usr/bin/env node

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServer } from './server.js';
import { info, warn, error as logError, setLogLevel, LogLevel } from './utils/logger.js';
import { getAuthManager, setAuthenticationState } from './auth/identity.js';

/**
 * Initialize and test authentication on server startup
 */
async function initializeAuthentication(): Promise<void> {
  const authManager = getAuthManager();

  if (!authManager.isConfigured()) {
    warn('Authentication not configured. Using default DeviceCode method.');
    warn('To configure: Set environment variables AZURE_TENANT_ID, AZURE_CLIENT_ID, etc.');
    warn('See .env.example for details.');
  }

  try {
    info('Initializing authentication...');
    await authManager.initialize();

    info('Testing authentication...');
    const success = await authManager.testAuthentication();

    if (success) {
      setAuthenticationState(true);
      info('✓ Authentication successful');
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
