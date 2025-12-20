/**
 * Azure AD Identity and Authentication Module
 * Handles authentication with Azure AD using various credential flows
 */

import {
  ClientSecretCredential,
  DeviceCodeCredential,
  InteractiveBrowserCredential,
  ManagedIdentityCredential,
  TokenCredential,
  AccessToken,
  TokenCachePersistenceOptions,
} from '@azure/identity';
import { info, warn, error as logError } from '../utils/logger.js';
import { AuthenticationError, ConfigurationError } from '../utils/errors.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * Authentication method types
 */
export type AuthMethod = 'ClientSecret' | 'DeviceCode' | 'InteractiveBrowser' | 'ManagedIdentity';

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

  constructor(config?: AzureConfig) {
    this.config = config || this.loadConfigFromEnv();
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
   * Initialize the credential based on auth method
   */
  public async initialize(): Promise<void> {
    const { tenantId, clientId, clientSecret, authMethod } = this.config;

    info('Initializing authentication', { authMethod });

    try {
      switch (authMethod) {
        case 'ClientSecret':
          if (!tenantId || !clientId || !clientSecret) {
            throw new ConfigurationError(
              'Missing required Azure AD configuration for ClientSecret auth',
              {
                hastenantId: !!tenantId,
                hasClientId: !!clientId,
                hasClientSecret: !!clientSecret,
              }
            );
          }
          this.credential = new ClientSecretCredential(tenantId, clientId, clientSecret);
          info('Initialized ClientSecretCredential');
          break;

        case 'DeviceCode':
          if (!tenantId || !clientId) {
            throw new ConfigurationError(
              'Missing required Azure AD configuration for DeviceCode auth',
              {
                hasTenantId: !!tenantId,
                hasClientId: !!clientId,
              }
            );
          }
          this.credential = new DeviceCodeCredential({
            tenantId,
            clientId,
            userPromptCallback: (info) => {
              console.error('\n' + '='.repeat(60));
              console.error('DEVICE CODE AUTHENTICATION');
              console.error('='.repeat(60));
              console.error(`\nPlease visit: ${info.verificationUri}`);
              console.error(`\nEnter code: ${info.userCode}`);
              console.error('\n' + '='.repeat(60) + '\n');
            },
          });
          info('Initialized DeviceCodeCredential');
          break;

        case 'InteractiveBrowser':
          if (!tenantId || !clientId) {
            throw new ConfigurationError(
              'Missing required Azure AD configuration for InteractiveBrowser auth',
              {
                hasTenantId: !!tenantId,
                hasClientId: !!clientId,
              }
            );
          }
          this.credential = new InteractiveBrowserCredential({
            tenantId,
            clientId,
            tokenCachePersistenceOptions: {
              enabled: true,
              name: 'm365-copilot-mcp-cache',
            },
          });
          info('Initialized InteractiveBrowserCredential with persistent token cache');
          break;

        case 'ManagedIdentity':
          if (clientId) {
            this.credential = new ManagedIdentityCredential(clientId);
            info('Initialized ManagedIdentityCredential with client ID');
          } else {
            this.credential = new ManagedIdentityCredential();
            info('Initialized ManagedIdentityCredential (system-assigned)');
          }
          break;

        default:
          throw new ConfigurationError(`Unknown auth method: ${authMethod}`);
      }
    } catch (error) {
      logError('Failed to initialize authentication', error);
      throw error;
    }
  }

  /**
   * Get access token for specified scopes
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
      info('Requesting new access token', { scopes });
      const tokenResponse = await this.credential.getToken(scopes);

      if (!tokenResponse) {
        throw new AuthenticationError('Failed to obtain access token');
      }

      // Cache the token
      this.tokenCache.set(scopeKey, {
        token: tokenResponse,
        expiresAt: tokenResponse.expiresOnTimestamp,
      });

      info('Access token obtained successfully', {
        scopes,
        expiresAt: new Date(tokenResponse.expiresOnTimestamp).toISOString(),
      });

      return tokenResponse.token;
    } catch (error) {
      logError('Failed to get access token', error, { scopes });
      throw new AuthenticationError(
        `Failed to obtain access token: ${error instanceof Error ? error.message : String(error)}`,
        { scopes }
      );
    }
  }

  /**
   * Test authentication by attempting to get a token
   */
  public async testAuthentication(scopes?: string[]): Promise<boolean> {
    const testScopes = scopes || ['https://graph.microsoft.com/.default'];

    try {
      info('Testing authentication', { scopes: testScopes });
      await this.getAccessToken(testScopes);
      info('Authentication test successful');
      return true;
    } catch (error) {
      warn('Authentication test failed', { error });
      return false;
    }
  }

  /**
   * Clear token cache
   */
  public clearCache(): void {
    info('Clearing token cache');
    this.tokenCache.clear();
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
    const { tenantId, clientId, clientSecret, authMethod } = this.config;

    switch (authMethod) {
      case 'ClientSecret':
        return !!(tenantId && clientId && clientSecret);
      case 'DeviceCode':
        return !!(tenantId && clientId);
      case 'ManagedIdentity':
        return true; // Managed Identity doesn't require explicit config
      default:
        return false;
    }
  }
}

// Export singleton instance
let authManager: AuthenticationManager | null = null;

// Global authentication state
let isAuthenticated = false;

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
 * Set authentication state
 */
export function setAuthenticationState(state: boolean): void {
  isAuthenticated = state;
  info(`Authentication state changed: ${state ? 'authenticated' : 'not authenticated'}`);
}

/**
 * Require authentication - throws error if not authenticated
 */
export function requireAuthentication(): void {
  if (!isAuthenticated) {
    throw new AuthenticationError(
      'Authentication not ready. The server is still initializing authentication or authentication failed during startup. Please check server logs for details.'
    );
  }
}
