# Phase 1: Project Foundation - Detailed Plan

**Status:** ⚪ PENDING
**Estimated Duration:** 1 day
**Dependencies:** Phase 0 complete
**Last Updated:** 2025-11-17

---

## Overview

Install dependencies, configure TypeScript, set up logging infrastructure, and create the foundation for secure configuration management.

---

## Tasks Breakdown

### Task 1.1: Install Core Dependencies ⚪ PENDING

**Priority:** CRITICAL
**Estimated Time:** 15 minutes

#### Dependencies to Install

```bash
# Core MCP
npm install @modelcontextprotocol/sdk

# Azure Authentication
npm install @azure/msal-node

# Token Storage
npm install @1password/sdk  # If using 1Password
npm install keytar          # If using keytar

# Validation & Types
npm install zod

# Logging
npm install winston

# Utilities
npm install dotenv

# Development Dependencies
npm install -D typescript @types/node tsx
npm install -D vitest @vitest/coverage-v8
npm install -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin
npm install -D prettier
```

#### Checklist
- [ ] All production dependencies installed
- [ ] All dev dependencies installed
- [ ] `package-lock.json` generated
- [ ] No critical vulnerability warnings

#### Verification
```bash
npm list --depth=0
npm audit
```

---

### Task 1.2: TypeScript Configuration ⚪ PENDING

**Priority:** CRITICAL
**Estimated Time:** 15 minutes

#### Create tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",

    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,

    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,

    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,

    "resolveJsonModule": true,
    "allowSyntheticDefaultImports": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

#### Checklist
- [ ] tsconfig.json created
- [ ] Strict mode enabled
- [ ] Source maps enabled for debugging
- [ ] Test compilation: `npm run type-check`

---

### Task 1.3: Logging Infrastructure ⚪ PENDING

**Priority:** HIGH
**Estimated Time:** 30 minutes

#### Create src/security/logger.ts

```typescript
import winston from 'winston';

// Redact sensitive fields from logs
const redactFormat = winston.format((info) => {
  const redactedInfo = { ...info };

  // Redact sensitive fields
  const sensitiveFields = [
    'access_token',
    'refresh_token',
    'client_secret',
    'password',
    'authorization',
    'cookie',
  ];

  const redact = (obj: any): any => {
    if (typeof obj !== 'object' || obj === null) return obj;

    for (const key in obj) {
      if (sensitiveFields.some(field =>
        key.toLowerCase().includes(field.toLowerCase())
      )) {
        obj[key] = '[REDACTED]';
      } else if (typeof obj[key] === 'object') {
        obj[key] = redact(obj[key]);
      }
    }
    return obj;
  };

  return redact(redactedInfo);
});

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    redactFormat(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error'
    }),
    new winston.transports.File({
      filename: 'logs/combined.log'
    })
  ]
});

// Don't log in test environment
if (process.env.NODE_ENV === 'test') {
  logger.silent = true;
}
```

#### Test Logger Redaction

Create `tests/unit/logger.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest';
import { logger } from '../../src/security/logger';

describe('Logger Security', () => {
  it('should redact access tokens', () => {
    const spy = vi.spyOn(logger, 'info');
    logger.info('Test', { access_token: 'secret123' });

    expect(spy.mock.calls[0][1]).toMatchObject({
      access_token: '[REDACTED]'
    });
  });

  it('should redact refresh tokens', () => {
    const spy = vi.spyOn(logger, 'info');
    logger.info('Test', { refresh_token: 'secret456' });

    expect(spy.mock.calls[0][1]).toMatchObject({
      refresh_token: '[REDACTED]'
    });
  });

  it('should handle nested objects', () => {
    const spy = vi.spyOn(logger, 'info');
    logger.info('Test', {
      user: {
        name: 'John',
        access_token: 'secret789'
      }
    });

    expect(spy.mock.calls[0][1].user).toMatchObject({
      name: 'John',
      access_token: '[REDACTED]'
    });
  });
});
```

#### Checklist
- [ ] Logger created with redaction
- [ ] Console and file transports configured
- [ ] Log directory created
- [ ] Redaction tests pass
- [ ] Logs directory added to .gitignore

---

### Task 1.4: Configuration Management ⚪ PENDING

**Priority:** HIGH
**Estimated Time:** 30 minutes

#### Create src/config/environment.ts

```typescript
import { z } from 'zod';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Define configuration schema
const envSchema = z.object({
  // Azure
  AZURE_CLIENT_ID: z.string().min(1, 'Azure Client ID is required'),
  AZURE_TENANT_ID: z.string().min(1, 'Azure Tenant ID is required'),
  AZURE_CLIENT_SECRET: z.string().min(1, 'Azure Client Secret is required'),
  AZURE_REDIRECT_URI: z.string().url('Must be valid URL'),

  // Token Storage
  TOKEN_STORAGE: z.enum(['1password', 'keytar']).default('keytar'),
  OP_SERVICE_ACCOUNT_TOKEN: z.string().optional(),

  // Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),

  // Security
  RATE_LIMIT_PER_MINUTE: z.coerce.number().default(60),
  STATE_TIMEOUT_MINUTES: z.coerce.number().default(5),
});

export type Environment = z.infer<typeof envSchema>;

class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

let config: Environment;

export function loadConfiguration(): Environment {
  try {
    config = envSchema.parse(process.env);

    // Additional validation
    if (config.TOKEN_STORAGE === '1password' && !config.OP_SERVICE_ACCOUNT_TOKEN) {
      throw new ConfigurationError(
        '1Password selected but OP_SERVICE_ACCOUNT_TOKEN not provided'
      );
    }

    return config;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.map(i => `${i.path.join('.')}: ${i.message}`);
      throw new ConfigurationError(
        `Configuration validation failed:\n${issues.join('\n')}`
      );
    }
    throw error;
  }
}

export function getConfiguration(): Environment {
  if (!config) {
    throw new ConfigurationError('Configuration not loaded. Call loadConfiguration() first.');
  }
  return config;
}
```

#### Test Configuration

Create `tests/unit/config.test.ts`:
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { loadConfiguration } from '../../src/config/environment';

describe('Configuration', () => {
  beforeEach(() => {
    // Reset env for each test
    process.env = { ...process.env };
  });

  it('should load valid configuration', () => {
    process.env.AZURE_CLIENT_ID = 'test-client-id';
    process.env.AZURE_TENANT_ID = 'test-tenant-id';
    process.env.AZURE_CLIENT_SECRET = 'test-secret';
    process.env.AZURE_REDIRECT_URI = 'http://localhost:3000/callback';

    const config = loadConfiguration();
    expect(config.AZURE_CLIENT_ID).toBe('test-client-id');
  });

  it('should reject missing required fields', () => {
    expect(() => loadConfiguration()).toThrow();
  });

  it('should enforce 1Password token when selected', () => {
    process.env.TOKEN_STORAGE = '1password';
    // Missing OP_SERVICE_ACCOUNT_TOKEN

    expect(() => loadConfiguration()).toThrow(/OP_SERVICE_ACCOUNT_TOKEN/);
  });
});
```

#### Checklist
- [ ] Environment schema defined with Zod
- [ ] Configuration loader created
- [ ] Validation tests pass
- [ ] Default values set appropriately

---

### Task 1.5: Base Error Classes ⚪ PENDING

**Priority:** MEDIUM
**Estimated Time:** 20 minutes

#### Create src/security/errors.ts

```typescript
/**
 * Base error class for all application errors.
 * Ensures errors never leak sensitive information.
 */
export abstract class AppError extends Error {
  abstract readonly statusCode: number;
  abstract readonly isOperational: boolean;

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Get sanitized error for client response
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      // Never include stack traces in client responses
    };
  }
}

export class AuthenticationError extends AppError {
  readonly statusCode = 401;
  readonly isOperational = true;

  constructor(message: string = 'Authentication required') {
    super(message);
  }
}

export class AuthorizationError extends AppError {
  readonly statusCode = 403;
  readonly isOperational = true;

  constructor(message: string = 'Access denied') {
    super(message);
  }
}

export class ValidationError extends AppError {
  readonly statusCode = 400;
  readonly isOperational = true;

  constructor(message: string = 'Invalid input') {
    super(message);
  }
}

export class RateLimitError extends AppError {
  readonly statusCode = 429;
  readonly isOperational = true;

  constructor(message: string = 'Rate limit exceeded') {
    super(message);
  }
}

export class GraphAPIError extends AppError {
  readonly statusCode = 502;
  readonly isOperational = false;

  constructor(message: string = 'External service error') {
    super(message);
  }
}

export class TokenStorageError extends AppError {
  readonly statusCode = 500;
  readonly isOperational = false;

  constructor(message: string = 'Token storage error') {
    super(message);
  }
}
```

#### Checklist
- [ ] Base error class created
- [ ] All domain-specific errors defined
- [ ] Errors sanitized (no sensitive data)
- [ ] Error tests created

---

## Success Criteria

Phase 1 is complete when:

✅ All dependencies installed without critical vulnerabilities
✅ TypeScript builds successfully (`npm run build`)
✅ Logger redacts sensitive fields (tests pass)
✅ Configuration loads from environment (tests pass)
✅ Base error classes defined and tested
✅ `npm test` runs successfully

---

## Outputs Checklist

- [ ] `package.json` with all dependencies
- [ ] `tsconfig.json` with strict settings
- [ ] `src/security/logger.ts` - Logging with redaction
- [ ] `src/config/environment.ts` - Configuration management
- [ ] `src/security/errors.ts` - Error classes
- [ ] `tests/unit/logger.test.ts` - Logger tests
- [ ] `tests/unit/config.test.ts` - Config tests
- [ ] All tests passing

---

## Next Phase

Once Phase 1 is complete, proceed to [Phase 2: Token Management](./phase-2-details.md)
