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
- ✅ Stores authentication tokens locally on your machine (encrypted by OS)
- ✅ Does NOT store, collect, or transmit any of your M365 content
- ✅ Makes direct API calls to Microsoft - no third-party servers involved

**Token Security:**
- 🔐 Access tokens are encrypted using OS-level security:
  - **Windows**: DPAPI (Data Protection API) - binds to your user account
  - **macOS**: Keychain - binds to your user account and system
  - **Linux**: LibSecret - stored in system keyring
- 🔐 Tokens **cannot be simply copied** to another computer and used
- 🔐 Authentication records use file permissions (0600 - owner read/write only)
- 🔐 Enable MFA on your Microsoft account for additional security

**For detailed security analysis**, see [SECURITY.md](SECURITY.md)

### Using Your Own Azure AD App (Optional)

If you have security concerns or organizational requirements, you can use your own Azure AD application instead of the built-in one. However, **this is completely optional** - the default configuration is secure and sufficient for most users.

#### Azure AD App Registration Setup

When creating your own Azure AD app, you **must** register the redirect URI in your app registration:

1. Go to [Azure Portal](https://portal.azure.com) → Azure Active Directory → App registrations
2. Select your application (or create a new one)
3. Navigate to **Authentication** → **Add a platform** → **Mobile and desktop applications**
4. Add the redirect URI: **`http://localhost`**
5. Save the configuration

**Note:** The default redirect URI is `http://localhost`. Azure AD will match this URI regardless of the actual port used by the application, making it work seamlessly with dynamic port allocation. You can customize it using the `REDIRECT_URI` environment variable if needed (e.g., `https://login.microsoftonline.com/common/oauth2/nativeclient`).

#### Configuration

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

**Optional Environment Variables:**
- `REDIRECT_URI`: Custom redirect URI (default: `http://localhost`, alternative: `https://login.microsoftonline.com/common/oauth2/nativeclient`)

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

## Account Management

### Switching Accounts (m365copilotlogout)

If you need to switch to a different Microsoft 365 account, you can use the logout tool to clear cached credentials.

**How to use:**
- Ask your AI assistant: "Logout from Microsoft 365" or "Switch to a different account"
- The tool will clear all cached authentication data
- **Restart your MCP server** for the logout to take full effect
- On next use, you'll be prompted to log in with a different account

This is useful for:
- Switching between work and personal M365 accounts
- Troubleshooting authentication issues
- Testing with different user permissions

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

## Security Best Practices

### For Personal Use

1. **Enable Multi-Factor Authentication (MFA)** 🔐
   - Enable MFA on your Microsoft 365 account
   - Even if credentials are compromised, MFA provides a second layer of protection
   - [Learn how to enable MFA](https://support.microsoft.com/en-us/account-billing/how-to-use-the-microsoft-authenticator-app-9783c865-0308-42fb-a519-8cf666fe0acc)

2. **Protect Your Credentials Directory** 🔐
   - Never share or backup the `~/.IdentityService/` directory
   - Ensure file permissions are correct (automatically set to 0600)
   - On shared computers, use `m365copilotlogout` when finished

3. **Regular Logout** 🔄
   - Use the logout tool if you won't be using the service for extended periods
   - Always logout before creating system backups or VM snapshots

### For Enterprise Use

1. **Use Your Own Azure AD Application** 🏢
   - Register a custom Azure AD app for your organization
   - This allows you to:
     - Control access at the organization level
     - Monitor usage through Azure AD logs
     - Apply conditional access policies
     - Revoke access centrally if needed

2. **Configure Conditional Access Policies** 🛡️
   - Restrict access to specific IP ranges or locations
   - Require compliant devices
   - Enforce session controls

3. **Monitor Azure AD Sign-in Logs** 📊
   - Regularly review sign-in logs in Azure AD Portal
   - Look for unusual locations or access patterns
   - Set up alerts for suspicious activity

4. **Implement Zero Trust Security** 🎯
   - Assume breach and verify explicitly
   - Use least privilege access
   - Consider network segmentation

### What If Credentials Are Compromised?

If you suspect your credentials may have been compromised:

1. **Immediate Actions:**
   - Use `m365copilotlogout` to clear local credentials
   - Change your Microsoft 365 password immediately
   - Review recent activity in Azure AD sign-in logs

2. **Investigation:**
   - Check for unfamiliar devices in your Microsoft account
   - Review Azure AD audit logs for unauthorized access
   - Look for suspicious file access or modifications in SharePoint/OneDrive

3. **Recovery:**
   - Revoke all active sessions in Azure AD
   - Re-authenticate with new credentials
   - Consider enabling additional security features (e.g., Conditional Access)

### Understanding Credential Security

**Q: Can someone copy my cached credentials to another computer?**

**A: Generally no, but it depends:**

- **Access Tokens**: Encrypted by your operating system and **cannot** be simply copied:
  - Windows: DPAPI encryption binds to your user account and machine
  - macOS: Keychain encryption binds to your system
  - Linux: Stored in system keyring (security depends on keyring implementation)

- **Authentication Record**: Contains only account metadata (username, tenant ID), not tokens
  - Protected by file permissions (0600 - owner only)
  - Copying it alone does **not** grant access
  - Would require attacker to also have your Microsoft password

**For detailed security analysis**, including threat models and improvement suggestions, see [SECURITY.md](SECURITY.md).

## Troubleshooting

### Authentication Issues

**Problem:** Want to switch to a different Microsoft 365 account
**Solution:** Use the `m365copilotlogout` tool to clear cached credentials, then restart the MCP server. On next use, you'll be prompted to log in with a different account.

**Problem:** Redirect URI mismatch error during authentication
**Solution:** Ensure `http://localhost` is registered in your Azure AD app registration under **Authentication → Mobile and desktop applications**. Azure AD will match this URI regardless of the actual port used. If using a custom redirect URI, set the `REDIRECT_URI` environment variable to match your Azure AD configuration.

**Problem:** Browser doesn't open for login
**Solution:** Check your firewall settings or try a custom redirect URI using the `REDIRECT_URI` environment variable

**Problem:** "Permission denied" errors
**Solution:** Ensure your Microsoft 365 account has access to the requested resources. If you recently changed permissions or accounts, try using the logout tool and re-authenticating.

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
