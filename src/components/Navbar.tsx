import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { logOut } from '../lib/firebase';
import { Vote, LogOut, User, Shield, LayoutDashboard } from 'lucide-react';

export default function Navbar() {
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logOut();
    navigate('/login');
  };

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-2">
              <div className="bg-blue-600 text-white p-2 rounded-lg">
                <Vote size={24} />
              </div>
              <span className="font-bold text-xl tracking-tight text-gray-900">CoblosinAja</span>
            </Link>
          </div>
          
          <div className="flex items-center gap-4">
            {user ? (
              <>
                <Link to="/dashboard" className="flex items-center gap-1 text-gray-600 hover:text-blue-600 px-3 py-2 rounded-md font-medium transition-colors">
                  <LayoutDashboard size={16} />
                  Dashboard
                </Link>
                {userProfile?.role === 'developer' && (
                  <Link to="/developer" className="flex items-center gap-1 text-purple-600 hover:text-purple-700 px-3 py-2 rounded-md font-medium transition-colors bg-purple-50">
                    <Shield size={16} />
                    Developer
                  </Link>
                )}
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <User size={16} />
                  <span className="font-medium">{userProfile?.displayName || user.email}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-red-600 transition-colors"
                >
                  <LogOut size={16} />
                  Keluar
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                Masuk
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
