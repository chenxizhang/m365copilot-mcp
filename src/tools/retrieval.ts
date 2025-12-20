import { callGraphApi } from '../utils/httpClient.js';
import { getAuthManager, REQUIRED_SCOPES } from '../auth/identity.js';
import { info } from '../utils/logger.js';

/**
 * Copilot Retrieval API Response Types
 */
export interface RetrievalExtract {
  text: string;
  relevanceScore: number;
}

export interface RetrievalHit {
  webUrl: string;
  extracts: RetrievalExtract[];
  resourceType: string;
  resourceMetadata: {
    title?: string;
    author?: string;
    [key: string]: any;
  };
}

export interface RetrievalResponse {
  retrievalHits: RetrievalHit[];
}

/**
 * Call Microsoft 365 Copilot Retrieval API
 * Retrieves relevant text extracts from SharePoint and OneDrive in parallel
 *
 * @param queryString - Natural language query from the user
 * @returns Retrieval response with relevant text extracts and metadata
 */
export async function copilotRetrieval(
  queryString: string
): Promise<RetrievalResponse> {
  info('Calling Copilot Retrieval API', {
    queryLength: queryString.length,
  });

  // Get access token
  const authManager = getAuthManager();
  const accessToken = await authManager.getAccessToken(REQUIRED_SCOPES);

  // Parallel calls to SharePoint and OneDrive
  const [sharePointResult, oneDriveResult] = await Promise.all([
    callGraphApi(
      '/beta/copilot/retrieval',
      'POST',
      {
        queryString,
        dataSource: 'sharePoint',
        resourceMetadata: ['title', 'author'],
        maximumNumberOfResults: 5,
      },
      accessToken
    ),
    callGraphApi(
      '/beta/copilot/retrieval',
      'POST',
      {
        queryString,
        dataSource: 'oneDriveBusiness',
        resourceMetadata: ['title', 'author'],
        maximumNumberOfResults: 5,
      },
      accessToken
    ),
  ]);

  // Combine results from both sources
  const combinedHits = [
    ...sharePointResult.retrievalHits,
    ...oneDriveResult.retrievalHits,
  ];

  // Sort by highest relevance score in each hit
  combinedHits.sort((a, b) => {
    const maxScoreA = a.extracts.length > 0
      ? Math.max(...a.extracts.map((e: RetrievalExtract) => e.relevanceScore))
      : 0;
    const maxScoreB = b.extracts.length > 0
      ? Math.max(...b.extracts.map((e: RetrievalExtract) => e.relevanceScore))
      : 0;
    return maxScoreB - maxScoreA;
  });

  info('Copilot Retrieval API calls succeeded', {
    totalHits: combinedHits.length,
    sharePointHits: sharePointResult.retrievalHits.length,
    oneDriveHits: oneDriveResult.retrievalHits.length,
  });

  return { retrievalHits: combinedHits };
}
