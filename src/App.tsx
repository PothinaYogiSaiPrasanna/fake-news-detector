import { ErrorBoundary } from './components/common/ErrorBoundary';
import { LoadingSpinner } from './components/common/LoadingSpinner';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { InputSection } from './components/InputSection/InputSection';
import { ResultsPanel } from './components/ResultsPanel/ResultsPanel';
import { useAnalysis } from './hooks/useAnalysis';

function App() {
  const { result, loading, progress, error, analyze, reset } = useAnalysis();

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header onReset={reset} hasResult={result !== null} />

      <main className="flex-1">
        <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
          <div className="text-center mb-8 sm:mb-12">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
              TruthScope
            </h1>
            <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">
              Analyze news, claims, and statements for misinformation.
              <strong className="text-gray-700"> All processing is done in your browser</strong> —
              nothing is sent to any server.
            </p>
          </div>

          <ErrorBoundary>
            <InputSection onAnalyze={analyze} disabled={loading} />
          </ErrorBoundary>

          <div className="mt-6">
            {loading && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                <LoadingSpinner
                  message="Analyzing content..."
                  progress={progress}
                />
                <p className="text-center text-xs text-gray-400 mt-4">
                  First analysis downloads Gemma 2B (~1.3GB), subsequent runs use cached model.
                </p>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                <div className="text-3xl mb-2">⚠️</div>
                <h2 className="text-lg font-semibold text-red-800 mb-2">Analysis Failed</h2>
                <p className="text-red-600 mb-4">{error}</p>
                <button
                  onClick={reset}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Try Again
                </button>
              </div>
            )}

            {result && !loading && (
              <ErrorBoundary>
                <ResultsPanel result={result} />
              </ErrorBoundary>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default App;
