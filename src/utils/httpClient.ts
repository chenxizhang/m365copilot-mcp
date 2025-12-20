import { APIError } from './errors.js';
import { info, error as logError, debug } from './logger.js';

/**
 * Call Microsoft Graph REST API
 * @param endpoint - API endpoint path (e.g., '/beta/copilot/retrieval')
 * @param method - HTTP method
 * @param body - Request body (will be JSON stringified)
 * @param accessToken - Azure AD access token
 * @returns Parsed JSON response
 */
export async function callGraphApi(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  body: any | null,
  accessToken: string
): Promise<any> {
  const url = `https://graph.microsoft.com${endpoint}`;

  debug(`Making ${method} request to ${url}`, {
    endpoint,
    hasBody: !!body,
    bodyKeys: body ? Object.keys(body) : []
  });

  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    // Log response status
    debug(`Response status: ${response.status} ${response.statusText}`);

    // Handle error responses
    if (!response.ok) {
      const errorBody = await response.text();
      let errorMessage = `Graph API error: ${response.status} ${response.statusText}`;
      let errorDetails: any = { status: response.status, statusText: response.statusText };

      // Try to parse error body as JSON
      try {
        const errorJson = JSON.parse(errorBody);
        if (errorJson.error) {
          errorMessage = errorJson.error.message || errorMessage;
          errorDetails = {
            ...errorDetails,
            code: errorJson.error.code,
            message: errorJson.error.message,
            details: errorJson.error.details,
          };
        }
      } catch {
        // Error body is not JSON, use as-is
        errorDetails.body = errorBody;
      }

      logError(`Graph API call failed: ${errorMessage}`, errorDetails);

      throw new APIError(
        errorMessage,
        response.status,
        errorDetails
      );
    }

    // Parse successful response
    const responseData = await response.json();
    info(`Graph API call succeeded: ${method} ${endpoint}`);

    return responseData;
  } catch (error) {
    // If it's already an APIError, rethrow
    if (error instanceof APIError) {
      throw error;
    }

    // Handle network errors or other failures
    logError(`Network or fetch error calling Graph API: ${method} ${endpoint}`, error);
    throw new APIError(
      `Failed to call Graph API: ${error instanceof Error ? error.message : 'Unknown error'}`,
      undefined, // No status code for network errors
      { endpoint, method, originalError: error }
    );
  }
}
