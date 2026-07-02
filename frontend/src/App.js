import React from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import ProtectedRoute from './components/ProtectedRoute';

import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import FindDoctor from './pages/FindDoctor';
import BookAppointment from './pages/BookAppointment';
import MyAppointments from './pages/MyAppointments';
import AppointmentDetail from './pages/AppointmentDetail';
import AdminDashboard from './pages/AdminDashboard';
import AdminAppointments from './pages/AdminAppointments';
import Settings from './pages/Settings';

function AppLayout() {
  const location = useLocation();
  const authRoutes = ['/login', '/register'];
  const isAuthPage = authRoutes.includes(location.pathname);

  if (isAuthPage) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Routes>
    );
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/doctors" element={
            <ProtectedRoute allowedRoles={['patient']}><FindDoctor /></ProtectedRoute>
          } />
          <Route path="/book/:doctorId" element={
            <ProtectedRoute allowedRoles={['patient']}><BookAppointment /></ProtectedRoute>
          } />
          <Route path="/appointments" element={
            <ProtectedRoute allowedRoles={['patient', 'doctor']}><MyAppointments /></ProtectedRoute>
          } />
          <Route path="/appointments/:id" element={
            <ProtectedRoute allowedRoles={['patient', 'doctor', 'admin']}><AppointmentDetail /></ProtectedRoute>
          } />
          <Route path="/admin" element={
            <ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>
          } />
          <Route path="/admin/appointments" element={
            <ProtectedRoute allowedRoles={['admin']}><AdminAppointments /></ProtectedRoute>
          } />
          <Route path="/settings" element={
            <ProtectedRoute allowedRoles={['patient', 'doctor', 'admin']}><Settings /></ProtectedRoute>
          } />
        </Routes>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppLayout />
      </AuthProvider>
    </BrowserRouter>
  );
}