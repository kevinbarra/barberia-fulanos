'use client'

import { Component, ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
    children: ReactNode
    fallbackTitle?: string
    fallbackMessage?: string
}

interface State {
    hasError: boolean
    error?: Error
}

export default class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props)
        this.state = { hasError: false }
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error }
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('[ErrorBoundary] Caught error:', error)
        console.error('[ErrorBoundary] Error info:', errorInfo)
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: undefined })
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="bg-white rounded-2xl border border-amber-200 overflow-hidden">
                    <div className="p-6">
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center flex-shrink-0">
                                <AlertTriangle className="w-6 h-6 text-amber-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-gray-900 mb-1">
                                    {this.props.fallbackTitle || 'Algo salió mal'}
                                </h3>
                                <p className="text-sm text-gray-500 mb-4">
                                    {this.props.fallbackMessage || 'No se pudo cargar este componente. El resto de la aplicación sigue funcionando.'}
                                </p>
                                {this.state.error && (
                                    <p className="text-xs text-gray-400 font-mono mb-4 p-2 bg-gray-50 rounded">
                                        {this.state.error.message}
                                    </p>
                                )}
                                <button
                                    onClick={this.handleRetry}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                    Reintentar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )
        }

        return this.props.children
    }
}
