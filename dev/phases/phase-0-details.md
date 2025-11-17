# Phase 0: Pre-Implementation - Detailed Plan

**Status:** 🔵 ACTIVE
**Estimated Duration:** 1 day
**Dependencies:** None
**Last Updated:** 2025-11-17

---

## Overview

Set up all prerequisites before writing any MCP server code. This includes Azure configuration, token storage setup, and project scaffolding.

---

## Tasks Breakdown

### Task 0.1: Technical Decisions ⚪ PENDING

**Priority:** CRITICAL
**Estimated Time:** 30 minutes

#### Checklist
- [ ] Decide: 1Password vs keytar vs hybrid for token storage
- [ ] Decide: Node.js version (recommend v18 LTS or v20 LTS)
- [ ] Decide: Package manager (npm, yarn, or pnpm)
- [ ] Decide: TypeScript strict mode settings
- [ ] Document decisions in roadmap.md Decision Log

#### Questions to Answer
1. Do you have 1Password Teams subscription or willing to start trial?
2. What Node.js version is currently installed? (`node --version`)
3. Preferred package manager?

#### Output
- Updated Decision Log in roadmap.md

---

### Task 0.2: Azure App Registration 🔴 CRITICAL

**Priority:** CRITICAL
**Estimated Time:** 20 minutes

#### Prerequisites
- Microsoft account with Azure access
- Permissions to create app registrations

#### Steps
1. Navigate to [Azure Portal](https://portal.azure.com)
2. Go to Azure Active Directory > App registrations > New registration
3. Configure:
   - **Name:** "Todo MCP Server"
   - **Supported account types:** "Accounts in this organizational directory only" (Single tenant)
   - **Redirect URI:**
     - Platform: Web
     - URI: `http://localhost:3000/callback`
4. After creation, note:
   - Application (client) ID
   - Directory (tenant) ID
5. Go to "Certificates & secrets" > "New client secret"
   - Description: "MCP Server Secret"
   - Expiration: 24 months
   - **Copy the secret value immediately** (only shown once)
6. Go to "API permissions" > "Add a permission"
   - Microsoft Graph > Delegated permissions
   - Add: `Tasks.Read`, `User.Read`
   - Click "Grant admin consent" if you have admin rights

#### Checklist
- [ ] App registration created
- [ ] Client ID documented
- [ ] Tenant ID documented
- [ ] Client secret stored securely (see Task 0.3)
- [ ] Redirect URI configured
- [ ] Permissions added and consented

#### Output
- `dev/azure-config.md` with:
  - Client ID
  - Tenant ID
  - Redirect URI
  - Scopes configured
  - **DO NOT** commit client secret to git

#### Security Notes
⚠️ **NEVER** commit client secret to version control
⚠️ Store client secret in chosen token storage immediately

---

### Task 0.3: Token Storage Setup ⚪ PENDING

**Priority:** CRITICAL
**Estimated Time:** 30 minutes

#### Option A: 1Password Setup

**Steps:**
1. Sign up for [1Password Teams](https://1password.com/teams/) (14-day trial)
2. Install 1Password CLI:
   ```bash
   # Windows (via scoop)
   scoop install 1password-cli

   # Or download from https://1password.com/downloads/command-line/
   ```
3. Create a vault for MCP secrets:
   ```bash
   op vault create "MCP-Secrets"
   ```
4. Create service account:
   ```bash
   op service-account create "Todo MCP Server" --vault "MCP-Secrets"
   ```
5. Save the token from output (starts with `ops_...`)
6. Test access:
   ```bash
   export OP_SERVICE_ACCOUNT_TOKEN="ops_..."
   op vault list
   ```

**Checklist:**
- [ ] 1Password Teams account created
- [ ] CLI installed and working
- [ ] MCP-Secrets vault created
- [ ] Service account created
- [ ] Token saved to secure location
- [ ] Test command successful

#### Option B: Keytar Setup (Development Only)

**Steps:**
1. Verify Windows Credential Manager is accessible
2. Test keytar in a sample Node.js script:
   ```javascript
   const keytar = require('keytar');
   await keytar.setPassword('test-service', 'test-account', 'test-password');
   const password = await keytar.getPassword('test-service', 'test-account');
   console.log('Keytar working:', password === 'test-password');
   ```

**Checklist:**
- [ ] Windows Credential Manager accessible
- [ ] Test script successful
- [ ] Understand security limitations documented

#### Output
- Token storage choice documented in roadmap.md
- Test script confirming storage works

---

### Task 0.4: Project Structure Initialization ⚪ PENDING

**Priority:** HIGH
**Estimated Time:** 20 minutes

#### Steps
1. Create project directory:
   ```bash
   mkdir -p /c/opt/toto/toto-mcp
   cd /c/opt/toto/toto-mcp
   ```

2. Initialize npm project:
   ```bash
   npm init -y
   ```

3. Create directory structure:
   ```bash
   mkdir -p src/{auth,graph,mcp,security}
   mkdir -p config
   mkdir -p tests/{unit,integration,security}
   mkdir -p docs
   ```

4. Create initial files:
   ```bash
   touch src/index.ts
   touch tsconfig.json
   touch .env.example
   touch .gitignore
   touch README.md
   ```

#### Directory Structure
```
/c/opt/toto/toto-mcp/
├── src/
│   ├── auth/              # OAuth & token management
│   ├── graph/             # Microsoft Graph client
│   ├── mcp/               # MCP server & tools
│   ├── security/          # Validation & sanitization
│   └── index.ts           # Entry point
├── config/                # Configuration files
├── tests/
│   ├── unit/             # Unit tests
│   ├── integration/      # Integration tests
│   └── security/         # Security tests
├── docs/                 # Documentation
├── package.json
├── tsconfig.json
├── .env.example          # Template (no secrets)
├── .gitignore
└── README.md
```

#### Checklist
- [ ] Project directory created
- [ ] npm initialized
- [ ] Directory structure created
- [ ] Initial files created
- [ ] .gitignore configured

#### Output
- Complete project structure ready for Phase 1

---

### Task 0.5: Initial Configuration Files ⚪ PENDING

**Priority:** MEDIUM
**Estimated Time:** 20 minutes

#### Create .gitignore
```gitignore
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Build output
dist/
build/
*.tsbuildinfo

# Environment files
.env
.env.local
.env.*.local

# Secrets
config/secrets.json
azure-config.md

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
logs/
*.log

# Test coverage
coverage/
.nyc_output/
```

#### Create .env.example
```bash
# Azure Configuration
AZURE_CLIENT_ID=your_client_id_here
AZURE_TENANT_ID=your_tenant_id_here
AZURE_CLIENT_SECRET=your_client_secret_here
AZURE_REDIRECT_URI=http://localhost:3000/callback

# Token Storage
# For 1Password:
OP_SERVICE_ACCOUNT_TOKEN=your_service_account_token_here

# For keytar (no config needed, uses Windows Credential Manager)

# Environment
NODE_ENV=development

# Logging
LOG_LEVEL=debug
```

#### Create initial package.json scripts
```json
{
  "scripts": {
    "build": "tsc",
    "dev": "tsx watch src/index.ts",
    "start": "node dist/index.js",
    "test": "vitest",
    "test:security": "vitest run tests/security",
    "lint": "eslint src/**/*.ts",
    "type-check": "tsc --noEmit"
  }
}
```

#### Checklist
- [ ] .gitignore created
- [ ] .env.example created
- [ ] package.json scripts added
- [ ] README.md initialized

---

## Success Criteria

Phase 0 is complete when:

✅ Token storage is chosen, tested, and documented
✅ Azure app registration is complete with all credentials stored securely
✅ Project structure exists at `/c/opt/toto/toto-mcp/`
✅ Configuration files in place (.gitignore, .env.example)
✅ All decisions documented in roadmap.md
✅ Can move to Phase 1 without blockers

---

## Blockers & Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Azure account access denied | Low | High | Use personal Microsoft account |
| 1Password cost objection | Medium | Low | Use keytar for development |
| Client secret lost | Low | High | Can regenerate in Azure Portal |

---

## Outputs Checklist

At the end of Phase 0, verify these files exist:

- [ ] `dev/azure-config.md` - Azure credentials (not in git)
- [ ] `dev/roadmap.md` - Updated with decisions
- [ ] `/c/opt/toto/toto-mcp/` - Project directory
- [ ] `/c/opt/toto/toto-mcp/.gitignore`
- [ ] `/c/opt/toto/toto-mcp/.env.example`
- [ ] `/c/opt/toto/toto-mcp/package.json`
- [ ] `/c/opt/toto/toto-mcp/README.md`
- [ ] Token storage tested and working

---

## Next Phase

Once Phase 0 is complete, proceed to [Phase 1: Project Foundation](./phase-1-details.md)
