import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Topbar from './components/Topbar';
import ProtectedRoute from './components/ProtectedRoute';

import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import FindDoctor from './pages/FindDoctor';
import BookAppointment from './pages/BookAppointment';
import MyAppointments from './pages/MyAppointments';
import AppointmentDetail from './pages/AppointmentDetail';
import AdminDashboard from './pages/AdminDashboard';
import Settings from './pages/Settings';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="app-shell">
          <Topbar />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

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
            <Route path="/settings" element={
              <ProtectedRoute allowedRoles={['patient', 'doctor', 'admin']}><Settings /></ProtectedRoute>
            } />
          </Routes>
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}
