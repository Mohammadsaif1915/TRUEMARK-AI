import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ADMIN_ROLES = ['administrator', 'admin'];

/**
 * AdminRoute — Extends ProtectedRoute with role enforcement.
 * Non-admin authenticated users are redirected to their dashboard.
 * Unauthenticated users are redirected to login.
 */
const AdminRoute = ({ children }) => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center space-y-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-800"></div>
          <p className="text-gray-500 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!ADMIN_ROLES.includes(user?.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-800">Access Denied</p>
          <p className="text-gray-500 mt-2">You do not have permission to access this page.</p>
          <a href="/dashboard" className="mt-4 inline-block text-blue-600 hover:underline">
            Go to Dashboard
          </a>
        </div>
      </div>
    );
  }

  return children;
};

export default AdminRoute;
