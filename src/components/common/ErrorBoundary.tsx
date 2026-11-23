import { Alert, AlertTitle, Button, Stack } from '@mui/material';
import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled UI error:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <Stack sx={{ minHeight: '100vh', alignItems: 'center', justifyContent: 'center', p: 3 }}>
          <Alert severity="error" sx={{ maxWidth: 480 }}>
            <AlertTitle>Something went wrong</AlertTitle>
            {this.state.error.message || 'An unexpected error occurred.'}
            <Stack sx={{ mt: 2 }}>
              <Button variant="contained" size="small" onClick={() => window.location.reload()}>
                Reload
              </Button>
            </Stack>
          </Alert>
        </Stack>
      );
    }
    return this.props.children;
  }
}
