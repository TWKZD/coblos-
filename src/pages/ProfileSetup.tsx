import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { RoomType } from '../types';

export default function ProfileSetup() {
  const { user, userProfile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { roomId, roomType } = (location.state as { roomId?: string, roomType?: RoomType }) || {};

  const [displayName, setDisplayName] = useState(userProfile?.displayName || '');
  const [extraData, setExtraData] = useState('');
  const [loading, setLoading] = useState(false);

  if (!user) {
    navigate('/login');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const profileUpdates: any = {
        displayName,
      };

      if (roomType === 'osis') {
        profileUpdates['profileData.class'] = extraData;
      } else if (roomType === 'rt') {
        profileUpdates['profileData.address'] = extraData;
      } else {
        profileUpdates['profileData.role'] = extraData;
      }

      await updateDoc(doc(db, 'users', user.uid), profileUpdates);
      await refreshProfile();

      if (roomId) {
        navigate(`/room/${roomId}`);
      } else {
        navigate('/');
      }
    } catch (error) {
      console.error("Error updating profile", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-12">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Lengkapi Profil Anda</h1>
        <p className="text-gray-500 mb-6">Sebelum memilih, mohon lengkapi data diri Anda untuk keperluan verifikasi.</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap</label>
            <input
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {roomType === 'osis' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kelas / Jabatan (Guru)</label>
              <input
                type="text"
                required
                placeholder="Contoh: XII IPA 1 atau Guru Matematika"
                value={extraData}
                onChange={(e) => setExtraData(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {roomType === 'rt' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Alamat / Nomor Rumah</label>
              <input
                type="text"
                required
                placeholder="Contoh: Blok A No. 12"
                value={extraData}
                onChange={(e) => setExtraData(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {(!roomType || !['osis', 'rt'].includes(roomType)) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Peran / Instansi</label>
              <input
                type="text"
                required
                placeholder="Contoh: Mahasiswa, Warga, dll"
                value={extraData}
                onChange={(e) => setExtraData(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !displayName || !extraData}
            className="w-full bg-blue-600 text-white px-4 py-3 rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors mt-4"
          >
            {loading ? 'Menyimpan...' : 'Simpan & Lanjutkan'}
          </button>
        </form>
      </div>
    </div>
  );
}
