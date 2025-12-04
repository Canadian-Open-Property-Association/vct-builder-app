import { useNavigate } from 'react-router-dom';

interface AppCard {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  path: string;
  available: boolean;
}

const apps: AppCard[] = [
  {
    id: 'vct-builder',
    name: 'VCT Builder',
    description: 'Build Verifiable Credential Type files for wallet display and branding',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
      </svg>
    ),
    path: '/apps/vct-builder',
    available: true,
  },
  {
    id: 'schema-builder',
    name: 'Schema Builder',
    description: 'Create JSON Schemas for credential data validation',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
      </svg>
    ),
    path: '/apps/schema-builder',
    available: true,
  },
];

export default function AppSelectionPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-full bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-900">Welcome to Credential Design Tools</h1>
          <p className="mt-2 text-gray-600">
            Select an application to get started
          </p>
        </div>

        {/* App Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {apps.map((app) => (
            <div
              key={app.id}
              className={`relative bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden transition-all ${
                app.available
                  ? 'hover:shadow-lg hover:border-blue-300 cursor-pointer'
                  : 'opacity-60'
              }`}
              onClick={() => app.available && navigate(app.path)}
            >
              {/* Coming Soon Badge */}
              {!app.available && (
                <div className="absolute top-3 right-3 px-2 py-1 bg-amber-100 text-amber-800 text-xs font-medium rounded-full">
                  Coming Soon
                </div>
              )}

              <div className="p-6">
                {/* Icon */}
                <div className={`w-14 h-14 rounded-lg flex items-center justify-center mb-4 ${
                  app.available
                    ? 'bg-blue-100 text-blue-600'
                    : 'bg-gray-100 text-gray-400'
                }`}>
                  {app.icon}
                </div>

                {/* Content */}
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  {app.name}
                </h2>
                <p className="text-gray-600 text-sm mb-4">
                  {app.description}
                </p>

                {/* Action */}
                {app.available ? (
                  <button
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(app.path);
                    }}
                  >
                    Open App
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                ) : (
                  <span className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-500 text-sm font-medium rounded-lg">
                    Not Available Yet
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-sm text-gray-500">
          <p>Part of the COPA Credential Ecosystem</p>
        </div>
      </div>
    </div>
  );
}
