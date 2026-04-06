import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc, collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, onSnapshot, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Room, Candidate, AuditLog, Token, RoomTheme } from '../types';
import { Plus, Trash2, Users, FileText, CheckCircle, Clock, Key, Palette, Github, RefreshCw, Search } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const themes: { id: RoomTheme; label: string; colorClass: string }[] = [
  { id: 'blue', label: 'Biru', colorClass: 'bg-blue-500' },
  { id: 'green', label: 'Hijau', colorClass: 'bg-green-500' },
  { id: 'purple', label: 'Ungu', colorClass: 'bg-purple-500' },
  { id: 'orange', label: 'Oranye', colorClass: 'bg-orange-500' },
  { id: 'rose', label: 'Merah Muda', colorClass: 'bg-rose-500' },
];

export default function RoomAdmin() {
  const { roomId } = useParams<{ roomId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [room, setRoom] = useState<Room | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [voteCounts, setVoteCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'candidates' | 'tokens' | 'settings'>('candidates');
  
  // New Candidate Form
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCandidate, setNewCandidate] = useState({ name: '', vision: '', mission: '', image: '' });

  // Notification tracking
  const notifiedThresholds = useRef(new Set<number>());
  const [syncing, setSyncing] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  
  // Tokens tab state
  const [searchTerm, setSearchTerm] = useState('');
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isExportingTokensPdf, setIsExportingTokensPdf] = useState(false);

  useEffect(() => {
    if (!roomId || !user) return;

    const unsubRoom = onSnapshot(doc(db, 'rooms', roomId), (docSnap) => {
      if (docSnap.exists()) {
        const roomData = { id: docSnap.id, ...docSnap.data() } as Room;
        if (roomData.creatorId !== user.uid) {
          navigate('/'); // Not authorized
          return;
        }
        setRoom(roomData);
      }
    });

    // Listen to candidates
    const qCandidates = query(collection(db, 'candidates'), where('roomId', '==', roomId));
    const unsubCandidates = onSnapshot(qCandidates, (snapshot) => {
      const cands = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Candidate));
      setCandidates(cands.sort((a, b) => a.order - b.order));
    });

    // Listen to tokens
    const qTokens = query(collection(db, 'tokens'), where('roomId', '==', roomId));
    const unsubTokens = onSnapshot(qTokens, (snapshot) => {
      const tks = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Token));
      setTokens(tks);
    });

    // Listen to votes for counts
    const qVotes = query(collection(db, 'votes'), where('roomId', '==', roomId));
    const unsubVotes = onSnapshot(qVotes, (snapshot) => {
      const counts: Record<string, number> = {};
      snapshot.docs.forEach(d => {
        const candidateId = d.data().candidateId;
        counts[candidateId] = (counts[candidateId] || 0) + 1;
      });
      setVoteCounts(counts);
    });

    // Listen to audit logs
    const qLogs = query(collection(db, 'audit_logs'), where('roomId', '==', roomId));
    const unsubLogs = onSnapshot(qLogs, (snapshot) => {
      const lgs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AuditLog));
      setLogs(lgs.sort((a, b) => b.timestamp - a.timestamp));
      setLoading(false);
    });

    return () => {
      unsubRoom();
      unsubCandidates();
      unsubTokens();
      unsubVotes();
      unsubLogs();
    };
  }, [roomId, user, navigate]);

  // Handle notifications based on participation
  useEffect(() => {
    if (!room || !room.totalVoters || tokens.length === 0) return;
    
    const usedTokens = tokens.filter(t => t.isUsed).length;
    const percentage = (usedTokens / room.totalVoters) * 100;

    if (usedTokens > 0 && !notifiedThresholds.current.has(1)) {
      toast.success('Pemilihan telah dimulai! Suara pertama telah masuk.', { icon: '🚀' });
      notifiedThresholds.current.add(1);
    }

    if (percentage >= 50 && !notifiedThresholds.current.has(50)) {
      toast.success('50% peserta telah memberikan suara!', { icon: '📊' });
      notifiedThresholds.current.add(50);
    }

    if (percentage >= 100 && !notifiedThresholds.current.has(100)) {
      toast.success('Semua peserta telah memberikan suara! Anda dapat mengakhiri pemilihan.', { icon: '🎉', duration: 6000 });
      notifiedThresholds.current.add(100);
    }
  }, [tokens, room]);

  const handleAddCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomId) return;
    
    await addDoc(collection(db, 'candidates'), {
      ...newCandidate,
      roomId,
      order: candidates.length + 1
    });
    
    setNewCandidate({ name: '', vision: '', mission: '', image: '' });
    setShowAddModal(false);
    toast.success('Kandidat berhasil ditambahkan');
  };

  const handleDeleteCandidate = async (id: string) => {
    if (confirm('Yakin ingin menghapus kandidat ini?')) {
      await deleteDoc(doc(db, 'candidates', id));
      toast.success('Kandidat berhasil dihapus');
    }
  };

  const handleEndElection = async () => {
    if (!roomId) return;
    if (confirm('Yakin ingin mengakhiri pemilihan? Setelah diakhiri, hasil akan ditampilkan ke publik dan peserta tidak bisa memilih lagi.')) {
      await updateDoc(doc(db, 'rooms', roomId), { status: 'ended' });
      toast.success('Pemilihan telah diakhiri');
    }
  };

  const handleChangeTheme = async (newTheme: RoomTheme) => {
    if (!roomId) return;
    await updateDoc(doc(db, 'rooms', roomId), { theme: newTheme });
    toast.success('Tema ruangan berhasil diperbarui');
  };

  const syncToGithub = async () => {
    if (!room) return;
    setSyncing(true);
    
    try {
      const settingsSnap = await getDoc(doc(db, 'settings', 'github'));
      if (!settingsSnap.exists()) {
        throw new Error('Pengaturan GitHub belum dikonfigurasi di Developer Dashboard.');
      }
      
      const { token, owner, repo, folder } = settingsSnap.data();
      if (!token || !owner || !repo) {
        throw new Error('Pengaturan GitHub tidak lengkap.');
      }

      const totalVotes = Object.values(voteCounts).reduce((a: number, b: number) => a + b, 0);
      
      const reportData = {
        platform: "CoblosinAja",
        room: {
          title: room.title,
          code: room.code,
          status: room.status,
          totalVoters: room.totalVoters,
          totalVotesCast: totalVotes,
          createdAt: new Date(room.createdAt).toISOString()
        },
        results: candidates.map(c => ({
          order: c.order,
          name: c.name,
          vision: c.vision,
          mission: c.mission,
          votes: voteCounts[c.id] || 0
        }))
      };

      const contentString = JSON.stringify(reportData, null, 2);
      // Base64 encode the content, handling unicode characters properly
      const base64Content = btoa(unescape(encodeURIComponent(contentString)));
      
      const filePath = folder ? `${folder}/${room.code}.json` : `${room.code}.json`;
      const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;

      // Check if file already exists to get its SHA (required for updating)
      let sha = undefined;
      try {
        const getRes = await fetch(apiUrl, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        });
        if (getRes.ok) {
          const getData = await getRes.json();
          sha = getData.sha;
        }
      } catch (e) {
        // Ignore if file doesn't exist
      }

      const response = await fetch(apiUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `Sync results for room ${room.code}`,
          content: base64Content,
          ...(sha && { sha })
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Gagal menyimpan ke GitHub');
      }

      toast.success('Berhasil disinkronkan ke GitHub!');
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Terjadi kesalahan saat sinkronisasi');
    } finally {
      setSyncing(false);
    }
  };

  const exportPDF = async () => {
    if (!room) return;
    setGeneratingPdf(true);
    
    try {
      const element = document.getElementById('pdf-report');
      if (!element) throw new Error('Report element not found');
      
      // Temporarily make it visible for capture if it's hidden
      const originalDisplay = element.style.display;
      element.style.display = 'block';
      
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false
      });
      
      element.style.display = originalDisplay;
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Laporan_CoblosinAja_${room.code}.pdf`);
      
      toast.success('Laporan PDF berhasil diunduh');
    } catch (error) {
      console.error(error);
      toast.error('Gagal membuat laporan PDF');
    } finally {
      setGeneratingPdf(false);
    }
  };

  const exportCSV = () => {
    if (!room) return;
    
    const headers = ['No. Urut', 'Nama Kandidat', 'Jumlah Suara'];
    const rows = candidates.map(c => [
      c.order,
      `"${c.name}"`, // Quote to handle commas in names
      voteCounts[c.id] || 0
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(e => e.join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `Hasil_Pemilihan_${room.code}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportTokensCSV = () => {
    if (!room) return;
    
    const headers = ['Token', 'Status'];
    const rows = filteredTokens.map(t => [
      t.token,
      t.isUsed ? 'Sudah Digunakan' : 'Belum Digunakan'
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(e => e.join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `Token_Pemilihan_${room.code}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const generateAlphanumericToken = (length: number) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleRegenerateUnusedTokens = async () => {
    if (!roomId || !room) return;
    const unusedTokens = tokens.filter(t => !t.isUsed);
    if (unusedTokens.length === 0) {
      toast.error('Tidak ada token yang belum digunakan.');
      return;
    }

    if (!confirm(`Yakin ingin membuat ulang ${unusedTokens.length} token yang belum digunakan? Token lama akan dihapus dan diganti dengan yang baru.`)) {
      return;
    }

    setIsRegenerating(true);
    try {
      const batch = writeBatch(db);
      
      const existingTokensSnap = await getDocs(collection(db, 'tokens'));
      const existingTokenStrings = new Set(existingTokensSnap.docs.map(d => d.data().token));

      unusedTokens.forEach(t => {
        batch.delete(doc(db, 'tokens', t.id!));
      });

      for (let i = 0; i < unusedTokens.length; i++) {
        let newToken = '';
        let isUnique = false;
        while (!isUnique) {
          newToken = generateAlphanumericToken(8);
          if (!existingTokenStrings.has(newToken)) {
            isUnique = true;
            existingTokenStrings.add(newToken);
          }
        }
        const newTokenRef = doc(collection(db, 'tokens'));
        batch.set(newTokenRef, {
          roomId,
          token: newToken,
          isUsed: false
        });
      }

      await batch.commit();
      toast.success(`${unusedTokens.length} token berhasil dibuat ulang!`);
    } catch (error) {
      console.error(error);
      toast.error('Gagal membuat ulang token.');
    } finally {
      setIsRegenerating(false);
    }
  };

  const exportTokensPDF = () => {
    if (!room) return;
    setIsExportingTokensPdf(true);
    try {
      const pdf = new jsPDF();
      
      pdf.setFontSize(18);
      pdf.text(`Daftar Token - ${room.title}`, 14, 22);
      pdf.setFontSize(12);
      pdf.text(`Kode Ruangan: ${room.code}`, 14, 30);
      
      const tableData = filteredTokens.map((t, index) => [
        index + 1,
        t.token,
        t.isUsed ? 'Sudah Digunakan' : 'Belum Digunakan'
      ]);

      autoTable(pdf, {
        startY: 35,
        head: [['No', 'Token', 'Status']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246] },
      });

      pdf.save(`Token_Pemilihan_${room.code}.pdf`);
      toast.success('Token PDF berhasil diunduh');
    } catch (error) {
      console.error(error);
      toast.error('Gagal membuat PDF token');
    } finally {
      setIsExportingTokensPdf(false);
    }
  };

  const filteredTokens = tokens.filter(t => t.token.toLowerCase().includes(searchTerm.toLowerCase()));

  if (loading || !room) return <div className="text-center py-12">Memuat...</div>;

  const totalVotes = Object.values(voteCounts).reduce((a: number, b: number) => a + b, 0);

  // Data for chart
  const chartData = candidates.map(c => ({
    name: c.name,
    suara: voteCounts[c.id] || 0
  }));

  return (
    <div className="space-y-8">
      {/* Hidden Report Element for PDF Generation */}
      <div id="pdf-report" className="bg-white p-8 absolute left-[-9999px] top-[-9999px] w-[800px]">
        <div className="text-center mb-8 border-b-2 border-gray-200 pb-6">
          <h1 className="text-3xl font-bold text-blue-600 mb-2">CoblosinAja</h1>
          <h2 className="text-2xl font-bold text-gray-900">{room.title}</h2>
          <p className="text-gray-500">Kode Ruangan: {room.code}</p>
          <p className="text-gray-500">Total Suara Masuk: {totalVotes} dari {room.totalVoters} Pemilih</p>
        </div>
        
        <div className="mb-8">
          <h3 className="text-xl font-bold mb-4 text-center">Grafik Perolehan Suara</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="suara" fill="#3b82f6" name="Jumlah Suara" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-xl font-bold mb-4">Detail Kandidat</h3>
          {candidates.map(c => (
            <div key={c.id} className="flex gap-6 border border-gray-200 p-4 rounded-xl">
              <div className="w-24 h-24 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                {c.image ? (
                  <img src={c.image} alt={c.name} className="w-full h-full object-cover" crossOrigin="anonymous" />
                ) : (
                  <Users className="w-12 h-12 m-6 text-gray-400" />
                )}
              </div>
              <div className="flex-grow">
                <h4 className="text-lg font-bold text-gray-900 mb-2">{c.order}. {c.name}</h4>
                <div className="text-sm text-gray-600 mb-2">
                  <strong>Visi:</strong> {c.vision}
                </div>
                <div className="text-sm text-gray-600">
                  <strong>Misi:</strong> {c.mission}
                </div>
              </div>
              <div className="flex-shrink-0 text-center bg-blue-50 p-4 rounded-lg flex flex-col justify-center min-w-[100px]">
                <span className="text-xs text-blue-600 font-bold uppercase">Suara</span>
                <span className="text-3xl font-bold text-blue-700">{voteCounts[c.id] || 0}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-gray-900">{room.title}</h1>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${room.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
              {room.status === 'active' ? 'Berlangsung' : 'Selesai'}
            </span>
          </div>
          <p className="text-gray-500 flex items-center gap-2">
            Kode Ruangan: <strong className="text-gray-900 text-xl tracking-widest bg-gray-100 px-2 py-1 rounded">{room.code}</strong>
          </p>
        </div>
        
        <div className="flex flex-wrap gap-3 w-full md:w-auto">
          {room.status === 'ended' && (
            <button
              onClick={syncToGithub}
              disabled={syncing}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors font-medium text-sm disabled:opacity-50"
            >
              <Github size={18} />
              {syncing ? 'Menyinkronkan...' : 'Sync ke GitHub'}
            </button>
          )}
          <button
            onClick={exportCSV}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium text-sm"
          >
            <FileText size={18} />
            Ekspor CSV
          </button>
          <button
            onClick={exportPDF}
            disabled={generatingPdf}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium text-sm disabled:opacity-50"
          >
            <FileText size={18} />
            {generatingPdf ? 'Membuat PDF...' : 'Laporan PDF'}
          </button>
          {room.status === 'active' && (
            <button
              onClick={handleEndElection}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-medium text-sm"
            >
              <CheckCircle size={18} />
              Akhiri Pemilihan
            </button>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tabs */}
          <div className="flex border-b border-gray-200 overflow-x-auto">
            <button
              onClick={() => setActiveTab('candidates')}
              className={`whitespace-nowrap px-6 py-3 font-medium text-sm border-b-2 transition-colors ${activeTab === 'candidates' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              Kandidat
            </button>
            <button
              onClick={() => setActiveTab('tokens')}
              className={`whitespace-nowrap px-6 py-3 font-medium text-sm border-b-2 transition-colors ${activeTab === 'tokens' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              Token Peserta
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`whitespace-nowrap px-6 py-3 font-medium text-sm border-b-2 transition-colors ${activeTab === 'settings' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              Pengaturan
            </button>
          </div>

          {activeTab === 'candidates' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900">Kandidat ({candidates.length})</h2>
                {room.status === 'active' && (
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg"
                  >
                    <Plus size={16} /> Tambah Kandidat
                  </button>
                )}
              </div>

              {/* Chart Preview */}
              {candidates.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Grafik Perolehan Suara</h3>
                  <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" tick={{fontSize: 12}} />
                        <YAxis tick={{fontSize: 12}} />
                        <Tooltip cursor={{fill: '#f3f4f6'}} />
                        <Bar dataKey="suara" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-4">
                {candidates.map(candidate => (
                  <div key={candidate.id} className="bg-white rounded-xl border border-gray-200 p-5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 bg-blue-600 text-white w-10 h-10 flex items-center justify-center rounded-bl-xl font-bold">
                      {candidate.order}
                    </div>
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-16 h-16 bg-gray-100 rounded-full overflow-hidden flex-shrink-0">
                        {candidate.image ? (
                          <img src={candidate.image} alt={candidate.name} className="w-full h-full object-cover" />
                        ) : (
                          <Users className="w-8 h-8 m-4 text-gray-400" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-gray-900 leading-tight">{candidate.name}</h3>
                        <div className="text-sm text-gray-500 mt-1">
                          Perolehan: <strong className="text-blue-600 text-lg">{voteCounts[candidate.id] || 0}</strong> suara
                        </div>
                      </div>
                    </div>
                    {room.status === 'active' && (
                      <button
                        onClick={() => handleDeleteCandidate(candidate.id)}
                        className="w-full flex items-center justify-center gap-2 text-sm text-red-600 bg-red-50 hover:bg-red-100 py-2 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} /> Hapus
                      </button>
                    )}
                  </div>
                ))}
                {candidates.length === 0 && (
                  <div className="col-span-full text-center py-12 bg-white rounded-xl border border-dashed border-gray-300 text-gray-500">
                    Belum ada kandidat. Tambahkan kandidat pertama Anda.
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'tokens' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-xl font-bold text-gray-900">Daftar Token ({filteredTokens.length})</h2>
                <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                  <div className="relative flex-grow sm:flex-grow-0">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search size={16} className="text-gray-400" />
                    </div>
                    <input
                      type="text"
                      placeholder="Cari token..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 pr-4 py-1.5 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                  <button
                    onClick={handleRegenerateUnusedTokens}
                    disabled={isRegenerating || room.status === 'ended'}
                    className="flex items-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded-lg disabled:opacity-50"
                  >
                    <RefreshCw size={16} className={isRegenerating ? 'animate-spin' : ''} /> 
                    {isRegenerating ? 'Memproses...' : 'Regenerate Unused'}
                  </button>
                  <button
                    onClick={exportTokensCSV}
                    className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 bg-gray-100 px-3 py-1.5 rounded-lg"
                  >
                    <FileText size={16} /> CSV
                  </button>
                  <button
                    onClick={exportTokensPDF}
                    disabled={isExportingTokensPdf}
                    className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 bg-gray-100 px-3 py-1.5 rounded-lg disabled:opacity-50"
                  >
                    <FileText size={16} /> {isExportingTokensPdf ? 'PDF...' : 'PDF'}
                  </button>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="max-h-[500px] overflow-y-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                      <tr>
                        <th className="px-6 py-3 font-medium text-gray-500">No</th>
                        <th className="px-6 py-3 font-medium text-gray-500">Token</th>
                        <th className="px-6 py-3 font-medium text-gray-500">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredTokens.map((t, index) => (
                        <tr key={t.id}>
                          <td className="px-6 py-3 text-gray-500">{index + 1}</td>
                          <td className="px-6 py-3 font-mono font-medium tracking-widest">{t.token}</td>
                          <td className="px-6 py-3">
                            {t.isUsed ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-green-100 text-green-800">
                                <CheckCircle size={14} /> Digunakan
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800">
                                <Key size={14} /> Belum Digunakan
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                      {filteredTokens.length === 0 && (
                        <tr>
                          <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                            Tidak ada token yang cocok dengan pencarian.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-gray-900">Pengaturan Ruangan</h2>
              
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                  <Palette size={20} /> Tema Warna
                </h3>
                <p className="text-sm text-gray-500 mb-4">Pilih tema warna yang akan ditampilkan kepada pemilih di ruang pemilihan.</p>
                
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                  {themes.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => handleChangeTheme(t.id)}
                      className={`
                        flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all
                        ${(room.theme || 'blue') === t.id ? 'border-blue-600 bg-blue-50' : 'border-gray-100 hover:border-gray-300'}
                      `}
                    >
                      <div className={`w-8 h-8 rounded-full ${t.colorClass}`}></div>
                      <span className="text-xs font-medium text-gray-700">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar: Logs & Stats */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Statistik</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-xl">
                <span className="text-blue-900 font-medium">Total Suara Masuk</span>
                <span className="text-3xl font-bold text-blue-600">{totalVotes}</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <span className="text-gray-700 font-medium">Token Terpakai</span>
                <span className="text-xl font-bold text-gray-900">{tokens.filter(t => t.isUsed).length} / {tokens.length}</span>
              </div>
              
              {/* Progress Bar */}
              <div className="pt-2">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Partisipasi</span>
                  <span>{Math.round((tokens.filter(t => t.isUsed).length / (tokens.length || 1)) * 100)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-500" 
                    style={{ width: `${(tokens.filter(t => t.isUsed).length / (tokens.length || 1)) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Log Aktivitas</h2>
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
              {logs.map(log => (
                <div key={log.id} className="flex gap-3 text-sm border-b border-gray-100 pb-3 last:border-0">
                  <div className="mt-0.5 text-gray-400"><Clock size={16} /></div>
                  <div>
                    <p className="text-gray-900">
                      <span className="font-medium">{log.userName}</span> baru saja memberikan suara.
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {format(log.timestamp, 'dd MMM yyyy HH:mm')}
                    </p>
                  </div>
                </div>
              ))}
              {logs.length === 0 && (
                <p className="text-gray-500 text-sm text-center py-4">Belum ada aktivitas.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add Candidate Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">Tambah Kandidat</h2>
            <form onSubmit={handleAddCandidate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Kandidat / Paslon</label>
                <input
                  type="text"
                  required
                  value={newCandidate.name}
                  onChange={e => setNewCandidate({...newCandidate, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">URL Foto (Opsional)</label>
                <input
                  type="url"
                  value={newCandidate.image}
                  onChange={e => setNewCandidate({...newCandidate, image: e.target.value})}
                  placeholder="https://..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Visi</label>
                <textarea
                  required
                  value={newCandidate.vision}
                  onChange={e => setNewCandidate({...newCandidate, vision: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Misi</label>
                <textarea
                  required
                  value={newCandidate.mission}
                  onChange={e => setNewCandidate({...newCandidate, mission: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
