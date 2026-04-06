import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { signInWithGoogle } from '../lib/firebase';
import { Vote } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Login() {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleGoogleLogin = async () => {
    try {
      await signInWithGoogle();
      toast.success('Berhasil login!');
      navigate('/');
    } catch (error) {
      console.error("Login failed", error);
      toast.error('Gagal login. Silakan coba lagi.');
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 sm:px-0">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-6 sm:p-8 text-center border border-gray-100">
        <div className="mx-auto bg-blue-100 text-blue-600 w-16 h-16 rounded-full flex items-center justify-center mb-6">
          <Vote size={32} />
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Selamat Datang</h2>
        <p className="text-gray-500 mb-8 text-sm sm:text-base">Masuk untuk mulai membuat atau mengikuti pemilihan.</p>
        
        <button
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 rounded-xl px-6 py-3.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all shadow-sm"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
          Lanjutkan dengan Google
        </button>
      </div>
    </div>
  );
}
