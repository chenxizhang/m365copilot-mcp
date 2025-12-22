# Microsoft 365 Copilot MCP Server

[![CI](https://github.com/chenxizhang/m365copilot-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/chenxizhang/m365copilot-mcp/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/m365-copilot-mcp)](https://www.npmjs.com/package/m365-copilot-mcp)
[![npm downloads](https://img.shields.io/npm/dm/m365-copilot-mcp)](https://www.npmjs.com/package/m365-copilot-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **Note:** This is an unofficial MCP server, but developed by Microsoft engineers, integrating the latest Microsoft 365 Copilot APIs. We welcome your feedback and contributions!

Connect your AI assistant to Microsoft 365 through the Model Context Protocol (MCP). This server enables AI tools to access your SharePoint documents, OneDrive files, emails, Teams conversations, and more - all while respecting your organization's access controls.

## Overview

The `m365-copilot-mcp` server provides three powerful capabilities for AI assistants:

| Capability | Purpose | Use Cases |
|------------|---------|-----------|
| **📄 Retrieval** | Extract relevant text content from your M365 data | Answer questions using information from your documents, emails, and conversations |
| **🔍 Search** | Find specific documents and files | Locate files, discover relevant content across your M365 environment |
| **💬 Chat** | Conversational AI powered by M365 Copilot | Ask about your schedule, get summaries, interact with time-aware queries |

**Learn more:** These capabilities are built on the official [Microsoft 365 Copilot APIs](https://learn.microsoft.com/en-us/microsoft-365-copilot/extensibility/copilot-apis-overview).

## Prerequisites

- **Node.js 20+** - Runtime environment
- **Microsoft 365 account** - With Microsoft 365 Copilot license
- **MCP-compatible AI tool** - Such as Claude Code, GitHub Copilot, or any other MCP client

## Configuration

Configure the MCP server in your AI tool's settings. The server uses `npx` to run directly from npm without requiring global installation.

### Claude Code

Add the server using the Claude Code CLI:

**macOS/Linux:**
```bash
claude mcp add --scope user --transport stdio m365-copilot -- npx -y m365-copilot-mcp
```

**Windows:**
```bash
claude mcp add --scope user --transport stdio m365-copilot -- cmd /c "npx -y m365-copilot-mcp"
```

The `-y` flag automatically accepts prompts, and `npx` will download and run the latest version of the package.

### GitHub Copilot (VS Code)

Create a `.vscode/mcp.json` file in your project root, or add to your VS Code user settings:

**Option 1: Project-level configuration** (`.vscode/mcp.json`):
```json
{
  "servers": {
    "m365-copilot": {
      "command": "npx",
      "args": ["-y", "m365-copilot-mcp"]
    }
  }
}
```

**Option 2: User-level configuration** (VS Code `settings.json`):
```json
{
  "mcp.servers": {
    "m365-copilot": {
      "command": "npx",
      "args": ["-y", "m365-copilot-mcp"]
    }
  }
}
```

**Requirements:** VS Code 1.99+ with GitHub Copilot extension installed.

### Other MCP Clients

For other MCP-compatible tools, use the following command with `npx`:

```bash
npx -y m365-copilot-mcp
```

Refer to your specific AI tool's documentation for MCP server configuration instructions.

## Authentication

On first use, the server will automatically open your browser for Microsoft 365 authentication. After signing in once, your credentials are securely cached locally - no need to sign in again.

### Security & Privacy

**Your data is safe.** The MCP server:
- ✅ Only reads data through official Microsoft Graph APIs
- ✅ Respects your organization's access controls and permissions
- ✅ Stores authentication tokens locally on your machine (encrypted)
- ✅ Does NOT store, collect, or transmit any of your M365 content
- ✅ Makes direct API calls to Microsoft - no third-party servers involved

### Using Your Own Azure AD App (Optional)

If you have security concerns or organizational requirements, you can use your own Azure AD application instead of the built-in one. However, **this is completely optional** - the default configuration is secure and sufficient for most users.

To use a custom Azure AD app, provide environment variables during configuration:

#### Claude Code

**macOS/Linux:**
```bash
claude mcp add --scope user --transport stdio m365-copilot \
  --env AZURE_CLIENT_ID=your-client-id \
  --env AZURE_TENANT_ID=your-tenant-id \
  -- npx -y m365-copilot-mcp
```

**Windows:**
```bash
claude mcp add --scope user --transport stdio m365-copilot --env AZURE_CLIENT_ID=your-client-id --env AZURE_TENANT_ID=your-tenant-id -- cmd /c "npx -y m365-copilot-mcp"
```

#### GitHub Copilot (VS Code)

Add environment variables to your configuration:

```json
{
  "servers": {
    "m365-copilot": {
      "command": "npx",
      "args": ["-y", "m365-copilot-mcp"],
      "env": {
        "AZURE_CLIENT_ID": "your-client-id",
        "AZURE_TENANT_ID": "your-tenant-id"
      }
    }
  }
}
```

**Required Microsoft Graph API Permissions:**
- Sites.Read.All
- Files.Read.All
- Mail.Read
- Chat.Read
- ChannelMessage.Read.All
- OnlineMeetingTranscript.Read.All
- People.Read.All
- ExternalItem.Read.All

## Available Tools

Your AI assistant can now use these three tools to interact with your M365 content:

### 1. m365copilotretrieval

Retrieves relevant text excerpts from your SharePoint and OneDrive content to answer questions.

**Best for:**
- Answering questions based on your documents
- Finding information buried in your content
- Grounding AI responses in your actual data

**Example prompts:**
- "What are the Q4 project deadlines mentioned in my documents?"
- "Summarize the team's decision about the new feature"
- "What does our company policy say about remote work?"

### 2. m365copilotsearch

Searches across your M365 environment to find specific documents and files.

**Best for:**
- Locating specific documents
- Getting document links to open or share
- Discovering relevant files across SharePoint and OneDrive

**Example prompts:**
- "Find the VPN setup guide"
- "Search for the Q4 budget spreadsheet"
- "Locate documents about network security policies"

### 3. m365copilotchat

Enables conversational interactions with Microsoft 365 Copilot, with awareness of your calendar, tasks, and content.

**Best for:**
- Asking about your schedule and meetings
- Getting summaries of recent activities
- Time-aware queries that need context

**Example prompts:**
- "What meetings do I have tomorrow?"
- "Summarize recent discussions about the product launch"
- "What are my action items for this week?"

**Note:** This tool requires your timezone in IANA format (e.g., "America/New_York", "Europe/London", "Asia/Shanghai").

## How It Works

```
┌─────────────────┐
│   AI Assistant  │
│ (Claude, etc.)  │
└────────┬────────┘
         │
         │ MCP Protocol
         ▼
┌─────────────────┐
│ m365-copilot-mcp│
│     Server      │
└────────┬────────┘
         │
         │ Microsoft Graph API
         ▼
┌─────────────────┐
│  Microsoft 365  │
│   (Your Data)   │
└─────────────────┘
```

The MCP server acts as a secure bridge between your AI assistant and Microsoft 365, using official Microsoft APIs to access your data based on your permissions.

## Troubleshooting

### Authentication Issues

**Problem:** Browser doesn't open for login
**Solution:** Manually authenticate by setting `AZURE_CLIENT_ID` in your environment

**Problem:** "Permission denied" errors
**Solution:** Ensure your Microsoft 365 account has access to the requested resources

### Connection Issues

**Problem:** AI assistant can't find the MCP server
**Solution:**
- Verify installation: `npm list -g m365-copilot-mcp`
- Check that Node.js 20+ is installed: `node --version`
- Restart your AI assistant

### Tool Not Working

**Problem:** Chat tool fails with timezone error
**Solution:** Ensure you provide timezone in IANA format (e.g., "America/New_York")

**Problem:** No results returned
**Solution:** Verify you have access to M365 content and are signed in to the correct account

## Supported Platforms

- ✅ Windows 10/11
- ✅ macOS 10.15+
- ✅ Linux (Ubuntu 20.04+, other distributions)

## Feedback & Support

This project is actively maintained. We welcome your feedback and contributions!

- **Report Issues:** [GitHub Issues](https://github.com/chenxizhang/m365copilot-mcp/issues)
- **Feature Requests:** [GitHub Discussions](https://github.com/chenxizhang/m365copilot-mcp/discussions)
- **Project Documentation:** [GitHub Repository](https://github.com/chenxizhang/m365copilot-mcp)
- **API Documentation:** [Microsoft 365 Copilot APIs](https://learn.microsoft.com/en-us/microsoft-365-copilot/extensibility/copilot-apis-overview)

## License

MIT License - see [LICENSE](LICENSE) file for details.

---

**Developed by Microsoft engineers** | **Powered by Microsoft 365 Copilot APIs**
