import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * This page handles the OAuth callback when authentication happens in a popup window.
 * It communicates the result back to the opener window and closes itself.
 */
export default function AuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const success = searchParams.get('success') === 'true';
  const error = searchParams.get('error');

  useEffect(() => {
    // Send message to opener (parent window) with auth result
    if (window.opener) {
      window.opener.postMessage(
        {
          type: 'OAUTH_CALLBACK',
          success,
          error: error || null,
        },
        '*' // In production, you might want to restrict this to your domain
      );
      // Close the popup after a short delay to ensure message is sent
      setTimeout(() => {
        window.close();
      }, 100);
    } else {
      // If no opener, redirect to main app (fallback for direct navigation)
      window.location.href = success ? '/apps' : `/login${error ? `?error=${error}` : ''}`;
    }
  }, [success, error]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="text-gray-600 text-lg mb-2">
          {success ? 'Authentication successful!' : 'Authentication failed'}
        </div>
        <div className="text-gray-500 text-sm">
          This window will close automatically...
        </div>
      </div>
    </div>
  );
}
