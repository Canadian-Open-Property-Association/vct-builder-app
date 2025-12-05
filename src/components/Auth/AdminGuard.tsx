import { ReactNode, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAdminStore } from '../../store/adminStore';

interface AdminGuardProps {
  children: ReactNode;
}

export default function AdminGuard({ children }: AdminGuardProps) {
  const { isAdmin, isAdminLoading, isAdminChecked, checkAdminStatus } = useAdminStore();

  useEffect(() => {
    checkAdminStatus();
  }, [checkAdminStatus]);

  // Show loading while checking admin status
  if (isAdminLoading || !isAdminChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-600">Checking access...</p>
        </div>
      </div>
    );
  }

  // Redirect non-admins to app selection
  if (!isAdmin) {
    return <Navigate to="/apps" replace />;
  }

  return <>{children}</>;
}
