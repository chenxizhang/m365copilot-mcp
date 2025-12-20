import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { logger, info, error as logError } from './utils/logger.js';
import { formatErrorResponse, ValidationError } from './utils/errors.js';
import { requireString, optionalString } from './utils/validation.js';
import { requireAuthentication } from './auth/identity.js';
import { copilotRetrieval } from './tools/retrieval.js';

/**
 * Create and configure the MCP server
 */
export function createServer(): Server {
  const server = new Server(
    {
      name: 'm365-copilot-mcp',
      version: '0.4.0',
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
      name: 'm365copilotretrieval',
      description: 'The Microsoft 365 Copilot Retrieval tool allows for the retrieval of relevant text extracts from SharePoint and OneDrive content that the calling user has access to, while respecting the defined access controls within the tenant. The tool searches both SharePoint and OneDrive in parallel and returns combined results sorted by relevance. Use the Retrieval API to ground your generative AI solutions with Microsoft 365 data while optimizing for context recall.',
      inputSchema: {
        type: 'object',
        properties: {
          queryString: {
            type: 'string',
            description: 'Natural language query to search for relevant content in Microsoft 365',
          },
        },
        required: ['queryString'],
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
        case 'm365copilotretrieval': {
          // Require authentication for this tool
          await requireAuthentication();

          // Validate and extract parameters
          const queryString = requireString(args?.queryString, 'queryString');

          // Call the Copilot Retrieval API
          const result = await copilotRetrieval(queryString);

          // Return the raw JSON response
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
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
