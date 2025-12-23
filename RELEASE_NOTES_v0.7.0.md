# Release Notes for v0.7.0

## Summary
This release completes **Stage 7 (Production Polish)** and marks the first production-ready version of the M365 Copilot MCP Server. The package is now optimized for npm publication with comprehensive metadata, improved documentation, and automated CI/CD workflows.

## What's New in v0.7.0

### NPM Publication Preparation
- ✅ Enhanced package.json with comprehensive metadata
- ✅ Added repository, bugs, and homepage links to GitHub
- ✅ Enhanced keywords for better discoverability (18 keywords covering MCP, M365, AI, RAG, etc.)
- ✅ Added engines field requiring Node.js >= 20
- ✅ Added files field to specify published content
- ✅ Added prepublishOnly script for automatic build before publishing
- ✅ Created MIT LICENSE file

### Tool Description Optimization
- ✅ Rewrote all tool descriptions with clear differentiation
- ✅ Added "Use this when" sections with specific scenarios
- ✅ Added example queries/messages for each tool
- ✅ Added "DO NOT use for" sections to guide agent decision-making
- ✅ Improved discoverability for AI agents to understand when to use each tool

### User-Friendly Documentation
- ✅ Completely rewrote README.md for end users
- ✅ Removed technical details (build processes, project structure, development stages)
- ✅ Focused on installation, configuration, and usage
- ✅ Added clear tool selection guide with comparison table
- ✅ Added practical example prompts for each tool
- ✅ Added privacy & security information
- ✅ Simplified troubleshooting section
- ✅ Added CI/CD badges and developer setup instructions

### GitHub Actions CI/CD
- ✅ **CI workflow** (`.github/workflows/ci.yml`): Runs on every push/PR to master
  - Tests build on Node.js 20.x and 22.x
  - Verifies build artifacts
  - Generates build summary
- ✅ **Publish workflow** (`.github/workflows/publish.yml`): Publishes to npm
  - Triggers on GitHub Release creation
  - Supports manual trigger with optional version override
  - Uses npm provenance for supply chain security
  - Automatic build via prepublishOnly script

## Core Features (Stages 1-6)

### M365 Copilot Integration
- **Retrieval API** - RAG-based retrieval from SharePoint and OneDrive
- **Search API** - Document search across M365 content
- **Chat API** - Conversational AI with M365 context

### Authentication
- Azure AD authentication with InteractiveBrowser method
- Token management with caching and auto-refresh
- Default multi-tenant app configuration with override capability
- Required Microsoft Graph API permissions pre-configured

### Error Handling & Logging
- Comprehensive error handling for API failures (401, 403, 429, 500)
- Structured logging with appropriate log levels
- Validation of all tool inputs

## Installation

```bash
# Via npx (no installation required)
npx -y m365-copilot-mcp

# Or install globally
npm install -g m365-copilot-mcp

# Or install as a dependency
npm install m365-copilot-mcp
```

## Configuration

### Claude Code
```bash
# macOS/Linux
claude mcp add --scope user --transport stdio m365-copilot -- npx -y m365-copilot-mcp

# Windows
claude mcp add --scope user --transport stdio m365-copilot -- cmd /c "npx -y m365-copilot-mcp"
```

### GitHub Copilot (VS Code)
Add to your MCP settings in VS Code settings.json

## Prerequisites
- **Node.js 20+** - Runtime environment
- **Microsoft 365 account** - With Microsoft 365 Copilot license
- **MCP-compatible AI tool** - Such as Claude Code, GitHub Copilot, or any other MCP client

## Breaking Changes
None - this is the first production release.

## Migration Guide
If upgrading from pre-release versions (0.1.x - 0.6.x):
- No breaking changes
- All existing configurations will continue to work
- Tools maintain backward compatibility

## Known Issues
None at this time.

## Contributors
- chenxizhang

## Next Steps
Future enhancements (Stage 8 - Optional):
- Add comprehensive automated testing (unit, integration, e2e)
- Performance optimization and caching strategies
- Additional M365 API integrations
- Enhanced error recovery and retry logic

---

## How to Create This Release

Since the git tag `v0.7.0` has been created locally, follow these steps to publish the release:

### Option 1: Create GitHub Release (Recommended - Triggers Auto-Publish)
1. Go to https://github.com/chenxizhang/m365copilot-mcp/releases/new
2. Choose tag: `v0.7.0` (or create it if pushing the tag)
3. Release title: `v0.7.0 - Production Polish Complete`
4. Description: Copy the content from the "What's New in v0.7.0" section above
5. Click "Publish release"
6. GitHub Actions will automatically build and publish to npm

### Option 2: Manual Workflow Trigger
1. Go to https://github.com/chenxizhang/m365copilot-mcp/actions/workflows/publish.yml
2. Click "Run workflow"
3. Leave version empty (will use 0.7.0 from package.json)
4. Click "Run workflow"

### Option 3: Local Tag Push (If tag needs to be pushed)
If the tag hasn't been pushed yet:
```bash
git push origin v0.7.0
```
Then create the GitHub Release as described in Option 1.

## Verification
After release is published, verify:
1. GitHub Release appears at: https://github.com/chenxizhang/m365copilot-mcp/releases
2. NPM package updated at: https://www.npmjs.com/package/m365-copilot-mcp
3. Version 0.7.0 is shown on npm
4. CI/CD workflow completed successfully
