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
import { copilotSearch } from './tools/search.js';
import { copilotChat } from './tools/chat.js';

/**
 * Create and configure the MCP server
 */
export function createServer(): Server {
  const server = new Server(
    {
      name: 'm365-copilot-mcp',
      version: '0.6.0',
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
    {
      name: 'm365copilotsearch',
      description: 'The Microsoft 365 Copilot Search tool searches across SharePoint, OneDrive, and other M365 content to find relevant documents. Returns document links with preview text. Use this when you need to find specific documents or files, as opposed to retrieval which returns text content for grounding.',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Natural language search query to find relevant documents in Microsoft 365',
          },
        },
        required: ['query'],
      },
    },
    {
      name: 'm365copilotchat',
      description: 'The Microsoft 365 Copilot Chat tool enables conversational AI interactions with your M365 data. It maintains conversation context within a session, allowing multi-turn dialogues. Use this when you need to have interactive conversations with Copilot about your Microsoft 365 content, schedule, or tasks.',
      inputSchema: {
        type: 'object',
        properties: {
          message: {
            type: 'string',
            description: 'The message or question to send to Copilot',
          },
          conversationId: {
            type: 'string',
            description: 'Optional conversation ID to continue an existing conversation. If not provided, a conversation will be created automatically and reused within the session.',
          },
          timeZone: {
            type: 'string',
            description: 'User timezone in IANA format (e.g., "America/New_York", "Asia/Shanghai", "Europe/London"). Defaults to "UTC" if not provided.',
          },
        },
        required: ['message'],
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

        case 'm365copilotsearch': {
          // Require authentication for this tool
          await requireAuthentication();

          // Validate and extract parameters
          const query = requireString(args?.query, 'query');

          // Call the Copilot Search API
          const result = await copilotSearch(query);

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

        case 'm365copilotchat': {
          // Require authentication for this tool
          await requireAuthentication();

          // Validate and extract parameters
          const message = requireString(args?.message, 'message');
          const conversationId = optionalString(args?.conversationId, 'conversationId');
          const timeZone = optionalString(args?.timeZone, 'timeZone') || 'UTC';

          // Call the Copilot Chat API
          const result = await copilotChat(message, conversationId, timeZone);

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
