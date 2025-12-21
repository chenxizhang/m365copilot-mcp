import { callGraphApi } from '../utils/httpClient.js';
import { getAuthManager, REQUIRED_SCOPES } from '../auth/identity.js';
import { info } from '../utils/logger.js';

/**
 * Copilot Chat API Response Types
 */
export interface CopilotConversation {
  id: string;
  createdDateTime: string;
  displayName: string;
  status: string;
  turnCount: number;
}

export interface CopilotMessage {
  '@odata.type': string;
  id: string;
  text: string;
  createdDateTime: string;
  adaptiveCards?: any[];
  attributions?: any[];
  sensitivityLabel?: any;
}

export interface ChatResponse {
  '@odata.context'?: string;
  id: string;
  createdDateTime: string;
  displayName: string;
  state: string;
  turnCount: number;
  messages: CopilotMessage[];
}

/**
 * Module-level conversation ID cache
 * Reuses the same conversation within a session
 */
let cachedConversationId: string | null = null;

/**
 * Create a new Copilot conversation
 * @returns Conversation object with ID
 */
async function createConversation(accessToken: string): Promise<CopilotConversation> {
  info('Creating new Copilot conversation');

  const result = await callGraphApi(
    '/beta/copilot/conversations',
    'POST',
    {},
    accessToken
  );

  info('Copilot conversation created', {
    conversationId: result.id,
  });

  return result;
}

/**
 * Send a chat message to a Copilot conversation
 * @param conversationId - The conversation ID to send the message to
 * @param message - The message text to send
 * @param timeZone - User's timezone in IANA format (e.g., 'America/New_York', 'Asia/Shanghai')
 * @param accessToken - Access token for authentication
 * @returns Chat response with conversation history
 */
async function sendChatMessage(
  conversationId: string,
  message: string,
  timeZone: string,
  accessToken: string
): Promise<ChatResponse> {
  info('Sending chat message', {
    conversationId,
    messageLength: message.length,
    timeZone,
  });

  const requestBody: any = {
    message: {
      text: message,
    },
    locationHint: {
      timeZone,
    },
  };

  const result = await callGraphApi(
    `/beta/copilot/conversations/${conversationId}/chat`,
    'POST',
    requestBody,
    accessToken
  );

  info('Chat message sent successfully', {
    conversationId: result.id,
    turnCount: result.turnCount,
    messageCount: result.messages?.length || 0,
  });

  return result;
}

/**
 * Call Microsoft 365 Copilot Chat API
 * Manages conversation lifecycle and sends chat messages
 *
 * @param message - The message/question to send to Copilot
 * @param conversationId - Optional conversation ID to continue an existing conversation
 * @param timeZone - User's timezone in IANA format (e.g., 'America/New_York', 'Asia/Shanghai')
 * @returns Chat response with conversation messages
 */
export async function copilotChat(
  message: string,
  conversationId: string | undefined,
  timeZone: string
): Promise<ChatResponse> {
  info('Calling Copilot Chat API', {
    messageLength: message.length,
    hasConversationId: !!conversationId,
    timeZone,
  });

  // Get access token
  const authManager = getAuthManager();
  const accessToken = await authManager.getAccessToken(REQUIRED_SCOPES);

  // Determine which conversation ID to use
  let activeConversationId: string;

  if (conversationId) {
    // Use provided conversation ID
    activeConversationId = conversationId;
    info('Using provided conversation ID', { conversationId });
  } else if (cachedConversationId) {
    // Reuse cached conversation ID
    activeConversationId = cachedConversationId;
    info('Reusing cached conversation ID', { conversationId: cachedConversationId });
  } else {
    // Create new conversation and cache the ID
    const conversation = await createConversation(accessToken);
    activeConversationId = conversation.id;
    cachedConversationId = conversation.id;
    info('Created and cached new conversation ID', { conversationId: cachedConversationId });
  }

  // Send chat message
  const result = await sendChatMessage(
    activeConversationId,
    message,
    timeZone,
    accessToken
  );

  return result;
}

/**
 * Clear the cached conversation ID
 * Useful for starting a fresh conversation
 */
export function clearConversationCache(): void {
  info('Clearing conversation cache');
  cachedConversationId = null;
}

/**
 * Get the current cached conversation ID
 * @returns The cached conversation ID or null if none exists
 */
export function getCachedConversationId(): string | null {
  return cachedConversationId;
}
