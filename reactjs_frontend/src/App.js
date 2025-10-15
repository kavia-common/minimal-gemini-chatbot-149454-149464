import React, { useState, useEffect, useMemo, useCallback } from 'react';
import './App.css';

/**
 * PUBLIC_INTERFACE
 * App provides a minimal chat UI that posts to a backend and shows the latest bot reply.
 * Enhancements:
 * - Hard-set cloud API base default with env override
 * - Health check on mount and before sending
 * - Dual-endpoint POST strategy: try /api/message then fallback to /api/chat
 * - Improved error handling for network/CORS vs HTTP errors
 * - Simple backend connectivity status indicator and visible "API: <base>" hint
 */
// PUBLIC_INTERFACE
function App() {
  // Theme support (retain light/dark from template)
  const [theme, setTheme] = useState('light');

  // Chat state
  const [userInput, setUserInput] = useState('');
  const [botReply, setBotReply] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Backend health/status
  const [healthy, setHealthy] = useState(false);
  const [healthMsg, setHealthMsg] = useState('');

  // Resolve API base: env first, then fixed cloud default, else same-host:3001 fallback
  const API_BASE = useMemo(() => {
    const ENV_BASE = (process.env.REACT_APP_API_BASE || '').trim();
    const DEFAULT_CLOUD_BASE = 'https://vscode-internal-23153-beta.beta01.cloud.kavia.ai:3001';
    const primary = (ENV_BASE || DEFAULT_CLOUD_BASE).replace(/\/*$/, '');
    if (primary) return primary;

    // This branch should not happen after setting DEFAULT_CLOUD_BASE, but keep as safety fallback.
    try {
      const { protocol, hostname } = window.location || {};
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'http://localhost:3001';
      }
      return `${protocol}//${hostname}:3001`;
    } catch {
      return 'http://localhost:3001';
    }
  }, []);

  // Effect to apply theme to document element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // PUBLIC_INTERFACE
  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  /**
   * Detect common network/CORS/ad-block errors and return a user-friendly message.
   */
  const getFriendlyNetworkError = useCallback((err) => {
    const message = String(err?.message || err || '');
    const isTypeError = err instanceof TypeError || /TypeError/i.test(message);
    const isBlocked = /ERR_BLOCKED_BY_CLIENT|net::ERR_BLOCKED_BY_CLIENT/i.test(message);
    const isCors = /CORS|No 'Access-Control-Allow-Origin'|Access-Control-Allow-Origin/i.test(message);

    if (isBlocked) {
      return 'The request was blocked by a browser extension (ad/tracker blocker). Please disable it for this site or allow the API domain, then try again.';
    }
    if (isCors) {
      return 'The request appears to be blocked by CORS policy. Ensure the backend includes proper CORS headers and the API base URL is correct.';
    }
    if (isTypeError) {
      return 'Network error: Unable to reach the server. Verify the backend is running and reachable, and check ad blockers.';
    }
    return message || 'An unknown error occurred.';
  }, []);

  /**
   * PUBLIC_INTERFACE
   * Health check GET to the API base '/'.
   */
  const checkHealth = useCallback(async () => {
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 8000); // safety timeout
      const res = await fetch(`${API_BASE}/`, {
        method: 'GET',
        cache: 'no-store',
        signal: controller.signal
      });
      clearTimeout(id);

      if (!res.ok) {
        setHealthy(false);
        setHealthMsg(`Health check failed: HTTP ${res.status}`);
        return false;
      }
      setHealthy(true);
      setHealthMsg('Healthy');
      return true;
    } catch (err) {
      setHealthy(false);
      setHealthMsg(getFriendlyNetworkError(err));
      return false;
    }
  }, [API_BASE, getFriendlyNetworkError]);

  // Initial health check on mount
  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  /**
   * Try to POST to /api/message first, then fallback to /api/chat.
   */
  const postWithFallback = useCallback(
    async (message) => {
      const payload = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      };

      // Primary: /api/message
      try {
        const resMsg = await fetch(`${API_BASE}/api/message`, payload);
        if (resMsg.ok) return resMsg;
        // consume body to free resources; ignore
        await resMsg.text().catch(() => '');
      } catch {
        // ignore and try fallback
      }

      // Fallback: /api/chat
      try {
        const resChat = await fetch(`${API_BASE}/api/chat`, payload);
        return resChat;
      } catch (e) {
        // Surface last error
        throw e;
      }
    },
    [API_BASE]
  );

  // PUBLIC_INTERFACE
  async function sendMessage(message) {
    /**
     * Sends the user's message to the backend with health check and fallback endpoints.
     */
    if (!message || !message.trim()) return;
    setLoading(true);
    setError(null);

    try {
      // Quick health check before sending to provide better UX
      const ok = await checkHealth();
      if (!ok) {
        throw new Error(
          'Cannot reach backend. Please ensure the server is running at the configured API base.'
        );
      }

      const res = await postWithFallback(message);

      if (!res.ok) {
        // Try to parse error body for details
        let detail = '';
        try {
          const contentType = res.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            const j = await res.json();
            detail = j?.error || j?.message || '';
          } else {
            detail = await res.text();
          }
        } catch {
          // ignore parse errors
        }
        const baseMsg = `Request failed with status ${res.status}`;
        throw new Error(detail ? `${baseMsg}: ${detail}` : baseMsg);
      }

      const data = await res.json();
      if (typeof data?.reply !== 'string') {
        throw new Error('Unexpected response format from server.');
      }
      setBotReply(data.reply);
      setUserInput('');
    } catch (e) {
      const friendly = getFriendlyNetworkError(e);
      const hint =
        ` If the issue persists, confirm the API base URL is correct (current: ${API_BASE}) and try disabling ad blockers for this site.`;
      setError(friendly + hint);
    } finally {
      setLoading(false);
    }
  }

  const onSubmit = (e) => {
    e.preventDefault();
    sendMessage(userInput);
  };

  // Small status indicator component
  const StatusIndicator = () => (
    <div
      className="status"
      role="status"
      aria-label={`Backend status: ${healthy ? 'Connected' : 'Not reachable'}. ${healthMsg || ''}`}
      title={`Backend: ${healthy ? 'Connected' : 'Not reachable'} — ${healthMsg || 'No details'}`}
    >
      <span className={`status-dot ${healthy ? 'ok' : 'bad'}`} aria-hidden="true" />
      <span className="status-text">{healthy ? 'Connected' : 'Not reachable'}</span>
    </div>
  );

  return (
    <div className="App" aria-live="polite">
      <header className="app-shell">
        <button
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
        </button>

        <div className="container">
          <h1 className="title">Gemini Chat</h1>
          <p className="subtitle">
            Ask a question and get a response.&nbsp;
            <span className="api-hint" title={`API Base: ${API_BASE}`}>
              (API: {API_BASE})
            </span>
          </p>

          <StatusIndicator />

          <div className="chat-surface" role="region" aria-label="Chatbot reply">
            {!botReply && !error && !loading && (
              <div className="placeholder">
                The latest reply will appear here.
              </div>
            )}

            {loading && (
              <div className="loading">
                <span className="spinner" aria-hidden="true" /> Thinking...
              </div>
            )}

            {error && (
              <div className="error" role="alert">
                {error}
              </div>
            )}

            {botReply && !loading && !error && (
              <div className="bot-reply">
                {botReply}
              </div>
            )}
          </div>

          <form className="input-row" onSubmit={onSubmit}>
            <label htmlFor="user-message" className="visually-hidden">
              Your message
            </label>
            <input
              id="user-message"
              name="message"
              type="text"
              placeholder="Type your message..."
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              disabled={loading}
              aria-disabled={loading}
              aria-label="Message input"
            />
            <button
              type="submit"
              className="btn-primary"
              disabled={loading || !userInput.trim()}
              aria-busy={loading ? 'true' : 'false'}
              onClick={() => {
                // Re-run a quick health check when pressing Send to refresh indicator.
                checkHealth();
              }}
            >
              {loading ? 'Sending...' : 'Send'}
            </button>
          </form>
        </div>
      </header>
    </div>
  );
}

export default App;
