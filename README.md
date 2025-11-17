# Toto MCP Server

A secure Model Context Protocol (MCP) server for Microsoft To Do integration with Claude Desktop.

## <¯ Features

- **Security-First Design** - Secure token storage, CSRF protection, input validation
- **Read-Only Access** - Safe integration with Tasks.Read permissions
- **Flexible Token Storage** - Supports both keytar (free) and 1Password SDK
- **Rate Limited** - Respects Microsoft Graph API limits
- **Well Tested** - Comprehensive test coverage

## =Ë Prerequisites

- Node.js v18+ (v22.18.0 recommended)
- npm v9+ (v11.5.2 recommended)
- Microsoft account with access to Azure AD
- Azure app registration (see setup below)

## =€ Quick Start

### 1. Clone and Install

```bash
cd /c/opt/toto/toto-mcp
npm install
```

### 2. Configure Azure App Registration

See `docs/setup.md` for detailed Azure setup instructions.

You'll need:
- Application (client) ID
- Directory (tenant) ID
- Client secret

### 3. Configure Environment

```bash
cp .env.example .env
# Edit .env with your Azure credentials
```

### 4. Build and Run

```bash
npm run build
npm start
```

## =' Development

```bash
# Run in development mode with auto-reload
npm run dev

# Run tests
npm test

# Run security tests
npm run test:security

# Type check
npm run type-check

# Lint
npm run lint
```

## =Ú Documentation

- [Setup Guide](docs/setup.md)
- [Architecture](docs/architecture.md)
- [Security](docs/security.md)
- [Troubleshooting](docs/troubleshooting.md)

## = Security

This project follows security-first principles:
- Tokens never stored in files or logs
- All inputs validated with Zod
- CSRF protection on OAuth flow
- Rate limiting on API calls
- Generic error messages (no leaks)

## =Ý License

ISC

## = About the Name

Named "toto" after Dorothy's faithful companion in The Wizard of Oz - because every great journey needs a trustworthy helper!
