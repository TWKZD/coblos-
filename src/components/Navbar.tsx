import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { logOut } from '../lib/firebase';
import { Vote, LogOut, User, Shield, LayoutDashboard, Menu, X } from 'lucide-react';

export default function Navbar() {
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logOut();
    navigate('/login');
  };

  const closeMenu = () => setIsMenuOpen(false);

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 relative z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-2" onClick={closeMenu}>
              <div className="bg-blue-600 text-white p-2 rounded-lg">
                <Vote size={24} />
              </div>
              <span className="font-bold text-xl tracking-tight text-gray-900">CoblosinAja</span>
            </Link>
          </div>
          
          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-4">
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
                <div className="flex items-center gap-2 text-sm text-gray-600 border-l border-gray-200 pl-4 ml-2">
                  <User size={16} />
                  <span className="font-medium">{userProfile?.displayName || user.email}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-red-600 transition-colors ml-2"
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

          {/* Mobile Menu Button */}
          <div className="flex items-center md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-500 hover:text-gray-700 focus:outline-none p-2"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden absolute top-16 left-0 w-full bg-white border-b border-gray-200 shadow-lg">
          <div className="px-4 pt-2 pb-4 space-y-1">
            {user ? (
              <>
                <div className="px-3 py-3 border-b border-gray-100 mb-2 flex items-center gap-3">
                  <div className="bg-blue-100 text-blue-600 p-2 rounded-full flex-shrink-0">
                    <User size={20} />
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-sm font-medium text-gray-900 truncate">{userProfile?.displayName || 'User'}</p>
                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                  </div>
                </div>
                <Link 
                  to="/dashboard" 
                  onClick={closeMenu}
                  className="flex items-center gap-3 text-gray-700 hover:bg-gray-50 hover:text-blue-600 px-3 py-3 rounded-md font-medium transition-colors"
                >
                  <LayoutDashboard size={18} />
                  Dashboard
                </Link>
                {userProfile?.role === 'developer' && (
                  <Link 
                    to="/developer" 
                    onClick={closeMenu}
                    className="flex items-center gap-3 text-purple-700 hover:bg-purple-50 px-3 py-3 rounded-md font-medium transition-colors"
                  >
                    <Shield size={18} />
                    Developer Dashboard
                  </Link>
                )}
                <button
                  onClick={() => { closeMenu(); handleLogout(); }}
                  className="w-full flex items-center gap-3 text-left text-red-600 hover:bg-red-50 px-3 py-3 rounded-md font-medium transition-colors mt-2"
                >
                  <LogOut size={18} />
                  Keluar
                </button>
              </>
            ) : (
              <Link
                to="/login"
                onClick={closeMenu}
                className="block w-full text-center px-4 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 mt-2"
              >
                Masuk
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
