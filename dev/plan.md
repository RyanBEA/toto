# Secure Microsoft To Do MCP Server - Implementation Plan

## Executive Summary
Build a security-first MCP server using **1Password SDK** for token management (superior to OS keychain), with option to use free keytar for development.

## Token Storage Decision

### Option A: 1Password SDK (RECOMMENDED)
- **Cost:** ~$8/month (Teams subscription)
- **Security:** Excellent - Zero-knowledge architecture, cryptographic enforcement
- **Setup:** Simple - 3 lines of code
- **Benefits:** Any app you run CAN'T access these tokens (unlike Windows Credential Manager)

### Option B: Hybrid Approach (BEST VALUE)
- **Development:** Use keytar (free, Windows Credential Manager)
- **Production:** Use 1Password SDK
- **Benefits:** No cost during development, strong security in production

### Option C: Keytar Only (BUDGET)
- **Cost:** Free
- **Security:** Adequate but weaker (any app can access)
- **When to use:** Only if budget absolutely prohibits 1Password

## Phase 1: Project Setup

### 1. Initialize Project (`/c/opt/toto/toto-mcp/`)
```
toto-mcp/
├── src/
│   ├── auth/           # OAuth & token management
│   ├── graph/          # Microsoft Graph client
│   ├── mcp/            # MCP server & tools
│   └── security/       # Validation & sanitization
├── config/
└── tests/
```

### 2. Core Dependencies
```json
{
  "@modelcontextprotocol/sdk": "latest",
  "@azure/msal-node": "latest",
  "@1password/sdk": "latest",  // For production
  "keytar": "latest",           // For development
  "zod": "latest",
  "winston": "latest"
}
```

## Phase 2: Token Management Implementation

### 1Password SDK Implementation:
```typescript
import { createClient } from "@1password/sdk";

class OnePasswordTokenManager {
  private client;

  async initialize() {
    this.client = await createClient({
      auth: process.env.OP_SERVICE_ACCOUNT_TOKEN,
      integrationName: "Todo MCP Server",
      integrationVersion: "v1.0.0"
    });
  }

  async storeTokens(tokens) {
    await this.client.items.create({
      vault: "MCP-Secrets",
      title: "MS Todo OAuth",
      fields: [
        { label: "access_token", value: tokens.access, type: "concealed" },
        { label: "refresh_token", value: tokens.refresh, type: "concealed" },
        { label: "expires_at", value: tokens.expiresAt, type: "string" }
      ]
    });
  }

  async getTokens() {
    const access = await this.client.secrets.resolve("op://MCP-Secrets/MS Todo OAuth/access_token");
    const refresh = await this.client.secrets.resolve("op://MCP-Secrets/MS Todo OAuth/refresh_token");
    return { access, refresh };
  }
}
```

### Development Alternative (Keytar):
```typescript
import keytar from 'keytar';

class KeytarTokenManager {
  async storeTokens(tokens) {
    await keytar.setPassword('toto-mcp', 'access_token', tokens.access);
    await keytar.setPassword('toto-mcp', 'refresh_token', tokens.refresh);
  }

  async getTokens() {
    const access = await keytar.getPassword('toto-mcp', 'access_token');
    const refresh = await keytar.getPassword('toto-mcp', 'refresh_token');
    return { access, refresh };
  }
}
```

## Phase 3: OAuth with CSRF Protection
```typescript
class SecureOAuthClient {
  private readonly stateStore = new Map<string, { timestamp: number }>();

  generateAuthUrl(): { url: string; state: string } {
    const state = crypto.randomBytes(32).toString('hex');
    this.stateStore.set(state, { timestamp: Date.now() });

    // Clean up expired states (>5 minutes)
    this.cleanExpiredStates();

    return {
      url: msalClient.getAuthCodeUrl({
        scopes: ['Tasks.Read', 'User.Read'], // Read-only!
        state,
        redirect_uri: 'http://localhost:3000/callback'
      }),
      state
    };
  }

  validateCallback(state: string): boolean {
    const stored = this.stateStore.get(state);
    if (!stored) return false;

    const isValid = Date.now() - stored.timestamp < 5 * 60 * 1000;
    this.stateStore.delete(state);
    return isValid;
  }
}
```

## Phase 4: Minimal Graph Client
```typescript
class SecureGraphClient {
  private readonly allowedFilters = ['status', 'importance', 'dueDateTime'];

  async getTasks(listId: string, filter?: string) {
    // Input validation
    if (filter && !this.validateODataFilter(filter)) {
      throw new Error('Invalid filter');
    }

    // Rate limiting
    await this.rateLimiter.checkLimit();

    // API call with automatic token refresh
    const token = await this.tokenManager.getAccessToken();
    const response = await fetch(
      `https://graph.microsoft.com/v1.0/me/todo/lists/${listId}/tasks`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // Sanitized error handling
    if (!response.ok) {
      logger.error('Graph API error', { status: response.status });
      throw new Error('Failed to fetch tasks'); // Generic error
    }

    return response.json();
  }
}
```

## Phase 5: MCP Tools (Read-Only)
```typescript
const tools = {
  get_auth_status: {
    description: "Check authentication status",
    inputSchema: z.object({}),
    handler: async () => {
      // Never expose tokens
      const isAuthenticated = await tokenManager.hasValidToken();
      return { authenticated: isAuthenticated };
    }
  },

  list_tasks: {
    description: "Get tasks with optional filtering",
    inputSchema: z.object({
      listId: z.string().optional(),
      filter: z.enum(['today', 'week', 'high-priority']).optional()
    }),
    handler: async (params) => {
      const validated = inputSchema.parse(params); // Zod validation
      const tasks = await graphClient.getTasks(validated.listId);
      return sanitizeTasks(tasks); // Remove sensitive data
    }
  },

  search_tasks: {
    description: "Search across all tasks",
    inputSchema: z.object({
      query: z.string().max(100) // Length limit
    }),
    handler: async (params) => {
      // Implementation with input sanitization
    }
  }
};
```

## Phase 6: Security Hardening
- **No token logging:** Winston configured to redact sensitive fields
- **Input validation:** Zod schemas on all inputs
- **OData sanitization:** Whitelist allowed operators
- **Rate limiting:** 60 requests/minute
- **HTTPS only:** Reject non-HTTPS callbacks
- **Generic errors:** Never leak implementation details

## Phase 7: Setup Instructions

### For 1Password Users:
1. Sign up for 1Password Teams (14-day trial)
2. Create service account:
   ```bash
   op service-account create "Todo MCP" --vault "MCP-Secrets"
   ```
3. Save token to environment:
   ```bash
   export OP_SERVICE_ACCOUNT_TOKEN="ops_..."
   ```

### For Development (Keytar):
1. No setup needed - uses Windows Credential Manager
2. First run will prompt for Windows Hello if configured

## Implementation Timeline

**Day 1:**
- Project setup
- Token manager abstraction (support both 1Password and keytar)
- Basic OAuth flow

**Day 2:**
- CSRF protection
- Microsoft Graph client
- Input validation

**Day 3:**
- MCP server implementation
- Read-only tools
- Security hardening

**Day 4:**
- Testing
- Documentation
- Claude Desktop integration

## Configuration File Structure
```typescript
// config/token-storage.ts
export const getTokenManager = () => {
  if (process.env.OP_SERVICE_ACCOUNT_TOKEN) {
    return new OnePasswordTokenManager();
  }
  if (process.env.NODE_ENV === 'development') {
    return new KeytarTokenManager();
  }
  throw new Error('No token storage configured');
};
```

## Security Principles
1. **Never store tokens in files** - Always use 1Password or keytar
2. **Read-only by default** - Start with Tasks.Read scope only
3. **No sensitive data in logs** - Configure Winston properly
4. **Validate everything** - Every input gets Zod validation
5. **Fail secure** - Errors never expose implementation details

## Cost-Benefit Analysis
- **Development:** $0 (keytar)
- **Production:** $8/month (1Password)
- **Security benefit:** Tokens isolated from other applications
- **Peace of mind:** Work data protected by zero-knowledge architecture

## File Structure Overview
```
/c/opt/toto/toto-mcp/
├── src/
│   ├── auth/
│   │   ├── oauth-client.ts      # CSRF-protected OAuth
│   │   └── token-manager.ts     # Token storage abstraction
│   ├── security/
│   │   ├── validators.ts        # Input validation schemas
│   │   └── sanitizers.ts        # Log/error sanitization
│   ├── graph/
│   │   ├── client.ts           # Minimal Graph API client
│   │   └── todo-service.ts     # To Do specific logic
│   ├── mcp/
│   │   ├── server.ts           # MCP server setup
│   │   └── tools.ts            # Tool implementations
│   └── index.ts                # Entry point
├── config/
│   ├── token-storage.ts       # Storage configuration
│   └── permissions.json       # Locked-down scopes
├── tests/
│   └── security/              # Security-focused tests
├── package.json
├── tsconfig.json
├── .env.example               # Template (no secrets)
└── README.md                  # Setup instructions
```

## 1Password Research Summary

### Key Findings:
1. **1Password SDK** (`@1password/sdk`) provides simple programmatic access
2. **Service Accounts** best for MCP servers (no user interaction required)
3. **Significantly more secure** than Windows Credential Manager
4. **Cost:** ~$8/month for Teams subscription
5. **Implementation:** 3 lines of code for basic usage

### Why 1Password is Superior to Windows Credential Manager:
- **Isolation:** Only your app with the correct token can access secrets
- **Zero-knowledge:** Even 1Password can't decrypt your data
- **Cryptographic enforcement:** Permissions can't be bypassed
- **Not vulnerable to Windows password compromise**
- **Audit logging:** Track all token access

### Alternative Approaches:
- **Development:** Use keytar (free, adequate security)
- **Production:** Use 1Password SDK
- **Enterprise:** Use 1Password Connect Server (self-hosted, unlimited requests)

## Next Steps
1. Confirm token storage preference (1Password vs keytar vs hybrid)
2. Set up Azure app registration
3. Initialize project structure
4. Implement token manager abstraction
5. Build OAuth flow with CSRF protection
6. Create minimal Graph client
7. Implement MCP tools
8. Test and document