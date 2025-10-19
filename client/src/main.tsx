/* @refresh reload */
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';


class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: any }> {
  constructor(props: any) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error: any) { return { error }; }
  componentDidCatch(error: any, info: any) { console.error('App crashed:', error, info); }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 16, fontFamily: 'system-ui' }}>
          <h1>⚠️ App Error</h1>
          <pre style={{ whiteSpace: 'pre-wrap', background: '#fee', padding: 12, borderRadius: 8 }}>
            {String(this.state.error?.stack || this.state.error)}
          </pre>
          <p>Open DevTools → Console for details.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
