import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function LoginPage() {
  const { isAuthenticated, isLoading, login } = useAuthStore();
  const navigate = useNavigate();

  // Redirect to apps if already authenticated
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      navigate('/apps');
    }
  }, [isAuthenticated, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600 text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
        <div className="text-center mb-8">
          <img
            src="/favicon.png"
            alt="COPA"
            className="w-16 h-16 mx-auto mb-4"
          />
          <h1 className="text-3xl font-bold text-slate-800 mb-2">COPA Apps</h1>
          <p className="text-slate-600">
            A digital trust toolkit for the COPA ecosystem
          </p>
        </div>

        <div className="border-t border-gray-200 pt-6">
          <p className="text-sm text-gray-600 mb-4 text-center">
            Sign in with your GitHub account to access the tools.
          </p>

          <button
            onClick={login}
            className="w-full px-4 py-3 bg-slate-800 text-white hover:bg-slate-900 rounded-lg flex items-center justify-center gap-3 font-medium transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            Sign in with GitHub
          </button>
        </div>

        <p className="text-xs text-gray-500 mt-6 text-center">
          You need access to the{' '}
          <a
            href="https://github.com/Canadian-Open-Property-Association/governance"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 underline"
          >
            COPA governance repository
          </a>{' '}
          to use this tool.
        </p>
      </div>
    </div>
  );
}
