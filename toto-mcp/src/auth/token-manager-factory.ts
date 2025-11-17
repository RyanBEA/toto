import { ITokenManager } from './types.js';
import { OnePasswordTokenManager } from './one-password-token-manager.js';
import { KeytarTokenManager } from './keytar-token-manager.js';
import { getConfiguration } from '../config/environment.js';
import { logger } from '../security/logger.js';

let tokenManagerInstance: ITokenManager | null = null;

/**
 * Get or create a singleton token manager instance
 * Automatically selects between 1Password and keytar based on configuration
 *
 * @returns Configured token manager instance
 */
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

/**
 * Reset the token manager singleton
 * Primarily used for testing to allow fresh instances
 */
export function resetTokenManager(): void {
  tokenManagerInstance = null;
}
