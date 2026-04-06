/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { Toaster } from 'react-hot-toast';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CreateRoom from './pages/CreateRoom';
import RoomAdmin from './pages/RoomAdmin';
import VotingRoom from './pages/VotingRoom';
import ProfileSetup from './pages/ProfileSetup';
import DeveloperDashboard from './pages/DeveloperDashboard';

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-50 text-gray-900 font-sans flex flex-col">
          <Toaster position="top-center" />
          <Navbar />
          <main className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/create" element={<CreateRoom />} />
              <Route path="/admin/:roomId" element={<RoomAdmin />} />
              <Route path="/room/:roomId" element={<VotingRoom />} />
              <Route path="/profile-setup" element={<ProfileSetup />} />
              <Route path="/developer" element={<DeveloperDashboard />} />
            </Routes>
          </main>
          <footer className="py-6 text-center text-sm text-gray-500">
            Powered by <a href="https://kaidev.my.id" target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-600 hover:text-blue-800 transition-colors">Kai Developer</a>
          </footer>
        </div>
      </Router>
    </AuthProvider>
  );
}
