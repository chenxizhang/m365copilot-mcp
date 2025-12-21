# M365 Copilot MCP Server

An MCP (Model Context Protocol) server that integrates with Microsoft 365 Copilot APIs, providing access to Retrieval, Search, and Chat capabilities.

## Current Status: Stage 6 - M365 Copilot Chat API

This stage adds the Chat API tool, enabling conversational AI interactions with M365 Copilot. Includes automatic conversation management and time-aware responses.

## Prerequisites

- Node.js 20+ and npm
- Claude Code CLI installed
- Microsoft 365 account with Copilot license (for later stages)
- Azure AD application registration (for later stages)

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Build the Project

```bash
npm run build
```

### 3. Test the Server Locally

```bash
node build/index.js
```

You should see:
```
M365 Copilot MCP Server started successfully
Waiting for client connection...
```

Press `Ctrl+C` to stop the server.

### 4. Add to Claude Code CLI

```bash
claude mcp add --transport stdio m365-copilot -- node C:\work\m365copilot-mcp\build\index.js
```

### 5. Verify Connection

```bash
claude mcp list
```

You should see `m365-copilot` in the list with status "connected".

## Available Tools

### m365copilotretrieval

The Microsoft 365 Copilot Retrieval tool allows for the retrieval of relevant text extracts from SharePoint and OneDrive content that the calling user has access to, while respecting the defined access controls within the tenant. Use the Retrieval API to ground your generative AI solutions with Microsoft 365 data while optimizing for context recall.

**What it does:**
- Performs RAG (Retrieval-Augmented Generation) search across user's M365 content
- **Searches both SharePoint and OneDrive in parallel** automatically
- Returns up to 10 combined results (5 from each source) sorted by relevance score
- Includes metadata: title, author, web URL, relevance scores
- Respects user's access permissions automatically

**Parameters:**
- `queryString` (string, required): Natural language query to search for relevant content

**Example usage:**
- Ask Claude: "Use m365copilotretrieval to search for information about project deadlines"
- Ask Claude: "Search my M365 content for budget reports from last quarter"
- Ask Claude: "Find documents mentioning the new product launch"

**Response format:**
Returns JSON with `retrievalHits` array containing:
- `webUrl`: Link to the source document
- `extracts`: Array of relevant text snippets with `text` and `relevanceScore`
- `resourceType`: Type of resource (e.g., "externalItem")
- `resourceMetadata`: Document metadata (title, author, etc.)

**Difference from Search:**
- **Retrieval** (this tool): Returns text content extracts for RAG/grounding - ideal for answering questions
- **Search** (see below): Returns document links with previews - ideal for finding specific documents

### m365copilotsearch

The Microsoft 365 Copilot Search tool searches across SharePoint, OneDrive, and other M365 content to find relevant documents. Returns document links with preview text for document discovery workflows.

**What it does:**
- Performs document search across user's M365 content sources
- **Automatically searches all available sources** (SharePoint, OneDrive, etc.)
- Returns document metadata: web URLs, preview text, resource types
- Respects user's access permissions automatically
- Ideal for finding specific documents or files

**Parameters:**
- `query` (string, required): Natural language search query to find relevant documents

**Example usage:**
- Ask Claude: "Use m365copilotsearch to find VPN setup documents"
- Ask Claude: "Search for documents about Q4 budget planning"
- Ask Claude: "Find files mentioning the corporate network configuration"

**Response format:**
Returns JSON with:
- `totalCount`: Total number of search results found
- `searchHits`: Array of results containing:
  - `webUrl`: Direct link to the document
  - `preview`: Text preview/snippet from the document
  - `resourceType`: Type of resource (e.g., "driveItem")

**Difference from Retrieval:**
- **Search** (this tool): Returns document links/previews - ideal for finding documents
- **Retrieval** (see above): Returns text content extracts - ideal for answering questions with context

### m365copilotchat

The Microsoft 365 Copilot Chat tool enables conversational AI interactions with your M365 data. It maintains conversation context within a session, allowing multi-turn dialogues with Copilot about your Microsoft 365 content, schedule, and tasks.

**What it does:**
- Enables interactive conversations with M365 Copilot
- **Automatic conversation management**: Maintains conversation context within session
- **Time-aware responses**: Uses user's timezone for accurate time-based queries
- Returns full conversation history including messages, attributions, and adaptive cards
- Respects user's access permissions automatically

**Parameters:**
- `message` (string, required): The message or question to send to Copilot
- `conversationId` (string, optional): Conversation ID to continue an existing conversation. If not provided, automatically creates and reuses a conversation within the session.
- `timeZone` (string, required): User timezone in IANA format (e.g., "America/New_York", "Asia/Shanghai", "Europe/London"). Must be a valid IANA timezone identifier.

**Example usage:**
- Ask Claude: "Use m365copilotchat to ask what meetings I have tomorrow at 9 AM"
- Ask Claude: "Chat with Copilot about my upcoming deadlines this week"
- Ask Claude: "Ask Copilot to summarize recent team discussions"
- With timezone: Ask Claude: "Use m365copilotchat with timezone 'America/Los_Angeles' to check my schedule"

**Response format:**
Returns JSON with:
- `id`: Conversation ID (can be used for future messages)
- `createdDateTime`: When the conversation was created
- `displayName`: Conversation title (auto-generated from first message)
- `state`: Conversation state (e.g., "active")
- `turnCount`: Number of turns in the conversation
- `messages`: Array of conversation messages containing:
  - `id`: Message ID
  - `text`: Message content
  - `createdDateTime`: Message timestamp
  - `adaptiveCards`: Rich UI cards (if any)
  - `attributions`: Source references and citations

**How it works:**
- **First call**: Creates a new conversation and caches the ID for the session
- **Subsequent calls**: Automatically reuses the cached conversation ID
- **Session persistence**: Maintains conversation context across multiple tool calls within the same Claude Code session
- **Manual control**: Optionally provide your own conversation ID to continue a specific conversation

## Development

### Build and Watch Mode

```bash
npm run watch
```

This will automatically rebuild when you make changes to the source code.

### Rebuild and Restart

After making code changes:

```bash
npm run build
# Claude Code will automatically reconnect to the updated server
```

## Project Structure

```
m365copilot-mcp/
├── src/
│   ├── index.ts              # Main entry point with stdio transport
│   ├── server.ts             # MCP server initialization and tools
│   ├── utils/                # Utility modules
│   │   ├── logger.ts         # Logging utilities
│   │   ├── errors.ts         # Error handling utilities
│   │   ├── validation.ts     # Input validation helpers
│   │   └── httpClient.ts     # Graph REST API client
│   ├── tools/                # Tool implementations
│   │   ├── retrieval.ts      # Copilot Retrieval API
│   │   ├── search.ts         # Copilot Search API
│   │   └── chat.ts           # Copilot Chat API
│   └── auth/                 # Authentication modules
│       └── identity.ts       # Azure Identity integration
├── build/                    # Compiled JavaScript (generated)
├── .env.example              # Example environment configuration
├── package.json              # Dependencies and scripts
├── tsconfig.json             # TypeScript configuration
├── .gitignore                # Git ignore rules
├── CLAUDE.md                 # Development guide for Claude Code
└── README.md                 # This file
```

## Key Features

### Stage 6: M365 Copilot Chat API
- **Copilot Chat API**: Conversational AI with M365 context
- **Automatic conversation management**: Session-based conversation ID caching
- **Time-aware responses**: Timezone support for accurate time-based queries
- **Multi-turn dialogues**: Maintains conversation context across multiple messages
- **Rich responses**: Returns messages with attributions, citations, and adaptive cards

### Stage 5: M365 Copilot Search API
- **Copilot Search API**: Document search across all M365 content sources
- **Document discovery**: Returns document links with preview text
- **Simple integration**: Single endpoint automatically searches all sources
- **Complementary to Retrieval**: Search finds documents, Retrieval extracts content

### Stage 4: M365 Copilot Retrieval API
- **Copilot Retrieval API**: RAG-based search across SharePoint, OneDrive, and Copilot connectors
- **HTTP Client Utility**: Reusable Graph REST API client with error handling
- **Direct REST API calls**: Uses fetch() for preview beta endpoints
- **Structured responses**: Returns text extracts with metadata and relevance scores

### Stage 3: Azure AD Authentication
- **InteractiveBrowser authentication**: Automatically opens browser for login
- **Persistent token caching**: Tokens cached locally, survives server restarts
- **Automatic token refresh**: No re-authentication needed
- **Built-in multi-tenant app**: No configuration required (Client ID: f44ab954-9e38-4330-aa49-e93d73ab0ea6)
- **Environment variable override**: Optional custom Azure AD app configuration

### Required Permissions
The server requests the following Microsoft Graph API permissions during authentication:
- **Sites.Read.All** - Access SharePoint sites and content
- **Mail.Read** - Read user mailbox messages
- **People.Read.All** - Read organizational directory and contacts
- **OnlineMeetingTranscript.Read.All** - Read Teams meeting transcripts
- **Chat.Read** - Read Teams chat messages
- **ChannelMessage.Read.All** - Read Teams channel messages
- **ExternalItem.Read.All** - Read external search items
- **Files.Read.All** - Read files across SharePoint and OneDrive

These permissions are required for M365 Copilot Retrieval API access.

### Stage 2: Error Handling & Utilities
- **Custom error types**: MCPError, ValidationError, AuthenticationError, APIError
- **Structured logging**: Configurable log levels (DEBUG, INFO, WARN, ERROR)
- **Input validation**: Type-safe parameter validation functions

## Configuration

### Default Setup (No Configuration Required)
The server comes with a built-in multi-tenant Azure AD app - just start the server!

1. **First run**: Browser opens automatically for Microsoft 365 login
2. **Subsequent runs**: Uses cached token (no browser popup)
3. **Token management**: Automatic refresh before expiration

### Custom Azure AD App (Optional)
To use your own Azure AD app, create a `.env` file:
```bash
AZURE_CLIENT_ID=your-client-id
AZURE_TENANT_ID=your-tenant-id  # Optional, defaults to 'common'
LOG_LEVEL=DEBUG  # Optional, defaults to INFO
```

## Next Stages

- **Stage 7**: Production Polish (comprehensive testing, performance optimization, deployment guides)

## Troubleshooting

### Server won't start

- Ensure all dependencies are installed: `npm install`
- Ensure the project is built: `npm run build`
- Check for TypeScript errors during build

### Claude Code can't connect

- Verify the server path in the claude mcp add command is correct
- Try removing and re-adding the server:
  ```bash
  claude mcp remove m365-copilot
  claude mcp add --transport stdio m365-copilot -- node C:\work\m365copilot-mcp\build\index.js
  ```

### Tool not showing up

- Restart Claude Code CLI
- Check server logs (stderr output)
- Verify the server is running: `claude mcp list`

## License

MIT
