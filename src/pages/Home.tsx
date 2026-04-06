import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ArrowRight, PlusCircle, Search, X, Info } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [roomCode, setRoomCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem('hasSeenWelcome');
    if (!hasSeenWelcome) {
      setShowWelcome(true);
    }
  }, []);

  const closeWelcome = () => {
    localStorage.setItem('hasSeenWelcome', 'true');
    setShowWelcome(false);
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomCode.trim()) return;

    setLoading(true);

    try {
      // Find Room
      const roomsRef = collection(db, 'rooms');
      const qRoom = query(roomsRef, where('code', '==', roomCode.toUpperCase()));
      const roomSnapshot = await getDocs(qRoom);

      if (roomSnapshot.empty) {
        toast.error('Ruangan tidak ditemukan. Periksa kembali kode Anda.');
        setLoading(false);
        return;
      }

      const roomDoc = roomSnapshot.docs[0];
      const roomId = roomDoc.id;

      toast.success('Ruangan ditemukan! Memasuki ruangan...');
      // Navigate to voting room without token data
      navigate(`/room/${roomId}`);

    } catch (err) {
      console.error(err);
      toast.error('Terjadi kesalahan saat mencari ruangan.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto mt-8 sm:mt-12 px-4 sm:px-0">
      <div className="text-center mb-12 sm:mb-16">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tight mb-4 leading-tight">
          Pemilihan Digital yang <span className="text-blue-600">Aman & Transparan</span>
        </h1>
        <p className="text-lg sm:text-xl text-gray-500 max-w-2xl mx-auto">
          Buat ruang pemilihan untuk Ketua OSIS, RT, atau acara lainnya. Bagikan kode ruangan dan token unik kepada peserta.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 sm:gap-8">
        {/* Join Room Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-6">
            <Search size={24} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Ikuti Pemilihan</h2>
          <p className="text-gray-500 mb-6 text-sm sm:text-base">Masukkan kode ruangan untuk melihat kandidat atau hasil pemilihan.</p>
          
          <form onSubmit={handleJoinRoom} className="space-y-4">
            <div>
              <input
                type="text"
                placeholder="Kode Ruangan (Contoh: 482910)"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 uppercase font-mono text-center tracking-widest"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading || !roomCode}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Mencari...' : 'Masuk Ruangan'}
              <ArrowRight size={18} />
            </button>
          </form>
        </div>

        {/* Create Room Card */}
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-sm border border-gray-800 p-6 sm:p-8 text-white hover:shadow-lg transition-shadow flex flex-col">
          <div className="w-12 h-12 bg-white/10 text-white rounded-xl flex items-center justify-center mb-6">
            <PlusCircle size={24} />
          </div>
          <h2 className="text-2xl font-bold mb-2">Buat Pemilihan Baru</h2>
          <p className="text-gray-300 mb-8 text-sm sm:text-base flex-grow">Jadi panitia? Buat ruang pemilihan Anda sendiri, atur kandidat, dan pantau hasilnya secara real-time.</p>
          
          <Link
            to={user ? "/create" : "/login"}
            className="w-full flex items-center justify-center gap-2 bg-white text-gray-900 px-6 py-3 rounded-xl font-medium hover:bg-gray-100 transition-colors mt-auto"
          >
            Buat Ruangan Sekarang
            <ArrowRight size={18} />
          </Link>
        </div>
      </div>

      {/* Welcome Modal */}
      {showWelcome && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 sm:p-8 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-blue-600"></div>
            <button 
              onClick={closeWelcome}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-full p-1 transition-colors"
            >
              <X size={20} />
            </button>
            
            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
              <Info size={32} />
            </div>
            
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">Selamat Datang di CoblosinAja! 🎉</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Platform e-voting modern yang aman dan mudah digunakan. Berikut cara kerjanya:
            </p>
            
            <div className="space-y-4 mb-8">
              <div className="flex gap-4 items-start">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold flex-shrink-0 mt-0.5">1</div>
                <div>
                  <h4 className="font-bold text-gray-900">Buat Ruangan</h4>
                  <p className="text-sm text-gray-500">Login dan buat ruang pemilihan. Anda akan mendapatkan Kode Ruangan dan Token unik untuk setiap pemilih.</p>
                </div>
              </div>
              <div className="flex gap-4 items-start">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold flex-shrink-0 mt-0.5">2</div>
                <div>
                  <h4 className="font-bold text-gray-900">Bagikan Akses</h4>
                  <p className="text-sm text-gray-500">Berikan Kode Ruangan kepada semua orang untuk melihat kandidat, dan berikan Token hanya kepada pemilih sah.</p>
                </div>
              </div>
              <div className="flex gap-4 items-start">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold flex-shrink-0 mt-0.5">3</div>
                <div>
                  <h4 className="font-bold text-gray-900">Pantau & Akhiri</h4>
                  <p className="text-sm text-gray-500">Pantau partisipasi secara real-time. Akhiri pemilihan untuk melihat hasil akhir dan unduh laporannya.</p>
                </div>
              </div>
            </div>
            
            <button
              onClick={closeWelcome}
              className="w-full bg-blue-600 text-white px-6 py-3.5 rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-md hover:shadow-lg"
            >
              Mulai Menggunakan CoblosinAja
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
