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
2. **Stage 2**: Enhanced Tools & Error Handling (IN PROGRESS)
3. **Stage 3**: Azure Identity Integration
4. **Stage 4**: Microsoft Graph API Test
5. **Stage 5**: M365 Copilot Retrieval API
6. **Stage 6**: M365 Copilot Search API
7. **Stage 7**: M365 Copilot Chat API
8. **Stage 8**: Production Polish

## Project Structure

```
m365copilot-mcp/
├── src/
│   ├── index.ts              # Main entry point with stdio transport
│   ├── server.ts             # MCP server initialization and tools
│   ├── utils/                # Utility modules (Stage 2+)
│   │   ├── logger.ts         # Logging utilities
│   │   ├── errors.ts         # Error handling utilities
│   │   └── validation.ts     # Input validation helpers
│   ├── tools/                # Tool implementations (Stage 3+)
│   │   ├── graph/            # Microsoft Graph API tools
│   │   ├── retrieval/        # M365 Copilot Retrieval tools
│   │   ├── search/           # M365 Copilot Search tools
│   │   └── chat/             # M365 Copilot Chat tools
│   └── auth/                 # Authentication modules (Stage 3+)
│       └── identity.ts       # Azure Identity integration
├── build/                    # Compiled JavaScript (generated)
├── .github/
│   └── copilot-instructions.md  # GitHub Copilot instructions
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
3. Sync `.github/copilot-instructions.md` with `CLAUDE.md`
4. Run tests (when available)
5. Build the project: `npm run build`
6. Test manually with Claude Code CLI
7. Commit changes with descriptive message
8. Push to remote: `git push origin master`

## Stage-Specific Guidelines

### Stage 2: Enhanced Tools & Error Handling
Current focus on:
- Creating reusable utility modules for logging, error handling, and validation
- Adding more test tools to verify functionality
- Improving error messages and debugging capabilities
- Establishing patterns for future stages

### Stage 3: Azure Identity Integration
Will focus on:
- Setting up Azure AD authentication
- Implementing token management
- Environment configuration for credentials

### Stage 4-7: API Integration
Each stage will:
- Add specific API client implementations
- Create tools that expose API functionality
- Include comprehensive error handling
- Provide clear documentation

### Stage 8: Production Polish
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

### Development Dependencies
- `typescript`: Type checking and compilation
- `@types/node`: Node.js type definitions

### Future Dependencies (Stage 3+)
- `@azure/identity`: Azure AD authentication
- `@microsoft/microsoft-graph-client`: Graph API client
- Additional packages as needed per stage

## Environment Configuration

### Stage 1-2
No environment configuration required.

### Stage 3+
Will require:
- Azure AD tenant ID
- Azure AD client ID
- Azure AD client secret
- M365 Copilot API endpoints

Configuration will be managed through `.env` file (not committed to git).

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

### copilot-instructions.md
- Adapted version for GitHub Copilot
- Same core information, different format
- Keep synchronized with CLAUDE.md

### README.md
- User-facing documentation
- Setup and usage instructions
- Feature list and examples

All three files should be updated together when making significant changes.
