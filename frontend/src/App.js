import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Register from './pages/Register';
import ScanUpload from './pages/ScanUpload';
import ScanResult from './pages/ScanResult';
import Dashboard from './pages/Dashboard';
import History from './pages/History';
import IndiaMap from './pages/IndiaMap';
import CitizenReport from './pages/CitizenReport';

const App = () => {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/report" element={
              <>
                <Navbar />
                <main><CitizenReport /></main>
              </>
            } />

            {/* Protected app routes */}
            <Route
              path="/upload"
              element={
                <ProtectedRoute>
                  <Navbar />
                  <main><ScanUpload /></main>
                </ProtectedRoute>
              }
            />
            <Route
              path="/scan/:id"
              element={
                <ProtectedRoute>
                  <Navbar />
                  <main><ScanResult /></main>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Navbar />
                  <main><Dashboard /></main>
                </ProtectedRoute>
              }
            />
            <Route
              path="/map"
              element={
                <ProtectedRoute>
                  <Navbar />
                  <main><IndiaMap /></main>
                </ProtectedRoute>
              }
            />
            <Route
              path="/history"
              element={
                <ProtectedRoute>
                  <Navbar />
                  <main><History /></main>
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <ToastContainer
            position="top-right"
            autoClose={4000}
            hideProgressBar={false}
            newestOnTop
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="light"
          />
        </div>
      </Router>
    </AuthProvider>
  );
};

export default App;
