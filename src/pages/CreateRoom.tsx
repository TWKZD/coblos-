import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { collection, addDoc, writeBatch, doc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { RoomType, RoomTheme } from '../types';

export default function CreateRoom() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [type, setType] = useState<RoomType>('osis');
  const [theme, setTheme] = useState<RoomTheme>('blue');
  const [totalVoters, setTotalVoters] = useState<number>(10);
  const [loading, setLoading] = useState(false);

  // Generate random 6-digit numeric code
  const generateNumericCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  // Generate random 8-character alphanumeric token
  const generateAlphanumericToken = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      // Ensure unique room code
      let isUniqueCode = false;
      let code = '';
      while (!isUniqueCode) {
        code = generateNumericCode();
        const q = query(collection(db, 'rooms'), where('code', '==', code));
        const snap = await getDocs(q);
        if (snap.empty) {
          isUniqueCode = true;
        }
      }

      const now = Date.now();
      const expiresAt = now + 30 * 24 * 60 * 60 * 1000; // 30 days

      const roomData = {
        title,
        type,
        code,
        creatorId: user.uid,
        status: 'active',
        createdAt: now,
        expiresAt,
        totalVoters,
        theme,
      };

      const roomRef = await addDoc(collection(db, 'rooms'), roomData);
      
      // Generate unique tokens in batch
      const batch = writeBatch(db);
      const generatedTokens = new Set<string>();
      
      while (generatedTokens.size < totalVoters) {
        const tokenString = generateAlphanumericToken();
        if (!generatedTokens.has(tokenString)) {
          generatedTokens.add(tokenString);
          const tokenRef = doc(db, 'tokens', tokenString);
          batch.set(tokenRef, {
            roomId: roomRef.id,
            token: tokenString,
            isUsed: false,
          });
        }
      }
      
      await batch.commit();

      navigate(`/admin/${roomRef.id}`);
    } catch (error) {
      console.error("Error creating room:", error);
      alert("Gagal membuat ruangan.");
    } finally {
      setLoading(false);
    }
  };

  const themes: { id: RoomTheme; label: string; colorClass: string }[] = [
    { id: 'blue', label: 'Biru (Default)', colorClass: 'bg-blue-500' },
    { id: 'green', label: 'Hijau', colorClass: 'bg-green-500' },
    { id: 'purple', label: 'Ungu', colorClass: 'bg-purple-500' },
    { id: 'orange', label: 'Oranye', colorClass: 'bg-orange-500' },
    { id: 'rose', label: 'Merah Muda', colorClass: 'bg-rose-500' },
  ];

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Buat Ruang Pemilihan</h1>
        <p className="text-gray-500 mb-8">Atur detail dasar untuk pemilihan Anda. Anda dapat menambahkan kandidat setelah ini.</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nama Pemilihan
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: Pemilihan Ketua OSIS 2026"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Jumlah Peserta (Pemilih)
            </label>
            <input
              type="number"
              required
              min="1"
              max="1000"
              value={totalVoters}
              onChange={(e) => setTotalVoters(parseInt(e.target.value))}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">Sistem akan otomatis membuatkan token unik sejumlah peserta ini.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Jenis Pemilihan
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { id: 'osis', label: 'Ketua OSIS' },
                { id: 'rt', label: 'Ketua RT/RW' },
                { id: 'presiden', label: 'Presiden BEM' },
                { id: 'pejabat', label: 'Pejabat Daerah' },
                { id: 'custom', label: 'Lainnya' },
              ].map((t) => (
                <label
                  key={t.id}
                  className={`
                    cursor-pointer border rounded-xl p-4 text-center transition-all
                    ${type === t.id ? 'border-blue-600 bg-blue-50 text-blue-700 ring-1 ring-blue-600' : 'border-gray-200 hover:border-gray-300'}
                  `}
                >
                  <input
                    type="radio"
                    name="type"
                    value={t.id}
                    checked={type === t.id}
                    onChange={(e) => setType(e.target.value as RoomType)}
                    className="sr-only"
                  />
                  <span className="font-medium text-sm">{t.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tema Warna Ruangan
            </label>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {themes.map((t) => (
                <label
                  key={t.id}
                  className={`
                    cursor-pointer border rounded-xl p-3 flex flex-col items-center gap-2 transition-all
                    ${theme === t.id ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-600' : 'border-gray-200 hover:border-gray-300'}
                  `}
                >
                  <input
                    type="radio"
                    name="theme"
                    value={t.id}
                    checked={theme === t.id}
                    onChange={(e) => setTheme(e.target.value as RoomTheme)}
                    className="sr-only"
                  />
                  <div className={`w-6 h-6 rounded-full ${t.colorClass}`}></div>
                  <span className="font-medium text-xs text-center">{t.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={loading || !title || totalVoters < 1}
              className="w-full bg-blue-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Membuat...' : 'Buat Ruangan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
