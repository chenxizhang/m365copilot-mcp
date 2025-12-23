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
5. **Stage 5**: M365 Copilot Search API (COMPLETED)
6. **Stage 6**: M365 Copilot Chat API (COMPLETED)
7. **Stage 7**: Production Polish (COMPLETED - Ready for npm publication!)
8. **Stage 8**: Future Enhancements (Optional)

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
│   │   ├── retrieval.ts      # M365 Copilot Retrieval API
│   │   ├── search.ts         # M365 Copilot Search API
│   │   └── chat.ts           # M365 Copilot Chat API
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

### Publishing to npm

#### Method 1: Automated via GitHub Actions (Recommended)
1. Ensure all changes are committed and pushed to master
2. Create a new GitHub Release:
   - Go to repository → Releases → Create a new release
   - Create a new tag (e.g., `v0.7.0`)
   - Write release notes
   - Click "Publish release"
3. GitHub Actions will automatically:
   - Build the project
   - Publish to npm with provenance
   - Generate a summary

**Prerequisites:**
- Add `NPM_TOKEN` to repository secrets (Settings → Secrets and variables → Actions)
- Token should be an "Automation" token from npmjs.com

#### Method 2: Manual Trigger via GitHub Actions
1. Go to Actions → Publish to npm → Run workflow
2. Optionally specify a version (leave empty to use package.json version)
3. Workflow will build and publish automatically

#### Method 3: Manual Local Publishing (Not Recommended)
Only use for testing or when GitHub Actions is unavailable:
1. Ensure all changes are committed and pushed
2. Update version: `npm version [major|minor|patch]`
3. Build will run automatically (prepublishOnly script)
4. Publish to npm: `npm publish`
5. Push version tag: `git push --tags`

**Note:** The `prepublishOnly` script ensures the project is always built before publishing.

### GitHub Actions Workflows

#### CI Workflow (`.github/workflows/ci.yml`)
- **Triggers:** Push or PR to master/main branch
- **Actions:**
  - Runs on Node.js 20.x and 22.x (matrix build)
  - Installs dependencies with `npm ci`
  - Builds the project
  - Verifies build artifacts exist
  - Generates build summary
- **Purpose:** Ensures code quality and build success before merging

#### Publish Workflow (`.github/workflows/publish.yml`)
- **Triggers:**
  - GitHub Release published
  - Manual workflow dispatch
- **Actions:**
  - Checks out code
  - Installs dependencies
  - Builds project
  - Optionally updates version (manual trigger only)
  - Publishes to npm with provenance
  - Generates publish summary with package link
- **Purpose:** Automated npm publishing with supply chain security

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
- **Fixed Redirect URI**: Uses `http://localhost` as default redirect URI (Azure AD ignores port for localhost URIs, allowing dynamic port allocation)
- **Customizable Redirect URI**: Can be overridden via `REDIRECT_URI` environment variable
- **Required Microsoft Graph API Permissions**:
  - Sites.Read.All - Access SharePoint sites
  - Mail.Read - Read user mail
  - People.Read.All - Read organizational contacts
  - OnlineMeetingTranscript.Read.All - Read meeting transcripts
  - Chat.Read - Read Teams chats
  - ChannelMessage.Read.All - Read Teams channel messages
  - ExternalItem.Read.All - Read external items
  - Files.Read.All - Read all files

**Implementation Notes:**
- Uses `http://localhost` as default redirect URI (no specific port)
- Azure AD matches this URI regardless of the actual port used by the application
- Solves the random port issue where users couldn't pre-register redirect URIs
- Alternative redirect URI supported: `https://login.microsoftonline.com/common/oauth2/nativeclient`

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

### Stage 5: M365 Copilot Search API (COMPLETED)
Completed features:
- Implemented Copilot Search API tool (`src/tools/search.ts`)
- Added `m365copilotsearch` MCP tool - document search across M365 content
- Single endpoint call to `/beta/copilot/search` (searches all sources automatically)
- Returns document links with preview text and resource type
- Simple response format: totalCount, searchHits array with webUrl/preview/resourceType
- Reuses httpClient utility from Stage 4
- Comprehensive error handling consistent with retrieval tool

**Implementation Approach:**
- Direct REST API calls via fetch() using existing httpClient utility
- Single POST request with `{ query: string }` parameter
- User-configurable: query only (no unnecessary parameters)
- Simplicity: Microsoft Graph API handles multi-source search automatically
- Returns raw API response with document metadata for agent use

### Stage 6: M365 Copilot Chat API (COMPLETED)
Completed features:
- Implemented Copilot Chat API tool (`src/tools/chat.ts`)
- Added `m365copilotchat` MCP tool - conversational AI with M365 context
- **Two-step chat flow**: Creates conversation, then sends chat messages
- **Session-based conversation management**: Automatically caches and reuses conversation ID within session
- Supports optional conversation ID parameter for explicit conversation control
- User timezone support for time-aware queries (required IANA format)
- Returns full conversation history with messages, attributions, and adaptive cards
- Reuses httpClient utility and follows established patterns

**Implementation Approach:**
- Direct REST API calls via fetch() using existing httpClient utility
- Module-level conversation ID caching for session persistence
- Two API endpoints:
  - POST `/beta/copilot/conversations` - Create new conversation
  - POST `/beta/copilot/conversations/{id}/chat` - Send chat message
- Smart conversation management: Creates new conversation only when needed, otherwise reuses cached ID
- User-configurable: message (required), conversationId (optional), timeZone (required)
- Simplicity: Automatic conversation lifecycle management, no manual conversation tracking required
- Helper functions: `clearConversationCache()` and `getCachedConversationId()` for advanced use cases

### Stage 7: Production Polish (COMPLETED)
Completed features:
- **NPM publication preparation**: Enhanced package.json with comprehensive metadata
  - Added repository, bugs, homepage links to GitHub
  - Enhanced keywords for better discoverability (18 keywords covering MCP, M365, AI, RAG, etc.)
  - Added `engines` field requiring Node.js >= 20
  - Added `files` field to specify published content
  - Added `prepublishOnly` script for automatic build before publishing
  - Created MIT LICENSE file
- **Tool description optimization**: Rewrote all tool descriptions with clear differentiation
  - Added "Use this when" sections with specific scenarios
  - Added example queries/messages for each tool
  - Added "DO NOT use for" sections to guide agent decision-making
  - Improved discoverability for AI agents to understand when to use each tool
- **User-friendly documentation**: Completely rewrote README.md for end users
  - Removed technical details (build processes, project structure, development stages)
  - Focused on installation, configuration, and usage
  - Added clear tool selection guide with comparison table
  - Added practical example prompts for each tool
  - Added privacy & security information
  - Simplified troubleshooting section
  - Added CI/CD badges and developer setup instructions
- **GitHub Actions CI/CD**: Automated build and publish workflows
  - **CI workflow** (`.github/workflows/ci.yml`): Runs on every push/PR to master
    - Tests build on Node.js 20.x and 22.x
    - Verifies build artifacts
    - Generates build summary
  - **Publish workflow** (`.github/workflows/publish.yml`): Publishes to npm
    - Triggers on GitHub Release creation
    - Supports manual trigger with optional version override
    - Uses npm provenance for supply chain security
    - Automatic build via prepublishOnly script
    - Requires NPM_TOKEN secret in repository settings
- **Logout functionality**: Added `m365copilotlogout` tool for account switching
  - Clears all cached credentials (authentication record and token cache)
  - Does NOT require authentication to use
  - Deletes both AuthenticationRecord file (`~/.IdentityService/m365-copilot-mcp-auth.json`)
  - Deletes persistent token cache file (cross-platform support):
    - Windows: `%LOCALAPPDATA%\.IdentityService\m365-copilot-mcp-cache`
    - macOS: `~/Library/Application Support/.IdentityService/m365-copilot-mcp-cache`
    - Linux: `~/.IdentityService/m365-copilot-mcp-cache`
  - Resets in-memory authentication state
  - User must restart MCP server for full effect
  - Enables easy switching between different Microsoft 365 accounts

**Ready for npm publication with automated CI/CD!**

**Implementation Notes:**
- Four tools (logout, retrieval, search, chat) now have distinct, well-documented use cases
- AI agents can easily understand which tool to use based on user intent
- End users have clear, simple instructions without technical complexity
- Package metadata optimized for npm search and discovery
- Fully automated CI/CD pipeline for quality assurance and publishing
- Logout functionality provides clean account switching without manual file deletion

### Stage 8: Future Enhancements (Optional)
Potential future improvements:
- Add comprehensive automated testing (unit, integration, e2e)
- Performance optimization and caching strategies
- Additional M365 API integrations
- Enhanced error recovery and retry logic

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
- `AUTH_METHOD`: Choose authentication method (InteractiveBrowser)
- `REDIRECT_URI`: Override default redirect URI (optional, default: `http://localhost`)
- `LOG_LEVEL`: Set logging level (DEBUG, INFO, WARN, ERROR)

**Default Configuration:**
- ClientID: `f44ab954-9e38-4330-aa49-e93d73ab0ea6` (built-in multi-tenant app)
- TenantID: `common` (multi-tenant support)
- AuthMethod: `InteractiveBrowser` (browser-based authentication)
- RedirectURI: `http://localhost` (Azure AD ignores port for localhost URIs)

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
