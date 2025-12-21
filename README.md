# Microsoft 365 Copilot MCP Server

[![CI](https://github.com/chenxizhang/m365copilot-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/chenxizhang/m365copilot-mcp/actions/workflows/ci.yml)
[![npm version](https://badge.fury.io/js/m365-copilot-mcp.svg)](https://www.npmjs.com/package/m365-copilot-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Connect Claude AI to your Microsoft 365 content through the Model Context Protocol (MCP). Access your SharePoint, OneDrive, emails, Teams chats, and more directly from Claude.

## What is this?

This MCP server gives Claude AI three powerful capabilities:

1. **📄 Retrieval** - Extract relevant text from your M365 content to answer questions
2. **🔍 Search** - Find specific documents and files across your M365 environment
3. **💬 Chat** - Have conversations with Microsoft 365 Copilot about your content and schedule

## Prerequisites

- Node.js 20 or higher
- Claude Code CLI ([Installation guide](https://claude.com/claude-code))
- Microsoft 365 account with appropriate licenses

## Installation

### Option 1: Install from npm (Recommended)

Once published to npm, you can install globally:

```bash
npm install -g m365-copilot-mcp
```

Then add to Claude Code:

```bash
claude mcp add m365-copilot-mcp
```

### Option 2: Install from source

```bash
# Clone the repository
git clone https://github.com/chenxizhang/m365copilot-mcp.git
cd m365copilot-mcp

# Install dependencies
npm install

# Build the project
npm run build

# Add to Claude Code
claude mcp add --transport stdio m365-copilot -- node C:\work\m365copilot-mcp\build\index.js
```

## Authentication

On first run, the server will automatically open your browser for Microsoft 365 authentication. After signing in once, your credentials are securely cached - no need to sign in again.

**Required Permissions:** The server will request access to read your SharePoint sites, OneDrive files, emails, Teams chats, and meeting transcripts.

## How to Use

Once installed, you can ask Claude to interact with your M365 content. The server provides three tools:

### 1. m365copilotretrieval - Answer Questions with Your Content

**Use this when:** You need Claude to answer questions using information from your M365 content.

**Example prompts:**
- "Search my documents for information about the Q4 project deadlines"
- "What did the team decide about the feature launch?"
- "Find information about budget approval in my content"

**What it does:** Retrieves relevant text excerpts from SharePoint and OneDrive to ground Claude's answers in your actual content.

---

### 2. m365copilotsearch - Find Documents

**Use this when:** You need to find or locate specific files and documents.

**Example prompts:**
- "Find the VPN setup guide in my M365"
- "Search for the quarterly budget spreadsheet"
- "Locate documents about network configuration"

**What it does:** Returns links to documents with preview text so you can open or share them.

---

### 3. m365copilotchat - Chat with Copilot

**Use this when:** You want conversational interactions, especially for time-aware queries about calendar and tasks.

**Example prompts:**
- "Ask Copilot what meetings I have tomorrow" (timezone: America/New_York)
- "Chat with Copilot about my schedule this week" (timezone: Europe/London)
- "Ask Copilot to summarize recent team discussions" (timezone: Asia/Shanghai)

**Important:** Requires your timezone in IANA format (e.g., "America/New_York", "Europe/London", "Asia/Shanghai").

**What it does:** Enables multi-turn conversations with M365 Copilot, maintaining context across multiple questions.

## Tool Selection Guide

Not sure which tool to use? Here's a quick guide:

| What you want to do | Use this tool | Example |
|---------------------|---------------|---------|
| Answer a question with your content | `m365copilotretrieval` | "What's the project deadline?" |
| Find a specific document | `m365copilotsearch` | "Find the budget spreadsheet" |
| Ask about your schedule | `m365copilotchat` | "What meetings do I have tomorrow?" |
| Have a conversation with Copilot | `m365copilotchat` | "Summarize team discussions this week" |

## Configuration (Optional)

By default, the server uses a built-in multi-tenant Azure AD app. No configuration needed!

To use your own Azure AD app, create a `.env` file:

```bash
AZURE_CLIENT_ID=your-client-id
AZURE_TENANT_ID=your-tenant-id
```

## Troubleshooting

### Authentication issues
- Clear cached tokens: Delete the token cache file in your home directory
- Ensure you have an active Microsoft 365 subscription
- Check that your account has the required permissions

### Connection issues
- Verify the server is running: `claude mcp list`
- Restart Claude Code CLI
- Reinstall the MCP server

### Tool not working
- Check your timezone format for the chat tool (must be IANA format)
- Ensure you're signed in to Microsoft 365
- Check Claude's error messages for specific issues

## Privacy & Security

- **Authentication:** Uses Microsoft's official Azure Identity library with secure token storage
- **Permissions:** Read-only access to your M365 content
- **Data:** No data is stored by this server - all requests go directly to Microsoft APIs
- **Tokens:** Cached locally on your machine, encrypted at rest

## Support

- **Issues:** [GitHub Issues](https://github.com/chenxizhang/m365copilot-mcp/issues)
- **Documentation:** [Full documentation](https://github.com/chenxizhang/m365copilot-mcp)

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## For Developers

### Setting up npm Publication

This project uses GitHub Actions for automated npm publishing. To enable automatic publishing:

1. **Create an npm access token:**
   - Log in to [npmjs.com](https://www.npmjs.com/)
   - Go to Account Settings → Access Tokens
   - Generate a new "Automation" token

2. **Add the token to GitHub Secrets:**
   - Go to your repository Settings → Secrets and variables → Actions
   - Create a new secret named `NPM_TOKEN`
   - Paste your npm access token

3. **Publishing:**
   - **Automatic:** Create a new GitHub Release, and the package will be published automatically
   - **Manual:** Go to Actions → Publish to npm → Run workflow

### CI/CD Workflows

- **CI Workflow:** Runs on every push and pull request to build and verify the project
- **Publish Workflow:** Automatically publishes to npm when a GitHub release is created

---

Made with ❤️ for Claude AI and Microsoft 365 users
