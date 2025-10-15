# Lightweight React Template for KAVIA

This project provides a minimal React template with a clean, modern UI and minimal dependencies.

## Features

- Lightweight and modern UI
- Minimal dependencies for fast loading
- Simple chat UI wired to a backend API

## Getting Started

In the project directory, you can run:

### `npm start`

Runs the app in development mode.  
Open http://localhost:3000 to view it in your browser.

### `npm test`

Launches the test runner in interactive watch mode.

### `npm run build`

Builds the app for production to the `build` folder.

## Backend connectivity

The app uses an API base URL resolved as:
1) `REACT_APP_API_BASE` if provided (recommended), otherwise  
2) If running on localhost, defaults to `http://localhost:3001`, otherwise  
3) Derives from `window.location` using the same protocol and hostname with port `3001`.

- Health check: `GET {API_BASE}/` should return 200 and JSON.
- Chat endpoints:
  - Prefer: `POST {API_BASE}/api/message` with JSON `{ "message": "..." }`
  - Fallback: `POST {API_BASE}/api/chat`

CORS: The backend is configured to allow `http://localhost:3000`.

### Environment variables

Create `.env.development.local` (not committed) to point the frontend to the backend:

```
REACT_APP_API_BASE=https://<your-host-or-domain>:3001
```

If you don't have a Gemini API key on the backend, you can set on the backend:
```
ALLOW_FAKE_GEMINI=true
```
This will make the backend return a stubbed reply like `Echo: <message>` for testing.

### Troubleshooting

- Failed to fetch or network TypeError:
  - Ensure backend is running and reachable at the API base shown in the UI.
  - If using cloud URLs (HTTPS), ensure `REACT_APP_API_BASE` uses HTTPS and the correct host and port.

- CORS errors:
  - Confirm the backend sends `Access-Control-Allow-Origin: http://localhost:3000` (or your origin).
  - Only send `Content-Type: application/json` header on requests.

- ERR_BLOCKED_BY_CLIENT:
  - Browser extensions (ad/tracker blockers) may block `/api/chat`. The app prefers `/api/message` to avoid this.
  - Disable ad blockers for localhost or your dev domain.

- Mixed content:
  - If the site is loaded over HTTPS, the API base must also be HTTPS.
