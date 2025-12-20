#!/usr/bin/env node

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServer } from './server.js';
import { info, error as logError, setLogLevel, LogLevel } from './utils/logger.js';

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
