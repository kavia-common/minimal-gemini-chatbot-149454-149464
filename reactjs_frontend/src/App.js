import React, { useState, useEffect } from 'react';
import './App.css';

/**
 * PUBLIC_INTERFACE
 * App provides a minimal chat UI that posts to a backend and shows the latest bot reply.
 * - Input at bottom, display area above.
 * - Calls POST http://localhost:3001/api/chat with { message } and expects { reply }.
 */
function App() {
  // Theme support (retain light/dark from template)
  const [theme, setTheme] = useState('light');

  // Chat state
  const [userInput, setUserInput] = useState('');
  const [botReply, setBotReply] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Effect to apply theme to document element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // PUBLIC_INTERFACE
  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  // PUBLIC_INTERFACE
  async function sendMessage(message) {
    /**
     * Sends the user's message to the backend and updates botReply or error state.
     */
    if (!message || !message.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const API_BASE =
        process.env.REACT_APP_API_BASE?.replace(/\/+$/, '') || 'http://localhost:3001';
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message })
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || `Request failed with status ${res.status}`);
      }

      const data = await res.json();
      if (typeof data?.reply !== 'string') {
        throw new Error('Unexpected response format from server.');
      }
      setBotReply(data.reply);
      setUserInput('');
    } catch (e) {
      setError(e.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  const onSubmit = (e) => {
    e.preventDefault();
    sendMessage(userInput);
  };

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
          <p className="subtitle">Ask a question and get a response.</p>

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
