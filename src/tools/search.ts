import { callGraphApi } from '../utils/httpClient.js';
import { getAuthManager, REQUIRED_SCOPES } from '../auth/identity.js';
import { info } from '../utils/logger.js';

/**
 * Copilot Search API Response Types
 */
export interface SearchHit {
  webUrl: string;
  preview: string;
  resourceType: string;
}

export interface SearchResponse {
  totalCount: number;
  searchHits: SearchHit[];
}

/**
 * Call Microsoft 365 Copilot Search API
 * Searches across SharePoint, OneDrive, and other M365 content
 *
 * @param query - Natural language search query from the user
 * @returns Search response with document links and previews
 */
export async function copilotSearch(
  query: string
): Promise<SearchResponse> {
  info('Calling Copilot Search API', {
    queryLength: query.length,
  });

  // Get access token
  const authManager = getAuthManager();
  const accessToken = await authManager.getAccessToken(REQUIRED_SCOPES);

  // Call Search API
  const result = await callGraphApi(
    '/beta/copilot/search',
    'POST',
    { query },
    accessToken
  );

  info('Copilot Search API call succeeded', {
    totalCount: result.totalCount,
    hitsReturned: result.searchHits?.length || 0,
  });

  return result;
}
