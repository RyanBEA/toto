# Project Structure Reference

**Last Updated:** 2025-11-17

---

## Complete Directory Tree

```
/c/opt/toto/toto-mcp/                    # Main project directory
├── src/
│   ├── auth/
│   │   ├── types.ts                     # Token interfaces
│   │   ├── one-password-token-manager.ts
│   │   ├── keytar-token-manager.ts
│   │   ├── token-manager-factory.ts
│   │   ├── token-refresher.ts
│   │   └── oauth-client.ts              # CSRF-protected OAuth
│   │
│   ├── security/
│   │   ├── logger.ts                    # Winston with redaction
│   │   ├── errors.ts                    # Base error classes
│   │   ├── validators.ts                # Input validation schemas
│   │   └── sanitizers.ts                # Log/error sanitization
│   │
│   ├── graph/
│   │   ├── client.ts                    # Minimal Graph API client
│   │   ├── rate-limiter.ts              # Rate limiting logic
│   │   ├── circuit-breaker.ts           # Circuit breaker pattern
│   │   └── todo-service.ts              # To Do specific logic
│   │
│   ├── mcp/
│   │   ├── server.ts                    # MCP server setup
│   │   ├── tools.ts                     # Tool implementations
│   │   └── types.ts                     # MCP type definitions
│   │
│   ├── config/
│   │   └── environment.ts               # Configuration management
│   │
│   └── index.ts                         # Entry point
│
├── config/
│   ├── token-storage.ts                 # Storage configuration
│   └── permissions.json                 # Locked-down scopes
│
├── tests/
│   ├── unit/
│   │   ├── logger.test.ts
│   │   ├── config.test.ts
│   │   ├── token-refresher.test.ts
│   │   ├── validators.test.ts
│   │   └── ...
│   │
│   ├── integration/
│   │   ├── oauth-flow.test.ts
│   │   ├── graph-client.test.ts
│   │   └── mcp-server.test.ts
│   │
│   └── security/
│       ├── injection.test.ts
│       ├── csrf.test.ts
│       └── rate-limit.test.ts
│
├── docs/
│   ├── setup.md                         # Setup instructions
│   ├── architecture.md                  # System architecture
│   ├── security.md                      # Security documentation
│   └── troubleshooting.md               # Common issues
│
├── logs/                                # Log files (gitignored)
│   ├── combined.log
│   └── error.log
│
├── dist/                                # Compiled output (gitignored)
│
├── package.json
├── package-lock.json
├── tsconfig.json
├── .env                                 # Secrets (gitignored)
├── .env.example                         # Template
├── .gitignore
├── README.md
└── LICENSE

```

---

## File Counts by Phase

| Phase | Files Created | Tests Added |
|-------|---------------|-------------|
| Phase 0 | 4 | 0 |
| Phase 1 | 5 | 3 |
| Phase 2 | 5 | 2 |
| Phase 3 | 3 | 3 |
| Phase 4 | 4 | 4 |
| Phase 5 | 3 | 3 |
| Phase 6 | 2 | 5 |
| Phase 7 | 4+ | 10+ |
| **Total** | **~30** | **~30** |

---

## Key Files Purpose

### Authentication Layer
- `token-manager-factory.ts` - Selects 1Password or keytar
- `token-refresher.ts` - Automatic token refresh
- `oauth-client.ts` - CSRF-protected OAuth flow

### Security Layer
- `logger.ts` - Redacts sensitive data from logs
- `errors.ts` - Sanitized error messages
- `validators.ts` - Zod schemas for all inputs

### Graph API Layer
- `client.ts` - HTTP client with retry logic
- `rate-limiter.ts` - 60 req/min enforcement
- `circuit-breaker.ts` - Fail-fast pattern

### MCP Layer
- `server.ts` - MCP server initialization
- `tools.ts` - Read-only tool implementations

### Configuration
- `environment.ts` - Validated config with Zod
- `.env.example` - Template for secrets

---

## Import Relationships

```
index.ts
  └─> mcp/server.ts
       ├─> mcp/tools.ts
       │    └─> graph/todo-service.ts
       │         └─> graph/client.ts
       │              ├─> auth/token-refresher.ts
       │              │    └─> auth/token-manager-factory.ts
       │              │         ├─> auth/one-password-token-manager.ts
       │              │         └─> auth/keytar-token-manager.ts
       │              ├─> graph/rate-limiter.ts
       │              └─> graph/circuit-breaker.ts
       │
       └─> auth/oauth-client.ts
            └─> auth/token-manager-factory.ts

All modules use:
  ├─> security/logger.ts
  ├─> security/errors.ts
  └─> config/environment.ts
```

---

## Dependencies Graph

```
Production:
  @modelcontextprotocol/sdk
  @azure/msal-node
  @1password/sdk (optional)
  keytar (optional)
  zod
  winston
  dotenv

Development:
  typescript
  @types/node
  tsx
  vitest
  @vitest/coverage-v8
  eslint + @typescript-eslint/*
  prettier
```

---

## Build Artifacts

```
dist/
├── auth/
│   └── *.js + *.d.ts
├── security/
│   └── *.js + *.d.ts
├── graph/
│   └── *.js + *.d.ts
├── mcp/
│   └── *.js + *.d.ts
├── config/
│   └── *.js + *.d.ts
└── index.js + index.d.ts
```

---

## Size Estimates

| Component | Lines of Code | Complexity |
|-----------|---------------|------------|
| Auth Layer | ~400 | Medium |
| Security Layer | ~300 | Low |
| Graph Client | ~500 | High |
| MCP Server | ~300 | Medium |
| Tests | ~800 | Medium |
| Config | ~200 | Low |
| **Total** | **~2,500** | **Medium** |

---

## Git Structure

```
.git/
.gitignore          # Excludes secrets, logs, node_modules
README.md           # Project overview
LICENSE             # MIT or similar

Branches:
  main              # Production-ready code
  develop           # Active development
  feature/*         # Feature branches
```

---

This structure supports:
- ✅ Clear separation of concerns
- ✅ Easy testing (each layer independently testable)
- ✅ Security by design (security layer used by all)
- ✅ Maintainability (logical file organization)
- ✅ Scalability (easy to add new tools/features)
