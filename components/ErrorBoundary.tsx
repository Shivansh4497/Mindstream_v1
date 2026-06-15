import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        // Log error to console (future: send to analytics)
        console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    handleReload = () => {
        // Reset error state and reload the page
        this.setState({ hasError: false, error: null });
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="h-screen w-screen bg-brand-indigo flex items-center justify-center p-6">
                    <div className="max-w-md text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-red-500/20 rounded-full mb-6">
                            <AlertTriangle className="w-8 h-8 text-red-400" />
                        </div>

                        <h1 className="text-2xl font-bold text-white mb-3">
                            Something went wrong
                        </h1>

                        <p className="text-gray-400 mb-6">
                            We hit an unexpected error. Your data is safe — just reload to continue.
                        </p>

                        <button
                            onClick={this.handleReload}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-brand-teal text-white font-semibold rounded-lg hover:bg-teal-400 transition-colors"
                        >
                            <RefreshCw className="w-5 h-5" />
                            Reload App
                        </button>

                        {this.state.error && (
                            <div className="mt-8 text-left">
                                <p className="text-red-400 font-bold mb-2">Error Details:</p>
                                <pre className="mt-2 p-4 bg-red-900/20 rounded-lg text-red-300 text-xs overflow-auto max-h-48 whitespace-pre-wrap">
                                    {this.state.error.toString()}
                                    {'\n\n'}
                                    {this.state.error.stack}
                                </pre>
                            </div>
                        )}
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
