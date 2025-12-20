# M365 Copilot MCP Server - Development Guide

This document provides architecture, design decisions, and development instructions for the M365 Copilot MCP Server project.

## Project Overview

The M365 Copilot MCP Server is a Model Context Protocol (MCP) server that integrates with Microsoft 365 Copilot APIs, providing Claude Code with access to:
- Microsoft Graph API
- M365 Copilot Retrieval capabilities
- M365 Copilot Search capabilities
- M365 Copilot Chat capabilities

## Architecture Principles

### Modular Design
The project is structured for multi-agent parallel development:
- Each module should have clear responsibilities and minimal dependencies
- Utilities are separated into individual files for easy testing and reuse
- Tool implementations are isolated and can be developed independently

### Progressive Enhancement
Development follows a staged approach:
1. **Stage 1**: Minimal MCP Server Foundation (COMPLETED)
2. **Stage 2**: Enhanced Tools & Error Handling (COMPLETED)
3. **Stage 3**: Azure Identity Integration (COMPLETED)
4. **Stage 4**: M365 Copilot Retrieval API (COMPLETED)
5. **Stage 5**: M365 Copilot Search API
6. **Stage 6**: M365 Copilot Chat API
7. **Stage 7**: Production Polish

## Project Structure

```
m365copilot-mcp/
├── src/
│   ├── index.ts              # Main entry point with stdio transport
│   ├── server.ts             # MCP server initialization and tools
│   ├── utils/                # Utility modules (Stage 2+)
│   │   ├── logger.ts         # Logging utilities
│   │   ├── errors.ts         # Error handling utilities
│   │   ├── validation.ts     # Input validation helpers
│   │   └── httpClient.ts     # Graph REST API client (Stage 4+)
│   ├── tools/                # Tool implementations (Stage 4+)
│   │   └── retrieval.ts      # M365 Copilot Retrieval API
│   └── auth/                 # Authentication modules (Stage 3+)
│       └── identity.ts       # Azure Identity integration
├── build/                    # Compiled JavaScript (generated)
├── package.json              # Dependencies and scripts
├── tsconfig.json             # TypeScript configuration
├── .gitignore                # Git ignore rules
├── CLAUDE.md                 # This file - Claude Code instructions
└── README.md                 # User-facing documentation
```

## Development Workflow

### Starting New Work
Before beginning any new task:
```bash
# Pull latest changes from remote
git pull origin master
```

### During Development
1. Use modular design principles
2. Add utilities to `src/utils/` directory
3. Add tools to `src/tools/` directory organized by feature
4. Ensure proper error handling and logging
5. Update documentation as you go

### Completing Work
When task is complete:
1. Update `CLAUDE.md` with any architecture changes
2. Update `README.md` with user-facing changes
3. Run tests (when available)
4. Build the project: `npm run build`
5. Test manually with Claude Code CLI
6. Commit changes with descriptive message
7. Push to remote if configured: `git push origin master` (only if remote origin exists)

## Stage-Specific Guidelines

### Stage 2: Enhanced Tools & Error Handling (COMPLETED)
Completed features:
- Created reusable utility modules for logging, error handling, and validation
- Added test tools (echo, serverInfo) to verify functionality
- Improved error messages and debugging capabilities
- Established patterns for future stages

### Stage 3: Azure Identity Integration (COMPLETED)
Completed features:
- Implemented Azure AD authentication with InteractiveBrowser method
- Added token management with caching and auto-refresh
- Created default multi-tenant app configuration with override capability
- Added authentication tools (authConfig, authTest)
- **Authentication Enforcement**: All tools except authTest require authentication
- Auto-authentication on server startup with fallback to manual authentication
- **Required Microsoft Graph API Permissions**:
  - Sites.Read.All - Access SharePoint sites
  - Mail.Read - Read user mail
  - People.Read.All - Read organizational contacts
  - OnlineMeetingTranscript.Read.All - Read meeting transcripts
  - Chat.Read - Read Teams chats
  - ChannelMessage.Read.All - Read Teams channel messages
  - ExternalItem.Read.All - Read external items
  - Files.Read.All - Read all files

### Stage 4: M365 Copilot Retrieval API (COMPLETED)
Completed features:
- Created HTTP client utility (`src/utils/httpClient.ts`) for Graph REST API calls
- Implemented Copilot Retrieval API tool (`src/tools/retrieval.ts`)
- Added `m365copilotretrieval` MCP tool - RAG-based retrieval from SharePoint and OneDrive
- **Parallel retrieval**: Automatically searches both SharePoint and OneDrive simultaneously
- Combines and sorts results by relevance score
- Uses beta endpoints for preview features
- Returns relevant text extracts with metadata (title, author, relevance scores)
- Comprehensive error handling for API failures (401, 403, 429, 500)
- Removed all test and debug tools

**Implementation Approach:**
- Direct REST API calls via fetch() instead of SDK (simpler for preview APIs)
- Modular design: httpClient utility can be reused for future API integrations
- Hardcoded parallel calls to both 'sharePoint' and 'oneDriveBusiness' data sources
- Fixed request parameters: resourceMetadata=['title','author'], maximumNumberOfResults=5 per source (max 10 total)
- User-configurable: queryString only
- Simplicity over abstraction: no unnecessary parameters or configuration options
- Result size control: Limited to prevent agent overload while maintaining good coverage

### Stage 5-6: Additional API Integration
Each stage will:
- Add specific API tool implementations
- Reuse httpClient utility for consistency
- Include comprehensive error handling
- Provide clear documentation

### Stage 7: Production Polish
Final stage will:
- Add comprehensive testing
- Optimize performance
- Improve documentation
- Add deployment guides

## Code Style Guidelines

### TypeScript
- Use strict TypeScript configuration
- Prefer explicit types over implicit
- Use ES modules (not CommonJS)
- Follow async/await patterns

### Error Handling
- Always catch and handle errors gracefully
- Provide meaningful error messages
- Use custom error types for different scenarios
- Log errors with appropriate context

### Logging
- Use the logger utility (not console.log)
- Log to stderr to avoid interfering with stdio protocol
- Include timestamp and context in logs
- Use appropriate log levels (debug, info, warn, error)

### Validation
- Validate all tool inputs
- Provide clear validation error messages
- Use validation helper functions for common patterns

## Testing Strategy

### Manual Testing
Currently using manual testing with Claude Code CLI:
1. Build project: `npm run build`
2. Test tools through Claude Code
3. Verify error handling
4. Check logs for issues

### Future Automated Testing
Will add in Stage 8:
- Unit tests for utilities
- Integration tests for tools
- End-to-end tests for API workflows

## Git & GitHub

### Commit Messages
Use conventional commit format:
- `feat: ` for new features
- `fix: ` for bug fixes
- `docs: ` for documentation changes
- `refactor: ` for code refactoring
- `test: ` for adding tests

### Branch Strategy
- `master` is the main development branch
- Create feature branches for major changes
- Keep commits focused and atomic

## Dependencies

### Production Dependencies
- `@modelcontextprotocol/sdk`: MCP server implementation
- `@azure/identity`: Azure AD authentication (Stage 3+)

### Development Dependencies
- `typescript`: Type checking and compilation
- `@types/node`: Node.js type definitions

### Future Dependencies (Stage 4+)
- `@microsoft/microsoft-graph-client`: Graph API client
- Additional packages as needed per stage

## Environment Configuration

### Stage 1-2
No environment configuration required.

### Stage 3 (Current)
Optional environment configuration via `.env` file:
- `AZURE_TENANT_ID`: Override default 'common' tenant (optional)
- `AZURE_CLIENT_ID`: Override default multi-tenant app (optional)
- `AZURE_CLIENT_SECRET`: Required for ClientSecret auth method only
- `AUTH_METHOD`: Choose authentication method (DeviceCode, ClientSecret, ManagedIdentity)
- `LOG_LEVEL`: Set logging level (DEBUG, INFO, WARN, ERROR)

**Default Configuration:**
- ClientID: `f44ab954-9e38-4330-aa49-e93d73ab0ea6` (built-in multi-tenant app)
- TenantID: `common` (multi-tenant support)
- AuthMethod: `DeviceCode` (no secrets needed)

### Stage 4+
Will add:
- M365 Copilot API endpoints
- Additional API-specific configuration

## Troubleshooting

### Build Issues
- Ensure Node.js 20+ is installed
- Run `npm install` to update dependencies
- Check TypeScript errors in output

### Runtime Issues
- Check stderr output for logs
- Verify MCP server connection: `claude mcp list`
- Test tools individually
- Check error handling is working

### Git Issues
- Ensure local is synced with remote before starting work
- Use GitHub CLI (`gh`) for GitHub operations when possible
- Fallback to git commands if needed

## Multi-Agent Development Notes

When multiple agents work on this project:
- Each agent should check current stage and todo list
- Agents should coordinate on shared files
- Modular structure allows parallel development of different tools
- Communication through git commits and documentation updates

## Documentation Synchronization

### CLAUDE.md (This File)
- Technical architecture and development guide
- Detailed instructions for Claude Code agents
- Internal project structure and decisions

### README.md
- User-facing documentation
- Setup and usage instructions
- Feature list and examples

Both files should be updated together when making significant changes.
