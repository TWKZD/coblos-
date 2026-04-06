import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, deleteDoc, doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Room, UserProfile } from '../types';
import { Shield, Trash2, Users, Home, Github, Save } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function DeveloperDashboard() {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  
  // GitHub Settings
  const [githubToken, setGithubToken] = useState('');
  const [githubOwner, setGithubOwner] = useState('');
  const [githubRepo, setGithubRepo] = useState('');
  const [githubFolder, setGithubFolder] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    if (userProfile?.role !== 'developer') {
      navigate('/');
      return;
    }

    const fetchData = async () => {
      try {
        const roomsSnap = await getDocs(collection(db, 'rooms'));
        const usersSnap = await getDocs(collection(db, 'users'));
        const settingsSnap = await getDoc(doc(db, 'settings', 'github'));

        setRooms(roomsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Room)));
        setUsers(usersSnap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile)));
        
        if (settingsSnap.exists()) {
          const data = settingsSnap.data();
          setGithubToken(data.token || '');
          setGithubOwner(data.owner || '');
          setGithubRepo(data.repo || '');
          setGithubFolder(data.folder || '');
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Gagal memuat data dashboard");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userProfile, navigate]);

  const handleSaveGithubSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      await setDoc(doc(db, 'settings', 'github'), {
        token: githubToken,
        owner: githubOwner,
        repo: githubRepo,
        folder: githubFolder,
        updatedAt: Date.now()
      });
      toast.success('Pengaturan GitHub berhasil disimpan');
    } catch (error) {
      console.error("Error saving github settings:", error);
      toast.error('Gagal menyimpan pengaturan GitHub');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleDeleteRoom = async (roomId: string) => {
    if (confirm('Are you sure you want to delete this room? This action cannot be undone.')) {
      try {
        await deleteDoc(doc(db, 'rooms', roomId));
        setRooms(rooms.filter(r => r.id !== roomId));
        toast.success('Ruangan berhasil dihapus');
      } catch (error) {
        console.error("Error deleting room:", error);
        toast.error("Gagal menghapus ruangan");
      }
    }
  };

  const handleDeleteUser = async (uid: string) => {
    if (confirm('Are you sure you want to delete this user profile?')) {
      try {
        await deleteDoc(doc(db, 'users', uid));
        setUsers(users.filter(u => u.uid !== uid));
        toast.success('Pengguna berhasil dihapus');
      } catch (error) {
        console.error("Error deleting user:", error);
        toast.error("Gagal menghapus pengguna");
      }
    }
  };

  if (loading) return <div className="text-center py-12">Loading...</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="bg-purple-600 text-white rounded-2xl p-8 flex items-center gap-4 shadow-sm">
        <Shield size={48} />
        <div>
          <h1 className="text-3xl font-bold">Developer Dashboard</h1>
          <p className="text-purple-100">Manage system resources, monitor activity, and configure integrations.</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* GitHub Integration Settings */}
        <div className="md:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-6">
            <Github className="text-gray-900" size={24} />
            <h2 className="text-xl font-bold text-gray-900">Pengaturan Integrasi GitHub</h2>
          </div>
          <p className="text-gray-500 mb-6 text-sm">
            Konfigurasikan repositori GitHub untuk menyimpan hasil pemilihan secara permanen. 
            Firebase hanya akan digunakan sebagai penyimpanan sementara untuk menjaga performa.
          </p>
          
          <form onSubmit={handleSaveGithubSettings} className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">GitHub Personal Access Token</label>
              <input
                type="password"
                value={githubToken}
                onChange={(e) => setGithubToken(e.target.value)}
                placeholder="ghp_xxxxxxxxxxxx"
                className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Repository Owner (Username/Org)</label>
              <input
                type="text"
                value={githubOwner}
                onChange={(e) => setGithubOwner(e.target.value)}
                placeholder="Contoh: kaidev0101"
                className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Repository Name</label>
              <input
                type="text"
                value={githubRepo}
                onChange={(e) => setGithubRepo(e.target.value)}
                placeholder="Contoh: coblosinaja-data"
                className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Folder Path</label>
              <input
                type="text"
                value={githubFolder}
                onChange={(e) => setGithubFolder(e.target.value)}
                placeholder="Contoh: results/2026"
                className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div className="md:col-span-2 flex justify-end">
              <button
                type="submit"
                disabled={savingSettings}
                className="flex items-center gap-2 bg-purple-600 text-white px-6 py-2 rounded-xl hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                <Save size={18} />
                {savingSettings ? 'Menyimpan...' : 'Simpan Pengaturan'}
              </button>
            </div>
          </form>
        </div>

        {/* Rooms Management */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Home className="text-blue-600" /> All Rooms ({rooms.length})
            </h2>
          </div>
          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
            {rooms.map(room => (
              <div key={room.id} className="border border-gray-100 rounded-xl p-4 hover:border-gray-200 transition-colors">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-gray-900">{room.title}</h3>
                    <p className="text-sm text-gray-500">Code: {room.code} | Status: {room.status}</p>
                    <p className="text-xs text-gray-400 mt-1">Creator ID: {room.creatorId}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteRoom(room.id!)}
                    className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete Room"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
            {rooms.length === 0 && <p className="text-gray-500 text-center py-4">No rooms found.</p>}
          </div>
        </div>

        {/* Users Management */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Users className="text-green-600" /> All Users ({users.length})
            </h2>
          </div>
          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
            {users.map(u => (
              <div key={u.uid} className="border border-gray-100 rounded-xl p-4 hover:border-gray-200 transition-colors">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-gray-900">{u.displayName || 'Unknown'}</h3>
                    <p className="text-sm text-gray-500">{u.email}</p>
                    <span className={`inline-block mt-2 px-2 py-1 text-xs font-medium rounded-md ${
                      u.role === 'developer' ? 'bg-purple-100 text-purple-800' :
                      u.role === 'admin' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {u.role}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDeleteUser(u.uid)}
                    className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete User"
                    disabled={u.role === 'developer'}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
            {users.length === 0 && <p className="text-gray-500 text-center py-4">No users found.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
