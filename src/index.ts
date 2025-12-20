#!/usr/bin/env node

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServer } from './server.js';

/**
 * Main entry point for the M365 Copilot MCP Server
 * Uses stdio transport for local execution with Claude Code CLI
 */
async function main() {
  try {
    // Create the MCP server instance
    const server = createServer();

    // Create stdio transport
    const transport = new StdioServerTransport();

    // Connect server to transport
    await server.connect(transport);

    // Log server start (to stderr so it doesn't interfere with stdio protocol)
    console.error('M365 Copilot MCP Server started successfully');
    console.error('Waiting for client connection...');
  } catch (error) {
    console.error('Failed to start M365 Copilot MCP Server:', error);
    process.exit(1);
  }
}

// Run the server
main();
