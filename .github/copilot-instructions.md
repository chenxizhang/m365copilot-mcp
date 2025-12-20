# GitHub Copilot Instructions for M365 Copilot MCP Server

This file provides context and instructions for GitHub Copilot when working on the M365 Copilot MCP Server project.

## Project Context

This is an MCP (Model Context Protocol) server that integrates Microsoft 365 Copilot APIs with Claude Code, providing tools for:
- Microsoft Graph API access
- M365 Copilot Retrieval
- M365 Copilot Search
- M365 Copilot Chat

**Current Stage:** Stage 3 - Azure Identity Integration
**Version:** 0.3.0
**Language:** TypeScript with ES modules

## Code Organization

### Directory Structure
```
src/
├── index.ts              # Entry point with stdio transport
├── server.ts             # MCP server setup and tool handlers
├── utils/                # Shared utilities
│   ├── logger.ts         # Logging with stderr output
│   ├── errors.ts         # Custom error types
│   └── validation.ts     # Input validation helpers
└── auth/                 # Authentication modules (Stage 3+)
    └── identity.ts       # Azure Identity integration
```

Future additions will include:
- `src/tools/` - Tool implementations organized by feature (Stage 4+)

### Key Principles

1. **ES Modules**: Always use `.js` extensions in imports (TypeScript requirement for ES modules)
   ```typescript
   import { logger } from './utils/logger.js';  // Correct
   ```

2. **Modular Design**: Keep utilities small and focused for parallel development
   - Each utility file should have a single clear responsibility
   - Tools should be self-contained where possible

3. **Error Handling**: Use custom error types from `utils/errors.ts`
   ```typescript
   throw new ValidationError('Invalid parameter', { paramName });
   throw new AuthenticationError('Auth failed', { reason });
   ```

4. **Logging**: Always use logger utility, never console.log
   ```typescript
   import { info, error as logError } from './utils/logger.js';
   info('Operation started', { context });
   logError('Operation failed', error, { context });
   ```

5. **Validation**: Use validation helpers for all tool parameters
   ```typescript
   import { requireString, optionalBoolean } from './utils/validation.js';
   const name = requireString(args?.name, 'name');
   const flag = optionalBoolean(args?.flag, 'flag');
   ```

## Coding Patterns

### Adding a New Tool

1. **Define the tool schema** in `server.ts`:
   ```typescript
   {
     name: 'toolName',
     description: 'Clear description of what this tool does',
     inputSchema: {
       type: 'object',
       properties: {
         param1: { type: 'string', description: 'Parameter description' },
       },
       required: ['param1'],
     },
   }
   ```

2. **Implement the handler** in the switch statement:
   ```typescript
   case 'toolName': {
     const param1 = requireString(args?.param1, 'param1');

     info('Tool called', { param1 });

     // Implementation here

     return {
       content: [{ type: 'text', text: result }],
     };
   }
   ```

### Error Handling Pattern

```typescript
try {
  // Tool implementation
  return { content: [{ type: 'text', text: result }] };
} catch (error) {
  logError(`Error in tool: ${name}`, error);
  const errorResponse = formatErrorResponse(error);
  return {
    content: [{ type: 'text', text: JSON.stringify(errorResponse, null, 2) }],
    isError: true,
  };
}
```

### Validation Pattern

```typescript
// Required parameters
const required = requireString(args?.required, 'required');

// Optional parameters with defaults
const optional = optionalString(args?.optional, 'optional') ?? 'default';

// Enum validation
const mode = requireEnum(args?.mode, 'mode', ['read', 'write'] as const);

// Number validation with range
const count = requireNumber(args?.count, 'count');
inRange(count, 1, 100, 'count');
```

## Stage-Specific Guidelines

### Stage 2 (Current)
Focus: Infrastructure and testing tools
- Enhance existing utilities as needed
- Add test tools to verify functionality
- Establish patterns for future stages
- No external API calls yet

### Stage 3 (Next)
Focus: Azure Identity integration
- Add `@azure/identity` dependency
- Create `src/auth/identity.ts` module
- Implement token management
- Add environment variable configuration

### Stage 4-7 (Future)
Focus: API integration
- Each stage adds specific API client
- Create tool implementations in `src/tools/`
- Follow established error handling patterns
- Add comprehensive logging

## TypeScript Configuration

- Strict mode enabled
- ES2022 target
- ES modules (not CommonJS)
- Declaration files generated
- Source maps enabled

## Testing Approach

**Current:** Manual testing with Claude Code CLI
1. Build: `npm run build`
2. Test tools through Claude Code
3. Check stderr logs for debugging

**Future:** Automated tests in Stage 8

## Common Patterns

### Logging Levels
- `debug()`: Detailed debugging info (not shown by default)
- `info()`: General operational messages
- `warn()`: Warning conditions
- `error()`: Error conditions with error object

### Import Organization
```typescript
// External dependencies first
import { Server } from '@modelcontextprotocol/sdk/server/index.js';

// Internal utilities second
import { logger, info } from './utils/logger.js';
import { ValidationError } from './utils/errors.js';
import { requireString } from './utils/validation.js';
```

### File Naming
- Use camelCase for TypeScript files: `logger.ts`, `errors.ts`
- Use PascalCase for class files (when needed): `ClientManager.ts`
- Keep filenames concise and descriptive

## Development Workflow

### Before Editing
1. Understand current stage and goals
2. Check existing patterns in codebase
3. Identify which utilities to use

### During Editing
1. Follow modular design principles
2. Use appropriate error types
3. Add logging at key points
4. Validate all inputs
5. Keep functions focused and testable

### After Editing
1. Ensure TypeScript compiles: `npm run build`
2. Test manually with Claude Code
3. Update documentation if needed

## Common Utilities Reference

### Validation (`utils/validation.ts`)
- `requireString(value, name)` - Validate required string
- `requireNumber(value, name)` - Validate required number
- `requireBoolean(value, name)` - Validate required boolean
- `requireArray(value, name)` - Validate required array
- `requireObject(value, name)` - Validate required object
- `requireEnum(value, name, values)` - Validate enum value
- `optional*()` - Optional parameter variants
- `minLength(str, min, name)` - Minimum string length
- `maxLength(str, max, name)` - Maximum string length
- `inRange(num, min, max, name)` - Number range validation

### Errors (`utils/errors.ts`)
- `ValidationError` - Invalid input parameters
- `AuthenticationError` - Auth failures (Stage 3+)
- `APIError` - External API errors (Stage 4+)
- `ConfigurationError` - Configuration issues
- `formatErrorResponse(error)` - Format for MCP response

### Logging (`utils/logger.ts`)
- `info(message, context?)` - Info level log
- `warn(message, context?)` - Warning level log
- `error(message, error?, context?)` - Error level log
- `debug(message, context?)` - Debug level log
- `setLogLevel(level)` - Change log level

## Dependencies

### Current
- `@modelcontextprotocol/sdk@^1.0.4` - MCP protocol implementation
- `@azure/identity@^4.13.0` - Azure AD authentication (Stage 3+)
- `typescript@^5.3.3` - Type checking and compilation
- `@types/node@^20.11.0` - Node.js type definitions

### Planned (Stage 4+)
- `@microsoft/microsoft-graph-client` - Graph API client

## Environment Variables

### Current (Stage 3)
- `LOG_LEVEL` - Set logging level (DEBUG, INFO, WARN, ERROR)
- `AZURE_TENANT_ID` - Azure AD tenant (optional, defaults to 'common')
- `AZURE_CLIENT_ID` - Azure AD application (optional, uses built-in app)
- `AZURE_CLIENT_SECRET` - Azure AD secret (required for ClientSecret method only)
- `AUTH_METHOD` - Authentication method (DeviceCode, ClientSecret, or ManagedIdentity)

**Defaults:**
- Client ID: `f44ab954-9e38-4330-aa49-e93d73ab0ea6` (multi-tenant app)
- Tenant ID: `common` (multi-tenant support)
- Auth Method: `DeviceCode` (no secrets required)

## Git Practices

- Use conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`
- Keep commits focused and atomic
- Update `CLAUDE.md` and `README.md` together
- Sync this file with `CLAUDE.md` for consistency

## Troubleshooting Tips

### TypeScript Errors
- Check import paths include `.js` extension
- Verify all types are properly imported
- Run `npm run build` to see full error list

### Runtime Errors
- Check stderr output for logs
- Verify input validation is working
- Test error handling with invalid inputs

### Tool Not Available
- Rebuild: `npm run build`
- MCP server reconnects automatically
- Check tool is added to tools array and switch statement
