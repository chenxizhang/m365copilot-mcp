# M365 Copilot MCP Server

An MCP (Model Context Protocol) server that integrates with Microsoft 365 Copilot APIs, providing access to Retrieval, Search, and Chat capabilities.

## Current Status: Stage 1 - Minimal MCP Server Foundation

This is the initial stage with basic MCP server functionality to verify connectivity with Claude Code CLI.

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

## Available Tools (Stage 1)

### hello

A simple test tool that echoes back a greeting message.

**Parameters:**
- `name` (string, required): The name to greet

**Example usage:**
Ask Claude: "Use the hello tool to greet John"

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
│   └── server.ts             # MCP server initialization and tools
├── build/                    # Compiled JavaScript (generated)
├── package.json              # Dependencies and scripts
├── tsconfig.json             # TypeScript configuration
├── .gitignore                # Git ignore rules
└── README.md                 # This file
```

## Next Stages

- **Stage 2**: Enhanced Tools & Error Handling
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
