import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { logger, info, error as logError } from './utils/logger.js';
import { formatErrorResponse, ValidationError } from './utils/errors.js';
import { requireString, optionalString, optionalBoolean } from './utils/validation.js';
import { getAuthManager, requireAuthentication, isAuthenticationReady } from './auth/identity.js';

/**
 * Create and configure the MCP server
 */
export function createServer(): Server {
  const server = new Server(
    {
      name: 'm365-copilot-mcp',
      version: '0.3.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Define available tools
  const tools: Tool[] = [
    {
      name: 'hello',
      description: 'A simple test tool that echoes back a greeting message. Use this to verify the MCP server connection is working.',
      inputSchema: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'The name to greet',
          },
        },
        required: ['name'],
      },
    },
    {
      name: 'echo',
      description: 'Echoes back the provided message with optional formatting. Useful for testing parameter passing and validation.',
      inputSchema: {
        type: 'object',
        properties: {
          message: {
            type: 'string',
            description: 'The message to echo back',
          },
          uppercase: {
            type: 'boolean',
            description: 'Convert message to uppercase (default: false)',
          },
          prefix: {
            type: 'string',
            description: 'Optional prefix to add before the message',
          },
        },
        required: ['message'],
      },
    },
    {
      name: 'serverInfo',
      description: 'Returns information about the MCP server including version, capabilities, and available utilities.',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'authConfig',
      description: 'Returns current Azure AD authentication configuration (without secrets). Shows tenant ID, client ID, and auth method.',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
  ];

  // Handle list_tools request
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    info('Received list_tools request');
    return {
      tools,
    };
  });

  // Handle call_tool request
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    info(`Received call_tool request for: ${name}`, { args });

    try {
      switch (name) {
        case 'hello': {
          // Require authentication for this tool (lazy authentication on first call)
          await requireAuthentication();

          const userName = requireString(args?.name, 'name');

          return {
            content: [
              {
                type: 'text',
                text: `Hello, ${userName}! Welcome to M365 Copilot MCP Server. The connection is working successfully!`,
              },
            ],
          };
        }

        case 'echo': {
          // Require authentication for this tool (lazy authentication on first call)
          await requireAuthentication();

          const message = requireString(args?.message, 'message');
          const uppercase = args?.uppercase === true;
          const prefix = optionalString(args?.prefix, 'prefix');

          let result = message;
          if (uppercase) {
            result = result.toUpperCase();
          }
          if (prefix) {
            result = `${prefix} ${result}`;
          }

          return {
            content: [
              {
                type: 'text',
                text: result,
              },
            ],
          };
        }

        case 'serverInfo': {
          // Require authentication for this tool (lazy authentication on first call)
          await requireAuthentication();

          const authManager = getAuthManager();
          const serverInfo = {
            name: 'm365-copilot-mcp',
            version: '0.3.0',
            stage: 'Stage 3 - Azure Identity Integration',
            capabilities: {
              tools: true,
              resources: false,
              prompts: false,
            },
            utilities: {
              errorHandling: ['MCPError', 'ValidationError', 'AuthenticationError', 'APIError', 'ConfigurationError'],
              logging: ['debug', 'info', 'warn', 'error'],
              validation: ['requireString', 'requireNumber', 'requireBoolean', 'requireArray', 'requireObject', 'requireEnum'],
            },
            authentication: {
              configured: authManager.isConfigured(),
              authenticated: isAuthenticationReady(),
              method: 'InteractiveBrowser',
              defaultClientId: 'f44ab954-9e38-4330-aa49-e93d73ab0ea6',
              defaultTenantId: 'common',
              enforcementPolicy: 'All tools require authentication (lazy, on first call)',
              note: 'Per MCP spec for STDIO: credentials retrieved from environment, authentication happens on first tool call',
            },
            toolCount: tools.length,
            availableTools: tools.map(t => t.name),
          };

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(serverInfo, null, 2),
              },
            ],
          };
        }

        case 'authConfig': {
          // This tool does NOT require authentication - it's used for diagnostics
          const authManager = getAuthManager();
          const config = authManager.getConfig();
          const authStatus = authManager.getAuthStatus();
          const authConfigInfo = {
            configured: authManager.isConfigured(),
            authenticated: isAuthenticationReady(),
            tenantId: config.tenantId,
            clientId: config.clientId,
            authMethod: config.authMethod,
            authStatus: authStatus,
            note: 'This tool is for diagnostics. It does not require authentication.',
          };

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(authConfigInfo, null, 2),
              },
            ],
          };
        }

        default:
          throw new ValidationError(`Unknown tool: ${name}`, { toolName: name });
      }
    } catch (error) {
      logError(`Error handling tool call: ${name}`, error);
      const errorResponse = formatErrorResponse(error);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(errorResponse, null, 2),
          },
        ],
        isError: true,
      };
    }
  });

  return server;
}
