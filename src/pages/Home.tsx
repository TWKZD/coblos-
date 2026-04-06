import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ArrowRight, PlusCircle, Search } from 'lucide-react';

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [roomCode, setRoomCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomCode.trim()) return;

    setLoading(true);
    setError('');

    try {
      // Find Room
      const roomsRef = collection(db, 'rooms');
      const qRoom = query(roomsRef, where('code', '==', roomCode.toUpperCase()));
      const roomSnapshot = await getDocs(qRoom);

      if (roomSnapshot.empty) {
        setError('Ruangan tidak ditemukan. Periksa kembali kode Anda.');
        setLoading(false);
        return;
      }

      const roomDoc = roomSnapshot.docs[0];
      const roomId = roomDoc.id;

      // Navigate to voting room without token data
      navigate(`/room/${roomId}`);

    } catch (err) {
      console.error(err);
      setError('Terjadi kesalahan saat mencari ruangan.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto mt-12">
      <div className="text-center mb-16">
        <h1 className="text-5xl font-extrabold text-gray-900 tracking-tight mb-4">
          Pemilihan Digital yang <span className="text-blue-600">Aman & Transparan</span>
        </h1>
        <p className="text-xl text-gray-500 max-w-2xl mx-auto">
          Buat ruang pemilihan untuk Ketua OSIS, RT, atau acara lainnya. Bagikan kode ruangan dan token unik kepada peserta.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Join Room Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-6">
            <Search size={24} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Ikuti Pemilihan</h2>
          <p className="text-gray-500 mb-6">Masukkan kode ruangan untuk melihat kandidat atau hasil pemilihan.</p>
          
          <form onSubmit={handleJoinRoom} className="space-y-4">
            <div>
              <input
                type="text"
                placeholder="Kode Ruangan (Contoh: OSIS26)"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 uppercase font-mono text-center tracking-widest"
                required
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
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
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-sm border border-gray-800 p-8 text-white hover:shadow-lg transition-shadow">
          <div className="w-12 h-12 bg-white/10 text-white rounded-xl flex items-center justify-center mb-6">
            <PlusCircle size={24} />
          </div>
          <h2 className="text-2xl font-bold mb-2">Buat Pemilihan Baru</h2>
          <p className="text-gray-300 mb-8">Jadi panitia? Buat ruang pemilihan Anda sendiri, atur kandidat, dan pantau hasilnya secara real-time.</p>
          
          <Link
            to={user ? "/create" : "/login"}
            className="w-full flex items-center justify-center gap-2 bg-white text-gray-900 px-6 py-3 rounded-xl font-medium hover:bg-gray-100 transition-colors"
          >
            Buat Ruangan Sekarang
            <ArrowRight size={18} />
          </Link>
        </div>
      </div>
    </div>
  );
}
