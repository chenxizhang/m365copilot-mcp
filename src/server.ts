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
      description: `Retrieves relevant text extracts from user's SharePoint and OneDrive content to answer questions using RAG (Retrieval-Augmented Generation). Returns text snippets with relevance scores - ideal for grounding answers in M365 data.

Use this when:
- User asks questions that need answers from their M365 content (e.g., "What did the team decide about the project?")
- You need text content to support your response with specific information
- Grounding AI responses with actual document content is required

Example queries: "project deadlines", "budget approval status", "team meeting notes about feature X"

DO NOT use for: Finding document links (use m365copilotsearch instead) or interactive conversations (use m365copilotchat instead).`,
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
      description: `Searches across SharePoint, OneDrive, and other M365 content to find and locate specific documents. Returns document links with preview text - ideal for document discovery and navigation.

Use this when:
- User wants to find or locate specific files/documents (e.g., "Find the VPN setup guide")
- User needs document links to open or share
- Building a list of relevant documents

Example queries: "quarterly budget spreadsheet", "network configuration document", "presentation about product launch"

DO NOT use for: Extracting text to answer questions (use m365copilotretrieval instead) or asking Copilot questions (use m365copilotchat instead).`,
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
      description: `Enables conversational AI interactions with Microsoft 365 Copilot. Maintains conversation context for multi-turn dialogues - ideal for complex queries, follow-up questions, and time-aware requests.

Use this when:
- User wants to have a conversation with Copilot (e.g., "Ask Copilot about my schedule")
- Questions involve time, calendar, or scheduling (e.g., "What meetings do I have tomorrow?")
- Follow-up questions or clarifications are needed
- Complex queries that benefit from Copilot's reasoning (e.g., "Summarize team discussions and action items")

Example messages: "What's on my calendar tomorrow?", "Summarize recent emails about the project", "Who should I follow up with this week?"

Requires timezone parameter (IANA format: "America/New_York", "Europe/London", "Asia/Shanghai").

DO NOT use for: Simple text retrieval (use m365copilotretrieval instead) or finding documents (use m365copilotsearch instead).`,
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
            description: 'User timezone in IANA format (e.g., "America/New_York", "Asia/Shanghai", "Europe/London"). REQUIRED - Must be a valid IANA timezone identifier.',
          },
        },
        required: ['message', 'timeZone'],
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
          const timeZone = requireString(args?.timeZone, 'timeZone');
          const conversationId = optionalString(args?.conversationId, 'conversationId');

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
