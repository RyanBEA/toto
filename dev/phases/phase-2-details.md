# Phase 2: Token Management - Detailed Plan

**Status:** ⚪ PENDING
**Estimated Duration:** 1 day
**Dependencies:** Phase 1 complete
**Last Updated:** 2025-11-17

---

## Overview

Implement secure token storage using an abstraction layer that supports both 1Password SDK and keytar, with automatic token refresh logic.

---

## Tasks Breakdown

### Task 2.1: Token Manager Interface ⚪ PENDING

**Priority:** CRITICAL
**Estimated Time:** 20 minutes

#### Create src/auth/types.ts

```typescript
export interface TokenSet {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp
  scope: string;
}

export interface ITokenManager {
  /**
   * Store a new token set securely
   */
  storeTokens(tokens: TokenSet): Promise<void>;

  /**
   * Retrieve stored tokens
   * @throws TokenStorageError if tokens don't exist
   */
  getTokens(): Promise<TokenSet>;

  /**
   * Check if valid tokens exist
   */
  hasValidTokens(): Promise<boolean>;

  /**
   * Clear stored tokens (logout)
   */
  clearTokens(): Promise<void>;

  /**
   * Update only the access token (after refresh)
   */
  updateAccessToken(accessToken: string, expiresAt: number): Promise<void>;
}
```

#### Checklist
- [ ] Interface defined
- [ ] TokenSet type defined
- [ ] All methods documented

---

### Task 2.2: 1Password Implementation ⚪ PENDING

**Priority:** HIGH
**Estimated Time:** 45 minutes

#### Create src/auth/one-password-token-manager.ts

```typescript
import { createClient, Client } from '@1password/sdk';
import { ITokenManager, TokenSet } from './types';
import { TokenStorageError } from '../security/errors';
import { logger } from '../security/logger';

export class OnePasswordTokenManager implements ITokenManager {
  private client: Client | null = null;
  private readonly vaultName = 'MCP-Secrets';
  private readonly itemTitle = 'MS-Todo-OAuth-Tokens';

  async initialize(): Promise<void> {
    try {
      this.client = await createClient({
        auth: process.env.OP_SERVICE_ACCOUNT_TOKEN!,
        integrationName: 'Todo MCP Server',
        integrationVersion: 'v1.0.0',
      });

      logger.info('1Password token manager initialized');
    } catch (error) {
      logger.error('Failed to initialize 1Password client', { error });
      throw new TokenStorageError('Failed to initialize 1Password');
    }
  }

  async storeTokens(tokens: TokenSet): Promise<void> {
    if (!this.client) {
      throw new TokenStorageError('1Password client not initialized');
    }

    try {
      // Check if item exists
      const existing = await this.findExistingItem();

      if (existing) {
        // Update existing item
        await this.client.items.update(existing.id, {
          fields: [
            {
              id: 'access_token',
              value: tokens.accessToken,
              type: 'concealed'
            },
            {
              id: 'refresh_token',
              value: tokens.refreshToken,
              type: 'concealed'
            },
            {
              id: 'expires_at',
              value: tokens.expiresAt.toString(),
              type: 'string'
            },
            {
              id: 'scope',
              value: tokens.scope,
              type: 'string'
            },
          ],
        });
      } else {
        // Create new item
        await this.client.items.create({
          vault: this.vaultName,
          title: this.itemTitle,
          category: 'API_CREDENTIAL',
          fields: [
            {
              label: 'access_token',
              value: tokens.accessToken,
              type: 'concealed'
            },
            {
              label: 'refresh_token',
              value: tokens.refreshToken,
              type: 'concealed'
            },
            {
              label: 'expires_at',
              value: tokens.expiresAt.toString(),
              type: 'string'
            },
            {
              label: 'scope',
              value: tokens.scope,
              type: 'string'
            },
          ],
        });
      }

      logger.info('Tokens stored successfully in 1Password');
    } catch (error) {
      logger.error('Failed to store tokens in 1Password', { error });
      throw new TokenStorageError('Failed to store tokens');
    }
  }

  async getTokens(): Promise<TokenSet> {
    if (!this.client) {
      throw new TokenStorageError('1Password client not initialized');
    }

    try {
      const accessToken = await this.client.secrets.resolve(
        `op://${this.vaultName}/${this.itemTitle}/access_token`
      );
      const refreshToken = await this.client.secrets.resolve(
        `op://${this.vaultName}/${this.itemTitle}/refresh_token`
      );
      const expiresAt = await this.client.secrets.resolve(
        `op://${this.vaultName}/${this.itemTitle}/expires_at`
      );
      const scope = await this.client.secrets.resolve(
        `op://${this.vaultName}/${this.itemTitle}/scope`
      );

      return {
        accessToken,
        refreshToken,
        expiresAt: parseInt(expiresAt, 10),
        scope,
      };
    } catch (error) {
      logger.error('Failed to retrieve tokens from 1Password');
      throw new TokenStorageError('No tokens found');
    }
  }

  async hasValidTokens(): Promise<boolean> {
    try {
      const tokens = await this.getTokens();
      return tokens.expiresAt > Date.now();
    } catch {
      return false;
    }
  }

  async clearTokens(): Promise<void> {
    if (!this.client) {
      throw new TokenStorageError('1Password client not initialized');
    }

    try {
      const item = await this.findExistingItem();
      if (item) {
        await this.client.items.delete(item.id);
        logger.info('Tokens cleared from 1Password');
      }
    } catch (error) {
      logger.error('Failed to clear tokens from 1Password', { error });
      throw new TokenStorageError('Failed to clear tokens');
    }
  }

  async updateAccessToken(accessToken: string, expiresAt: number): Promise<void> {
    const tokens = await this.getTokens();
    await this.storeTokens({
      ...tokens,
      accessToken,
      expiresAt,
    });
  }

  private async findExistingItem(): Promise<any> {
    try {
      const items = await this.client!.items.list({ vault: this.vaultName });
      return items.find(item => item.title === this.itemTitle);
    } catch {
      return null;
    }
  }
}
```

#### Checklist
- [ ] 1Password manager implements ITokenManager
- [ ] Handles create and update operations
- [ ] Proper error handling
- [ ] Logging without sensitive data

---

### Task 2.3: Keytar Implementation ⚪ PENDING

**Priority:** HIGH
**Estimated Time:** 30 minutes

#### Create src/auth/keytar-token-manager.ts

```typescript
import keytar from 'keytar';
import { ITokenManager, TokenSet } from './types';
import { TokenStorageError } from '../security/errors';
import { logger } from '../security/logger';

export class KeytarTokenManager implements ITokenManager {
  private readonly SERVICE_NAME = 'toto-mcp-server';

  async storeTokens(tokens: TokenSet): Promise<void> {
    try {
      await keytar.setPassword(
        this.SERVICE_NAME,
        'access_token',
        tokens.accessToken
      );
      await keytar.setPassword(
        this.SERVICE_NAME,
        'refresh_token',
        tokens.refreshToken
      );
      await keytar.setPassword(
        this.SERVICE_NAME,
        'expires_at',
        tokens.expiresAt.toString()
      );
      await keytar.setPassword(
        this.SERVICE_NAME,
        'scope',
        tokens.scope
      );

      logger.info('Tokens stored in Windows Credential Manager');
    } catch (error) {
      logger.error('Failed to store tokens in keytar', { error });
      throw new TokenStorageError('Failed to store tokens');
    }
  }

  async getTokens(): Promise<TokenSet> {
    try {
      const accessToken = await keytar.getPassword(
        this.SERVICE_NAME,
        'access_token'
      );
      const refreshToken = await keytar.getPassword(
        this.SERVICE_NAME,
        'refresh_token'
      );
      const expiresAt = await keytar.getPassword(
        this.SERVICE_NAME,
        'expires_at'
      );
      const scope = await keytar.getPassword(
        this.SERVICE_NAME,
        'scope'
      );

      if (!accessToken || !refreshToken || !expiresAt || !scope) {
        throw new TokenStorageError('Incomplete token set');
      }

      return {
        accessToken,
        refreshToken,
        expiresAt: parseInt(expiresAt, 10),
        scope,
      };
    } catch (error) {
      logger.error('Failed to retrieve tokens from keytar');
      throw new TokenStorageError('No tokens found');
    }
  }

  async hasValidTokens(): Promise<boolean> {
    try {
      const tokens = await this.getTokens();
      return tokens.expiresAt > Date.now();
    } catch {
      return false;
    }
  }

  async clearTokens(): Promise<void> {
    try {
      await keytar.deletePassword(this.SERVICE_NAME, 'access_token');
      await keytar.deletePassword(this.SERVICE_NAME, 'refresh_token');
      await keytar.deletePassword(this.SERVICE_NAME, 'expires_at');
      await keytar.deletePassword(this.SERVICE_NAME, 'scope');

      logger.info('Tokens cleared from Windows Credential Manager');
    } catch (error) {
      logger.error('Failed to clear tokens from keytar', { error });
      throw new TokenStorageError('Failed to clear tokens');
    }
  }

  async updateAccessToken(accessToken: string, expiresAt: number): Promise<void> {
    const tokens = await this.getTokens();
    await this.storeTokens({
      ...tokens,
      accessToken,
      expiresAt,
    });
  }
}
```

#### Checklist
- [ ] Keytar manager implements ITokenManager
- [ ] All credential operations handled
- [ ] Error handling implemented
- [ ] Logging configured

---

### Task 2.4: Token Manager Factory ⚪ PENDING

**Priority:** CRITICAL
**Estimated Time:** 20 minutes

#### Create src/auth/token-manager-factory.ts

```typescript
import { ITokenManager } from './types';
import { OnePasswordTokenManager } from './one-password-token-manager';
import { KeytarTokenManager } from './keytar-token-manager';
import { getConfiguration } from '../config/environment';
import { logger } from '../security/logger';

let tokenManagerInstance: ITokenManager | null = null;

export async function getTokenManager(): Promise<ITokenManager> {
  if (tokenManagerInstance) {
    return tokenManagerInstance;
  }

  const config = getConfiguration();

  if (config.TOKEN_STORAGE === '1password') {
    logger.info('Using 1Password for token storage');
    const manager = new OnePasswordTokenManager();
    await manager.initialize();
    tokenManagerInstance = manager;
  } else {
    logger.info('Using keytar (Windows Credential Manager) for token storage');
    tokenManagerInstance = new KeytarTokenManager();
  }

  return tokenManagerInstance;
}

export function resetTokenManager(): void {
  tokenManagerInstance = null;
}
```

#### Checklist
- [ ] Factory function created
- [ ] Singleton pattern implemented
- [ ] Configuration-based selection
- [ ] Reset function for testing

---

### Task 2.5: Token Refresh Logic ⚪ PENDING

**Priority:** HIGH
**Estimated Time:** 45 minutes

#### Create src/auth/token-refresher.ts

```typescript
import { ConfidentialClientApplication } from '@azure/msal-node';
import { ITokenManager, TokenSet } from './types';
import { AuthenticationError } from '../security/errors';
import { logger } from '../security/logger';
import { getConfiguration } from '../config/environment';

export class TokenRefresher {
  private msalClient: ConfidentialClientApplication;
  private tokenManager: ITokenManager;
  private refreshPromise: Promise<string> | null = null;

  constructor(tokenManager: ITokenManager) {
    const config = getConfiguration();

    this.tokenManager = tokenManager;
    this.msalClient = new ConfidentialClientApplication({
      auth: {
        clientId: config.AZURE_CLIENT_ID,
        authority: `https://login.microsoftonline.com/${config.AZURE_TENANT_ID}`,
        clientSecret: config.AZURE_CLIENT_SECRET,
      },
    });
  }

  /**
   * Get a valid access token, refreshing if necessary
   */
  async getValidAccessToken(): Promise<string> {
    const tokens = await this.tokenManager.getTokens();

    // Token is still valid (with 5-minute buffer)
    const expiryBuffer = 5 * 60 * 1000; // 5 minutes
    if (tokens.expiresAt - Date.now() > expiryBuffer) {
      return tokens.accessToken;
    }

    // Token needs refresh - ensure only one refresh happens
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.refreshAccessToken(tokens.refreshToken);

    try {
      const newAccessToken = await this.refreshPromise;
      return newAccessToken;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async refreshAccessToken(refreshToken: string): Promise<string> {
    logger.info('Refreshing access token');

    try {
      const response = await this.msalClient.acquireTokenByRefreshToken({
        refreshToken,
        scopes: ['Tasks.Read', 'User.Read'],
      });

      if (!response) {
        throw new AuthenticationError('Token refresh failed');
      }

      // Update stored tokens
      await this.tokenManager.updateAccessToken(
        response.accessToken,
        response.expiresOn?.getTime() || Date.now() + 3600000
      );

      logger.info('Access token refreshed successfully');
      return response.accessToken;

    } catch (error) {
      logger.error('Token refresh failed', { error });

      // If refresh token is invalid, clear all tokens
      await this.tokenManager.clearTokens();

      throw new AuthenticationError('Session expired. Please re-authenticate.');
    }
  }
}
```

#### Test Token Refresh

Create `tests/unit/token-refresher.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TokenRefresher } from '../../src/auth/token-refresher';
import { ITokenManager, TokenSet } from '../../src/auth/types';

class MockTokenManager implements ITokenManager {
  private tokens: TokenSet | null = null;

  async storeTokens(tokens: TokenSet) {
    this.tokens = tokens;
  }

  async getTokens() {
    if (!this.tokens) throw new Error('No tokens');
    return this.tokens;
  }

  async hasValidTokens() {
    return this.tokens !== null;
  }

  async clearTokens() {
    this.tokens = null;
  }

  async updateAccessToken(accessToken: string, expiresAt: number) {
    if (this.tokens) {
      this.tokens.accessToken = accessToken;
      this.tokens.expiresAt = expiresAt;
    }
  }
}

describe('TokenRefresher', () => {
  it('should return valid token without refresh', async () => {
    const manager = new MockTokenManager();
    await manager.storeTokens({
      accessToken: 'valid-token',
      refreshToken: 'refresh-token',
      expiresAt: Date.now() + 3600000, // 1 hour from now
      scope: 'Tasks.Read User.Read',
    });

    const refresher = new TokenRefresher(manager);
    const token = await refresher.getValidAccessToken();

    expect(token).toBe('valid-token');
  });

  // Additional tests for refresh scenarios
});
```

#### Checklist
- [ ] Token refresher created
- [ ] Handles concurrent refresh attempts
- [ ] Implements expiry buffer
- [ ] Clears tokens on refresh failure
- [ ] Tests pass

---

## Success Criteria

Phase 2 is complete when:

✅ ITokenManager interface defined
✅ Both 1Password and keytar implementations working
✅ Factory function selects correct implementation
✅ Token refresh logic handles expiry correctly
✅ All tests passing
✅ Can store and retrieve tokens end-to-end

---

## Outputs Checklist

- [ ] `src/auth/types.ts` - Interfaces
- [ ] `src/auth/one-password-token-manager.ts` - 1Password implementation
- [ ] `src/auth/keytar-token-manager.ts` - Keytar implementation
- [ ] `src/auth/token-manager-factory.ts` - Factory
- [ ] `src/auth/token-refresher.ts` - Refresh logic
- [ ] `tests/unit/token-refresher.test.ts` - Tests
- [ ] All implementations tested

---

## Next Phase

Once Phase 2 is complete, proceed to [Phase 3: OAuth Flow](./phase-3-details.md)
