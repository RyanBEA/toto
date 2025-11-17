# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Toto MCP Server** is a security-first Model Context Protocol (MCP) server providing read-only access to Microsoft To Do tasks for Claude Desktop. Named after Dorothy's faithful companion in The Wizard of Oz.

**Current Status:** Phase 0 complete (initial setup). Active development in Phase 1 (Project Foundation).

## Development Commands

```bash
# Build
npm run build              # Compile TypeScript to dist/
npm run clean             # Remove dist/ directory

# Development
npm run dev               # Watch mode with auto-reload (tsx)
npm run type-check        # TypeScript check without emitting files

# Testing
npm test                  # Run all tests (vitest)
npm run test:security     # Run security-focused tests only
npm run test:coverage     # Run tests with coverage report

# Code Quality
npm run lint              # ESLint on src/**/*.ts

# Running
npm start                 # Run compiled code from dist/
```

## Architecture

### Security-First Design Philosophy

This codebase is built with **security as the primary architectural constraint**. Every component follows these principles:

1. **Token Storage Abstraction**: Supports both keytar (Windows Credential Manager) for development and 1Password SDK for production. The abstraction layer (`ITokenManager`) allows switching between implementations without code changes.

2. **Never Log Secrets**: Winston logger is configured with automatic redaction of sensitive fields (`access_token`, `refresh_token`, `client_secret`, etc.). All logging goes through this central logger.

3. **Input Validation Everywhere**: All user inputs validated with Zod schemas before processing. No raw inputs reach business logic.

4. **Generic Error Messages**: Errors sanitized before returning to clients. Implementation details never leak through error messages.

5. **Read-Only by Default**: OAuth scopes limited to `Tasks.Read` and `User.Read`. No write operations to Microsoft Graph.

### Module Organization

```
src/
├── auth/              # OAuth & token management
│   ├── types.ts                      # ITokenManager interface, TokenSet
│   ├── one-password-token-manager.ts # 1Password SDK implementation
│   ├── keytar-token-manager.ts       # Keytar implementation
│   ├── token-manager-factory.ts      # Selects implementation based on env
│   ├── token-refresher.ts            # Automatic token refresh with retry
│   └── oauth-client.ts               # CSRF-protected OAuth flow
│
├── security/          # Security primitives used by all modules
│   ├── logger.ts      # Winston with sensitive data redaction
│   ├── errors.ts      # Base error classes (AppError, AuthenticationError, etc.)
│   ├── validators.ts  # Zod schemas for input validation
│   └── sanitizers.ts  # Response/log sanitization
│
├── graph/            # Microsoft Graph API client
│   ├── client.ts          # HTTP client with retry logic
│   ├── rate-limiter.ts    # Token bucket (60 req/min)
│   ├── circuit-breaker.ts # Fail-fast pattern for API health
│   └── todo-service.ts    # To Do specific business logic
│
├── mcp/              # MCP server implementation
│   ├── server.ts     # MCP SDK server initialization
│   ├── tools.ts      # Tool implementations (get_auth_status, list_tasks, etc.)
│   └── types.ts      # MCP-specific types
│
├── config/
│   └── environment.ts # Zod-validated configuration from .env
│
└── index.ts          # Entry point
```

### Key Architectural Patterns

**Token Management Flow:**
```
MCP Tool → Graph Client → Token Refresher → Token Manager (keytar/1Password)
                            ↓
                    MSAL Client (Azure OAuth)
```

**Error Handling:**
- All modules throw typed errors extending `AppError`
- Errors sanitized at module boundaries (never expose tokens, internal paths, etc.)
- Logger automatically redacts sensitive fields from error objects

**Configuration:**
- All config loaded through `environment.ts` with Zod validation
- Fails fast on startup if required env vars missing
- Token storage type selected at runtime: `TOKEN_STORAGE=keytar` or `TOKEN_STORAGE=1password`

**Rate Limiting:**
- Graph client uses token bucket algorithm
- 60 requests/minute default (configurable via `RATE_LIMIT_PER_MINUTE`)
- Queues requests when limit reached, throws error if queue full

**Circuit Breaker:**
- Protects against cascading failures to Graph API
- Opens circuit after sustained failures
- Half-open state allows recovery testing

## Project-Specific Conventions

### Token Storage

**Critical:** Tokens are NEVER stored in files, only in OS credential stores or 1Password.

The token manager abstraction requires:
```typescript
interface ITokenManager {
  storeTokens(tokens: TokenSet): Promise<void>;
  getTokens(): Promise<TokenSet>;
  hasValidTokens(): Promise<boolean>;
  clearTokens(): Promise<void>;
  updateAccessToken(accessToken: string, expiresAt: number): Promise<void>;
}
```

Factory pattern in `token-manager-factory.ts` selects implementation based on `TOKEN_STORAGE` env var.

### CSRF Protection

OAuth flow uses cryptographic state tokens:
- Generated: 32-byte random hex string
- Stored: In-memory map with timestamp
- Validated: On callback, with 5-minute expiration
- Cleaned: Automatic cleanup of expired states

### OData Filter Validation

Graph API accepts OData filters. **Only whitelisted operators allowed**:
- Allowed fields: `status`, `importance`, `dueDateTime`
- Malicious operators rejected before reaching API
- Implemented in `validators.ts`

### Logging Best Practices

```typescript
// ✅ Correct - logger automatically redacts
logger.info('User authenticated', { userId, access_token: token });
// Logs: { userId: '123', access_token: '[REDACTED]' }

// ❌ Wrong - avoid console.log (bypasses redaction)
console.log('Token:', token);
```

## Configuration Reference

Required environment variables (see `.env.example`):
- `AZURE_CLIENT_ID` - From Azure app registration
- `AZURE_TENANT_ID` - From Azure app registration
- `AZURE_CLIENT_SECRET` - From Azure app registration (NEVER commit)
- `AZURE_REDIRECT_URI` - OAuth callback (default: `http://localhost:3000/callback`)
- `TOKEN_STORAGE` - Either `keytar` or `1password`

Optional:
- `OP_SERVICE_ACCOUNT_TOKEN` - Required if `TOKEN_STORAGE=1password`
- `LOG_LEVEL` - `error|warn|info|debug` (default: `info`)
- `RATE_LIMIT_PER_MINUTE` - Graph API rate limit (default: `60`)
- `STATE_TIMEOUT_MINUTES` - OAuth state expiration (default: `5`)

## Testing

Tests organized by type:
- `tests/unit/` - Unit tests for individual modules
- `tests/integration/` - End-to-end flows with mocked Graph API
- `tests/security/` - Security-specific tests (injection, CSRF, etc.)

**Security test examples:**
- Logger redaction: Verify tokens never appear in logs
- Input validation: Attempt SQL injection, XSS, etc.
- CSRF: Attempt OAuth callback with invalid state
- Rate limiting: Verify requests rejected after limit

Run security tests before any commit: `npm run test:security`

## Roadmap & Planning

This project uses a phase-based development approach tracked in `/dev/`:
- `roadmap.md` - Primary source of truth for project status
- `plan.md` - Original detailed implementation plan
- `phases/` - Detailed task breakdowns for each phase

**Before starting new work:**
1. Check `dev/roadmap.md` for current phase
2. Review phase detail file in `dev/phases/`
3. Update roadmap as you complete tasks

**Current Phase:** Phase 1 - Project Foundation
**Next Phase:** Phase 2 - Token Management

## Dependencies

**Core:**
- `@modelcontextprotocol/sdk` - MCP protocol implementation
- `@azure/msal-node` - Microsoft OAuth (MSAL library)
- `keytar` - OS credential store (development)
- `@1password/sdk` - 1Password integration (production, optional)

**Security:**
- `zod` - Schema validation for all inputs
- `winston` - Structured logging with redaction

**Development:**
- `typescript` - Type safety with strict mode
- `tsx` - TypeScript execution for dev mode
- `vitest` - Testing framework
- `eslint` - Linting with TypeScript support

## Important Notes

- **Never commit secrets**: `.gitignore` excludes `.env`, `azure-config.md`, logs
- **Windows development**: Uses Windows Credential Manager via keytar (no setup needed)
- **Production deployment**: Requires 1Password Teams subscription (~$8/month)
- **OAuth scopes**: Read-only (`Tasks.Read`, `User.Read`) - no write permissions
- **Azure app**: Named "toto", configured in Azure portal with specific client ID/tenant ID
