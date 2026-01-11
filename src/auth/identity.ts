/**
 * Azure AD Identity and Authentication Module
 * Handles authentication with Azure AD using various credential flows
 */

import {
  InteractiveBrowserCredential,
  DeviceCodeCredential,
  DeviceCodeInfo,
  TokenCredential,
  AccessToken,
  TokenCachePersistenceOptions,
  AuthenticationRecord,
  useIdentityPlugin,
  serializeAuthenticationRecord,
  deserializeAuthenticationRecord,
} from '@azure/identity';
import { cachePersistencePlugin } from '@azure/identity-cache-persistence';
import { info, warn, error as logError } from '../utils/logger.js';
import { AuthenticationError, ConfigurationError } from '../utils/errors.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Enable persistent token caching
useIdentityPlugin(cachePersistencePlugin);

/**
 * Authentication method types
 * - InteractiveBrowser: Opens a browser window for authentication (requires GUI)
 * - DeviceCode: Shows a code and URL for authentication on any device (works in headless environments)
 */
export type AuthMethod = 'InteractiveBrowser' | 'DeviceCode';

/**
 * Azure AD configuration interface
 */
export interface AzureConfig {
  tenantId?: string;
  clientId?: string;
  clientSecret?: string;
  authMethod?: AuthMethod;
}

/**
 * Authentication manager class
 */
export class AuthenticationManager {
  private credential: TokenCredential | null = null;
  private config: AzureConfig;
  private tokenCache: Map<string, { token: AccessToken; expiresAt: number }> = new Map();
  private authRecord: AuthenticationRecord | null = null;

  constructor(config?: AzureConfig) {
    this.config = config || this.loadConfigFromEnv();
  }

  /**
   * Get the path to the authentication record file
   */
  private getAuthRecordPath(): string {
    const homeDir = os.homedir();
    const authDir = path.join(homeDir, '.IdentityService');
    if (!fs.existsSync(authDir)) {
      fs.mkdirSync(authDir, { recursive: true });
    }
    return path.join(authDir, 'm365-copilot-mcp-auth.json');
  }

  /**
   * Load authentication record from disk
   */
  private loadAuthRecord(): AuthenticationRecord | null {
    try {
      const authRecordPath = this.getAuthRecordPath();
      if (fs.existsSync(authRecordPath)) {
        const data = fs.readFileSync(authRecordPath, 'utf-8');
        this.authRecord = deserializeAuthenticationRecord(data);
        info('Loaded authentication record from disk');
        return this.authRecord;
      }
    } catch (error) {
      logError('Failed to load authentication record', error);
    }
    return null;
  }

  /**
   * Save authentication record to disk
   * Note: AuthenticationRecord contains only non-sensitive account metadata
   * (username, tenant, authority). It does NOT contain tokens or secrets.
   * Actual tokens are encrypted and stored in OS credential manager via
   * @azure/identity-cache-persistence (Windows DPAPI, macOS Keychain, Linux LibSecret)
   */
  private saveAuthRecord(authRecord: AuthenticationRecord): void {
    try {
      const authRecordPath = this.getAuthRecordPath();
      const serialized = serializeAuthenticationRecord(authRecord);

      // Write file with restricted permissions (0600 = owner read/write only)
      // On Windows, this sets file to be accessible only by the current user
      fs.writeFileSync(authRecordPath, serialized, { encoding: 'utf-8', mode: 0o600 });

      this.authRecord = authRecord;
      info('Saved authentication record to disk with restricted permissions');
    } catch (error) {
      logError('Failed to save authentication record', error);
    }
  }

  /**
   * Get the redirect URI for interactive browser authentication
   * Defaults to http://localhost (Azure AD ignores port for localhost URIs)
   * Can be overridden via REDIRECT_URI environment variable
   */
  private getRedirectUri(): string {
    return process.env.REDIRECT_URI || 'http://localhost';
  }

  /**
   * Load configuration from environment variables
   * Uses default multi-tenant app registration with option to override
   */
  private loadConfigFromEnv(): AzureConfig {
    // Default ClientID for the registered multi-tenant app
    // Can be overridden via AZURE_CLIENT_ID environment variable
    const DEFAULT_CLIENT_ID = 'f44ab954-9e38-4330-aa49-e93d73ab0ea6';

    // Default to 'common' for multi-tenant support
    // Can be overridden via AZURE_TENANT_ID environment variable for single-tenant scenarios
    const DEFAULT_TENANT_ID = 'common';

    return {
      tenantId: process.env.AZURE_TENANT_ID || DEFAULT_TENANT_ID,
      clientId: process.env.AZURE_CLIENT_ID || DEFAULT_CLIENT_ID,
      clientSecret: process.env.AZURE_CLIENT_SECRET,
      authMethod: (process.env.AUTH_METHOD as AuthMethod) || 'InteractiveBrowser',
    };
  }

  /**
   * Device code callback - displays authentication instructions to the user
   */
  private deviceCodeCallback(deviceCodeInfo: DeviceCodeInfo): void {
    // Output to stderr so it doesn't interfere with MCP protocol
    console.error('\n' + '='.repeat(60));
    console.error('DEVICE CODE AUTHENTICATION REQUIRED');
    console.error('='.repeat(60));
    console.error(deviceCodeInfo.message);
    console.error('='.repeat(60) + '\n');
  }

  /**
   * Initialize the credential based on auth method
   * Supports fallback from InteractiveBrowser to DeviceCode on headless systems
   */
  public async initialize(): Promise<void> {
    const { tenantId, clientId, clientSecret, authMethod } = this.config;

    info('Initializing authentication', { authMethod });

    try {
      if (!tenantId || !clientId) {
        throw new ConfigurationError(
          'Missing required Azure AD configuration',
          {
            hasTenantId: !!tenantId,
            hasClientId: !!clientId,
          }
        );
      }

      // Try to load authentication record from disk
      const authRecord = this.loadAuthRecord();
      if (authRecord) {
        info('Found existing authentication record - will attempt silent authentication');
      }

      // Determine which auth method to use
      const effectiveAuthMethod = authMethod || 'InteractiveBrowser';

      if (effectiveAuthMethod === 'DeviceCode') {
        // User explicitly requested DeviceCode
        this.credential = this.createDeviceCodeCredential(tenantId, clientId, authRecord);
      } else {
        // Default: InteractiveBrowser
        this.credential = this.createInteractiveBrowserCredential(tenantId, clientId, authRecord);
      }

      info(`Initialized ${this.credential.constructor.name} with persistent token cache`);
    } catch (error) {
      logError('Failed to initialize authentication', error);
      throw error;
    }
  }

  /**
   * Create InteractiveBrowserCredential
   */
  private createInteractiveBrowserCredential(
    tenantId: string,
    clientId: string,
    authRecord: AuthenticationRecord | null
  ): InteractiveBrowserCredential {
    const redirectUri = this.getRedirectUri();
    info('Creating InteractiveBrowserCredential', { redirectUri });

    return new InteractiveBrowserCredential({
      tenantId,
      clientId,
      redirectUri,
      authenticationRecord: authRecord || undefined,
      tokenCachePersistenceOptions: {
        enabled: true,
        name: 'm365-copilot-mcp-cache',
      },
    });
  }

  /**
   * Create DeviceCodeCredential
   */
  private createDeviceCodeCredential(
    tenantId: string,
    clientId: string,
    authRecord: AuthenticationRecord | null
  ): DeviceCodeCredential {
    info('Creating DeviceCodeCredential (for headless environments)');

    return new DeviceCodeCredential({
      tenantId,
      clientId,
      userPromptCallback: this.deviceCodeCallback.bind(this),
      authenticationRecord: authRecord || undefined,
      tokenCachePersistenceOptions: {
        enabled: true,
        name: 'm365-copilot-mcp-cache',
      },
    });
  }

  /**
   * Check if we should fallback to DeviceCode
   * Returns true if the error indicates browser/GUI is not available
   */
  private shouldFallbackToDeviceCode(error: unknown): boolean {
    const errorMsg = error instanceof Error ? error.message : String(error);
    const errorName = error instanceof Error ? error.name : '';

    // Check for common headless environment errors
    const headlessIndicators = [
      'Unable to open a browser',
      'no browser',
      'DISPLAY',
      'headless',
      'Cannot open browser',
      'browser window',
      'CredentialUnavailableError',
    ];

    return headlessIndicators.some(
      indicator => errorMsg.toLowerCase().includes(indicator.toLowerCase()) ||
                   errorName.toLowerCase().includes(indicator.toLowerCase())
    );
  }

  /**
   * Get access token for specified scopes
   * Supports automatic fallback from InteractiveBrowser to DeviceCode
   */
  public async getAccessToken(scopes: string[]): Promise<string> {
    if (!this.credential) {
      throw new AuthenticationError('Authentication not initialized. Call initialize() first.');
    }

    const scopeKey = scopes.join(',');

    // Check cache
    const cached = this.tokenCache.get(scopeKey);
    if (cached && cached.expiresAt > Date.now() + 5 * 60 * 1000) {
      // Token is valid for at least 5 more minutes
      info('Using cached access token', { scopes });
      return cached.token.token;
    }

    try {
      info('Requesting new access token from Azure AD...', { scopes });

      if (this.credential instanceof InteractiveBrowserCredential) {
        info('  This may open a browser window for interactive login');
      } else if (this.credential instanceof DeviceCodeCredential) {
        info('  Using device code flow - check console for authentication instructions');
      }

      const tokenResponse = await this.credential.getToken(scopes);

      if (!tokenResponse) {
        throw new AuthenticationError('Failed to obtain access token');
      }

      // Cache the token
      this.tokenCache.set(scopeKey, {
        token: tokenResponse,
        expiresAt: tokenResponse.expiresOnTimestamp,
      });

      info('✓ Access token obtained successfully', {
        scopes,
        expiresAt: new Date(tokenResponse.expiresOnTimestamp).toISOString(),
      });

      return tokenResponse.token;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      const errorName = error instanceof Error ? error.name : 'Unknown';

      // Check if we should fallback to DeviceCode
      if (this.credential instanceof InteractiveBrowserCredential && this.shouldFallbackToDeviceCode(error)) {
        warn('InteractiveBrowser authentication failed - falling back to DeviceCode flow');
        warn('  This usually happens in headless environments without a browser');

        // Load auth record for fallback credential
        const authRecord = this.authRecord;

        // Create DeviceCode credential as fallback
        this.credential = this.createDeviceCodeCredential(
          this.config.tenantId!,
          this.config.clientId!,
          authRecord
        );

        info('Retrying authentication with DeviceCode flow...');

        // Retry with DeviceCode
        try {
          const tokenResponse = await this.credential.getToken(scopes);

          if (!tokenResponse) {
            throw new AuthenticationError('Failed to obtain access token with DeviceCode');
          }

          // Cache the token
          this.tokenCache.set(scopeKey, {
            token: tokenResponse,
            expiresAt: tokenResponse.expiresOnTimestamp,
          });

          info('✓ Access token obtained successfully via DeviceCode', {
            scopes,
            expiresAt: new Date(tokenResponse.expiresOnTimestamp).toISOString(),
          });

          return tokenResponse.token;
        } catch (fallbackError) {
          const fallbackMsg = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
          logError('✗ DeviceCode fallback also failed', fallbackError);
          throw new AuthenticationError(
            `Failed to obtain access token (both InteractiveBrowser and DeviceCode failed): ${fallbackMsg}`,
            { scopes, originalError: errorMsg, fallbackError: fallbackMsg }
          );
        }
      }

      logError('✗ Failed to get access token', error, {
        scopes,
        errorName,
        errorMessage: errorMsg
      });
      throw new AuthenticationError(
        `Failed to obtain access token: ${errorMsg}`,
        { scopes, errorName }
      );
    }
  }


  /**
   * Clear token cache (in-memory only)
   */
  public clearCache(): void {
    info('Clearing in-memory token cache');
    this.tokenCache.clear();
  }

  /**
   * Get authentication status details for debugging
   */
  public getAuthStatus(): {
    initialized: boolean;
    configured: boolean;
    credentialType: string | null;
    cacheSize: number;
  } {
    return {
      initialized: this.credential !== null,
      configured: this.isConfigured(),
      credentialType: this.credential ? this.credential.constructor.name : null,
      cacheSize: this.tokenCache.size,
    };
  }

  /**
   * Get current configuration (without secrets)
   */
  public getConfig(): Omit<AzureConfig, 'clientSecret'> {
    return {
      tenantId: this.config.tenantId,
      clientId: this.config.clientId,
      authMethod: this.config.authMethod,
    };
  }

  /**
   * Check if authentication is configured
   */
  public isConfigured(): boolean {
    const { tenantId, clientId } = this.config;
    // InteractiveBrowser only requires tenantId and clientId
    return !!(tenantId && clientId);
  }

  /**
   * Check if we have an authentication record
   */
  public hasAuthRecord(): boolean {
    return this.authRecord !== null;
  }

  /**
   * Ensure we have an authentication record (for silent authentication on restart)
   * This method calls authenticate() which will get the auth record without
   * requiring user interaction if they're already authenticated
   */
  public async ensureAuthRecord(scopes: string[]): Promise<void> {
    if (this.authRecord) {
      return; // Already have it
    }

    if (!this.credential) {
      throw new AuthenticationError('Credential not initialized');
    }

    // Both InteractiveBrowserCredential and DeviceCodeCredential support authenticate()
    if (!(this.credential instanceof InteractiveBrowserCredential) &&
        !(this.credential instanceof DeviceCodeCredential)) {
      throw new AuthenticationError('Credential type does not support authenticate()');
    }

    try {
      info('Obtaining authentication record for silent future authentication');
      const authRecord = await this.credential.authenticate(scopes);
      if (authRecord) {
        this.saveAuthRecord(authRecord);
        info('Authentication record obtained and saved');
      }
    } catch (error) {
      // Non-fatal: we can still work without authRecord, just won't be silent on restart
      logError('Failed to obtain authentication record (non-fatal)', error);
    }
  }
}

// Export singleton instance
let authManager: AuthenticationManager | null = null;

// Global authentication state
let isAuthenticated = false;

/**
 * Required Microsoft Graph API scopes for M365 Copilot MCP Server
 * These scopes provide access to user data needed for M365 Copilot integration
 */
export const REQUIRED_SCOPES = [
  'https://graph.microsoft.com/Sites.Read.All',
  'https://graph.microsoft.com/Mail.Read',
  'https://graph.microsoft.com/People.Read.All',
  'https://graph.microsoft.com/OnlineMeetingTranscript.Read.All',
  'https://graph.microsoft.com/Chat.Read',
  'https://graph.microsoft.com/ChannelMessage.Read.All',
  'https://graph.microsoft.com/ExternalItem.Read.All',
  'https://graph.microsoft.com/Files.Read.All',
];

/**
 * Get or create the singleton authentication manager instance
 */
export function getAuthManager(config?: AzureConfig): AuthenticationManager {
  if (!authManager) {
    authManager = new AuthenticationManager(config);
  }
  return authManager;
}

/**
 * Reset the authentication manager (useful for testing)
 */
export function resetAuthManager(): void {
  authManager = null;
  isAuthenticated = false;
}

/**
 * Check if authentication has been successfully completed
 */
export function isAuthenticationReady(): boolean {
  return isAuthenticated;
}

/**
 * Get the path to the persistent token cache file
 * This matches the cache name used in tokenCachePersistenceOptions
 */
function getTokenCachePath(): string {
  const homeDir = os.homedir();

  // Different platforms store cache in different locations
  if (process.platform === 'win32') {
    // Windows: %LOCALAPPDATA%\.IdentityService\m365-copilot-mcp-cache
    const localAppData = process.env.LOCALAPPDATA || path.join(homeDir, 'AppData', 'Local');
    return path.join(localAppData, '.IdentityService', 'm365-copilot-mcp-cache');
  } else if (process.platform === 'darwin') {
    // macOS: ~/Library/Application Support/.IdentityService/m365-copilot-mcp-cache
    return path.join(homeDir, 'Library', 'Application Support', '.IdentityService', 'm365-copilot-mcp-cache');
  } else {
    // Linux: ~/.IdentityService/m365-copilot-mcp-cache
    return path.join(homeDir, '.IdentityService', 'm365-copilot-mcp-cache');
  }
}

/**
 * Logout - clears all cached credentials and authentication state
 * This function will:
 * 1. Delete the AuthenticationRecord file from disk
 * 2. Delete the persistent token cache file
 * 3. Clear in-memory token cache
 * 4. Reset the authentication manager singleton
 * 5. Reset the isAuthenticated flag
 *
 * Note: User must restart the MCP server for changes to take full effect
 */
export function logout(): void {
  try {
    info('Starting logout process');

    // Get current auth manager to access the auth record path
    const manager = authManager || new AuthenticationManager();
    const authRecordPath = (manager as any).getAuthRecordPath();

    // Delete the authentication record file if it exists
    if (fs.existsSync(authRecordPath)) {
      fs.unlinkSync(authRecordPath);
      info('Deleted authentication record file', { path: authRecordPath });
    } else {
      info('No authentication record file found to delete', { path: authRecordPath });
    }

    // Delete the persistent token cache file if it exists
    const tokenCachePath = getTokenCachePath();
    if (fs.existsSync(tokenCachePath)) {
      fs.unlinkSync(tokenCachePath);
      info('Deleted persistent token cache file', { path: tokenCachePath });
    } else {
      info('No persistent token cache file found to delete', { path: tokenCachePath });
    }

    // Clear in-memory token cache if auth manager exists
    if (authManager) {
      authManager.clearCache();
      info('Cleared in-memory token cache');
    }

    // Reset the authentication manager singleton
    resetAuthManager();
    info('Reset authentication manager');

    info('Logout completed successfully');
  } catch (error) {
    logError('Error during logout', error);
    throw new AuthenticationError('Failed to logout', { error });
  }
}

/**
 * Require authentication - performs lazy authentication on first call
 * This function will:
 * 1. Check if already authenticated (fast path)
 * 2. If not, initialize auth manager and get token
 * 3. Token will come from cache if available, or prompt user if needed
 * 4. On first authentication, save AuthenticationRecord for silent auth on restart
 *
 * Per MCP specification for STDIO transport, authentication should be
 * lazy and use environment credentials/cached tokens when available.
 */
export async function requireAuthentication(): Promise<void> {
  // Fast path: already authenticated
  if (isAuthenticated) {
    return;
  }

  const authManager = getAuthManager();

  try {
    // Initialize if not already done
    if (!authManager.isConfigured()) {
      throw new ConfigurationError(
        'Authentication not configured. Missing AZURE_TENANT_ID or AZURE_CLIENT_ID.',
        { configured: false }
      );
    }

    info('First tool call - initializing authentication');
    await authManager.initialize();

    info('Obtaining access token with required Microsoft Graph API scopes (will use cached token if available)', { scopeCount: REQUIRED_SCOPES.length });
    // This will use cached token if available, or prompt user to login
    await authManager.getAccessToken(REQUIRED_SCOPES);

    // If this is the first time (no auth record), call authenticate to get the record
    // This ensures we can do silent authentication on next restart
    if (!authManager.hasAuthRecord()) {
      info('First-time authentication - obtaining authentication record for future silent auth');
      await authManager.ensureAuthRecord(REQUIRED_SCOPES);
    }

    // Mark as authenticated
    isAuthenticated = true;
    info('Authentication successful - token obtained and cached');
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logError('Authentication failed', error);
    throw new AuthenticationError(
      `Failed to authenticate: ${errorMsg}. Please check your Azure AD configuration.`,
      { error: errorMsg }
    );
  }
}
