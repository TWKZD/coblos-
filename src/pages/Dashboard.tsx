import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Room } from '../types';
import { PlusCircle, Settings, Users, Clock } from 'lucide-react';
import { format } from 'date-fns';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    const fetchRooms = async () => {
      try {
        const q = query(collection(db, 'rooms'), where('creatorId', '==', user.uid));
        const querySnapshot = await getDocs(q);
        const fetchedRooms = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Room[];
        
        // Sort by createdAt descending
        fetchedRooms.sort((a, b) => b.createdAt - a.createdAt);
        setRooms(fetchedRooms);
      } catch (error) {
        console.error("Error fetching rooms:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRooms();
  }, [user, navigate]);

  if (loading) return <div className="text-center py-12">Memuat...</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard Saya</h1>
          <p className="text-gray-500 mt-1">Kelola ruang pemilihan yang telah Anda buat.</p>
        </div>
        <Link
          to="/create"
          className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-blue-700 transition-colors"
        >
          <PlusCircle size={20} />
          Buat Ruangan
        </Link>
      </div>

      {rooms.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-12 text-center">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <PlusCircle size={32} />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Belum Ada Ruangan</h2>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">Anda belum membuat ruang pemilihan apapun. Mulai buat ruangan pertama Anda sekarang.</p>
          <Link
            to="/create"
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors"
          >
            Buat Ruangan Pertama
          </Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rooms.map(room => (
            <div key={room.id} className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-md transition-shadow flex flex-col">
              <div className="flex justify-between items-start mb-4">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${room.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                  {room.status === 'active' ? 'Berlangsung' : 'Selesai'}
                </span>
                <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded text-gray-600">
                  {room.code}
                </span>
              </div>
              
              <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2">{room.title}</h3>
              
              <div className="mt-auto pt-4 space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Users size={16} />
                  <span>{room.totalVoters || 0} Peserta</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Clock size={16} />
                  <span>Dibuat: {format(room.createdAt, 'dd MMM yyyy')}</span>
                </div>
              </div>
              
              <div className="mt-6 pt-4 border-t border-gray-100 flex gap-3">
                <Link
                  to={`/admin/${room.id}`}
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-lg font-medium hover:bg-blue-100 transition-colors text-sm"
                >
                  <Settings size={16} />
                  Kelola
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
