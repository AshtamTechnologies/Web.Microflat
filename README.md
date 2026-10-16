# MicroFlat ERP – Frontend

MicroFlat ERP web application built with React and Vite.

## Environment Configuration & Mock Switching

The application supports both live backend API integration and an offline mock service mode.

### 1. Local Environment Setup (`.env.local`)
Create a `.env.local` file in the root directory by copying `.env.example`:

```bash
cp .env.example .env.local
```

Configure your environment variables:

```ini
# Backend API Base URL
VITE_API_BASE_URL=https://api.microflat.ashtamtechnologies.com

# Mock API Toggle
# set to 'false' (default) to connect to the live backend API
# set to 'true' to run offline with mock data and simulated latencies
VITE_USE_MOCK_API=false
```

> **Note:** `.env.local` is listed in `.gitignore` (`*.local`) and is never committed to source control. Never store secrets, tokens, or passwords in code or environment templates.

### 2. Switching Between Real and Mock Modes
- **Real Backend Mode (`VITE_USE_MOCK_API=false`)**:
  - Connects to the real backend endpoints defined in Swagger specification (`/api/auth/*`, `/api/users/*`, `/api/roles`).
  - Access tokens are stored in memory only.
  - Refresh tokens are persisted in `localStorage` when "Remember me" is checked, or `sessionStorage` otherwise.
  - Automatic single-flight proactive token rotation ~60 seconds before token expiry and on tab visibility restore.
  - Multi-tab logout synchronization via browser storage events.
  - Unsupported backend operations (e.g. deletion, sorting) are dynamically hidden based on service `capabilities`.
- **Mock Mode (`VITE_USE_MOCK_API=true`)**:
  - Uses the embedded mock dataset in `src/mocks/` for offline testing and demo presentations.
  - Preserves local test accounts (e.g. `admin@microflat.in / admin123` and `newuser@microflat.in / welcome123`).

## Architecture & Security Rules

1. **Tokens Boundary**:
   - Access tokens and expiry are kept exclusively in JavaScript memory (`tokenStorage.js`).
   - Only refresh tokens are stored in Web Storage.
2. **Unified Services & Models**:
   - All network calls flow through `src/axiosConfig/axiosInstance.js` and `src/services/`.
   - Data structures are normalized by model mappers in `src/models/` (`userId` -> `id`, `createdOn` -> `createdAt`).
   - Errors are normalized into `ApiError` instances with lowerCamelCase field validation messages from ASP.NET ProblemDetails.
