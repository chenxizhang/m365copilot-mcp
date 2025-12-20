# M365 Copilot MCP Server

An MCP (Model Context Protocol) server that integrates with Microsoft 365 Copilot APIs, providing access to Retrieval, Search, and Chat capabilities.

## Current Status: Stage 2 - Enhanced Tools & Error Handling

Building on Stage 1, this stage adds enhanced error handling, logging, input validation, and additional test tools.

## Prerequisites

- Node.js 20+ and npm
- Claude Code CLI installed
- Microsoft 365 account with Copilot license (for later stages)
- Azure AD application registration (for later stages)

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Build the Project

```bash
npm run build
```

### 3. Test the Server Locally

```bash
node build/index.js
```

You should see:
```
M365 Copilot MCP Server started successfully
Waiting for client connection...
```

Press `Ctrl+C` to stop the server.

### 4. Add to Claude Code CLI

```bash
claude mcp add --transport stdio m365-copilot -- node C:\work\m365copilot-mcp\build\index.js
```

### 5. Verify Connection

```bash
claude mcp list
```

You should see `m365-copilot` in the list with status "connected".

## Available Tools

### hello

A simple test tool that echoes back a greeting message.

**Parameters:**
- `name` (string, required): The name to greet

**Example usage:**
Ask Claude: "Use the hello tool to greet John"

### echo

Echoes back the provided message with optional formatting. Useful for testing parameter passing and validation.

**Parameters:**
- `message` (string, required): The message to echo back
- `uppercase` (boolean, optional): Convert message to uppercase (default: false)
- `prefix` (string, optional): Optional prefix to add before the message

**Example usage:**
- Ask Claude: "Use the echo tool with message 'Hello World'"
- Ask Claude: "Use the echo tool with message 'test', uppercase true, and prefix 'OUTPUT:'"

### serverInfo

Returns information about the MCP server including version, capabilities, and available utilities.

**Parameters:** None

**Example usage:**
Ask Claude: "Use the serverInfo tool to show server information"

## Development

### Build and Watch Mode

```bash
npm run watch
```

This will automatically rebuild when you make changes to the source code.

### Rebuild and Restart

After making code changes:

```bash
npm run build
# Claude Code will automatically reconnect to the updated server
```

## Project Structure

```
m365copilot-mcp/
├── src/
│   ├── index.ts              # Main entry point with stdio transport
│   ├── server.ts             # MCP server initialization and tools
│   └── utils/                # Utility modules (Stage 2+)
│       ├── logger.ts         # Logging utilities
│       ├── errors.ts         # Error handling utilities
│       └── validation.ts     # Input validation helpers
├── build/                    # Compiled JavaScript (generated)
├── .github/
│   └── copilot-instructions.md  # GitHub Copilot instructions
├── package.json              # Dependencies and scripts
├── tsconfig.json             # TypeScript configuration
├── .gitignore                # Git ignore rules
├── CLAUDE.md                 # Development guide for Claude Code
└── README.md                 # This file
```

## Stage 2 Features

### Enhanced Error Handling
- Custom error types: `MCPError`, `ValidationError`, `AuthenticationError`, `APIError`, `ConfigurationError`
- Structured error responses with error codes and details
- Proper error formatting for MCP protocol

### Logging System
- Configurable log levels (DEBUG, INFO, WARN, ERROR)
- Structured logging with timestamps and context
- Logs to stderr to avoid stdio protocol interference
- Environment variable support: `LOG_LEVEL` (DEBUG, INFO, WARN, ERROR)

### Input Validation
- Type-safe parameter validation functions
- Required parameter helpers: `requireString`, `requireNumber`, `requireBoolean`, `requireArray`, `requireObject`, `requireEnum`
- Optional parameter helpers: `optionalString`, `optionalNumber`, `optionalBoolean`
- Range and length validation utilities

### New Test Tools
- **echo**: Test parameter passing with optional formatting
- **serverInfo**: Inspect server configuration and capabilities

## Next Stages

- **Stage 3**: Azure Identity Integration
- **Stage 4**: Microsoft Graph API Test
- **Stage 5**: M365 Copilot Retrieval API
- **Stage 6**: M365 Copilot Search API
- **Stage 7**: M365 Copilot Chat API
- **Stage 8**: Production Polish

## Troubleshooting

### Server won't start

- Ensure all dependencies are installed: `npm install`
- Ensure the project is built: `npm run build`
- Check for TypeScript errors during build

### Claude Code can't connect

- Verify the server path in the claude mcp add command is correct
- Try removing and re-adding the server:
  ```bash
  claude mcp remove m365-copilot
  claude mcp add --transport stdio m365-copilot -- node C:\work\m365copilot-mcp\build\index.js
  ```

### Tool not showing up

- Restart Claude Code CLI
- Check server logs (stderr output)
- Verify the server is running: `claude mcp list`

## License

MIT
