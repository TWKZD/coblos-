import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs, runTransaction, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Room, Candidate, Token, RoomTheme } from '../types';
import { CheckCircle, Users, Lock, X } from 'lucide-react';
import toast from 'react-hot-toast';

const themeColors: Record<RoomTheme, { bg: string, text: string, border: string, ring: string, lightBg: string }> = {
  blue: { bg: 'bg-blue-600', text: 'text-blue-600', border: 'border-blue-600', ring: 'ring-blue-100', lightBg: 'bg-blue-50' },
  green: { bg: 'bg-green-600', text: 'text-green-600', border: 'border-green-600', ring: 'ring-green-100', lightBg: 'bg-green-50' },
  purple: { bg: 'bg-purple-600', text: 'text-purple-600', border: 'border-purple-600', ring: 'ring-purple-100', lightBg: 'bg-purple-50' },
  orange: { bg: 'bg-orange-600', text: 'text-orange-600', border: 'border-orange-600', ring: 'ring-orange-100', lightBg: 'bg-orange-50' },
  rose: { bg: 'bg-rose-600', text: 'text-rose-600', border: 'border-rose-600', ring: 'ring-rose-100', lightBg: 'bg-rose-50' },
};

export default function VotingRoom() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();

  const [room, setRoom] = useState<Room | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [voteCounts, setVoteCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [hasVoted, setHasVoted] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<string | null>(null);
  
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [tokenInput, setTokenInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!roomId) return;

    // Listen to room changes for real-time notifications
    const unsubscribeRoom = onSnapshot(doc(db, 'rooms', roomId), (docSnap) => {
      if (docSnap.exists()) {
        const roomData = { id: docSnap.id, ...docSnap.data() } as Room;
        
        // Check if status changed
        setRoom((prev) => {
          if (prev && prev.status === 'active' && roomData.status === 'ended') {
            toast.success('Pemilihan telah berakhir! Hasil sekarang dapat dilihat.', { duration: 5000 });
          } else if (prev && prev.status === 'ended' && roomData.status === 'active') {
            toast.success('Pemilihan telah dimulai kembali!', { duration: 5000 });
          }
          return roomData;
        });
      } else {
        setError('Ruangan tidak ditemukan.');
        setLoading(false);
      }
    }, (err) => {
      console.error(err);
      setError('Gagal memuat data ruangan.');
    });

    // Fetch Candidates
    const qCandidates = query(collection(db, 'candidates'), where('roomId', '==', roomId));
    getDocs(qCandidates).then(candSnap => {
      const cands = candSnap.docs.map(d => ({ id: d.id, ...d.data() } as Candidate));
      setCandidates(cands.sort((a, b) => a.order - b.order));
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });

    return () => unsubscribeRoom();
  }, [roomId]);

  useEffect(() => {
    if (!roomId || !room || room.status !== 'ended') return;

    // If room is ended, fetch votes to show results
    const qVotes = query(collection(db, 'votes'), where('roomId', '==', roomId));
    getDocs(qVotes).then(voteSnap => {
      const counts: Record<string, number> = {};
      voteSnap.docs.forEach(d => {
        const candidateId = d.data().candidateId;
        counts[candidateId] = (counts[candidateId] || 0) + 1;
      });
      setVoteCounts(counts);
    }).catch(err => console.error(err));
  }, [roomId, room?.status]);

  const handleVote = async () => {
    if (!selectedCandidate || !roomId || !tokenInput.trim()) return;
    
    setSubmitting(true);
    setError('');
    
    try {
      const tokenString = tokenInput.toUpperCase();
      const tokenRef = doc(db, 'tokens', tokenString);
      
      await runTransaction(db, async (transaction) => {
        const tDoc = await transaction.get(tokenRef);
        if (!tDoc.exists() || tDoc.data().roomId !== roomId) {
          throw new Error("Token tidak valid untuk ruangan ini.");
        }
        if (tDoc.data().isUsed) {
          throw new Error("Token ini sudah digunakan.");
        }

        // 1. Mark token as used
        transaction.update(tokenRef, {
          isUsed: true,
          usedAt: Date.now()
        });

        // 2. Add anonymous vote
        const voteRef = doc(collection(db, 'votes'));
        transaction.set(voteRef, {
          roomId,
          candidateId: selectedCandidate,
          timestamp: Date.now()
        });

        // 3. Add audit log (anonymous)
        const logRef = doc(collection(db, 'audit_logs'));
        transaction.set(logRef, {
          roomId,
          userId: 'anonymous_voter',
          userName: `Pemilih (Token: ${tokenString})`,
          action: 'VOTED',
          timestamp: Date.now()
        });
      });

      setHasVoted(true);
      setShowTokenModal(false);
      toast.success('Suara Anda berhasil dikirim!');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Gagal mengirim suara.');
      toast.error(err.message || 'Gagal mengirim suara.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="text-center py-12">Memuat...</div>;
  if (error && !room) return <div className="text-center py-12 text-red-600">{error}</div>;
  if (!room) return null;

  const theme = room.theme || 'blue';
  const colors = themeColors[theme];

  if (room.status === 'ended') {
    return (
      <div className="max-w-4xl mx-auto space-y-8 px-4 sm:px-0">
        <div className={`text-center py-8 bg-white rounded-2xl shadow-sm border border-gray-200`}>
          <CheckCircle className={`w-16 h-16 ${colors.text} mx-auto mb-4`} />
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Pemilihan Telah Berakhir</h2>
          <p className="text-gray-500">Berikut adalah hasil akhir dari pemilihan <strong>{room.title}</strong>.</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {candidates.map((candidate) => (
            <div key={candidate.id} className="bg-white rounded-2xl border border-gray-200 p-6 relative overflow-hidden shadow-sm">
              <div className={`absolute top-0 right-0 ${colors.bg} text-white w-12 h-12 flex items-center justify-center rounded-bl-2xl font-bold text-xl`}>
                {candidate.order}
              </div>
              <div className="flex flex-col items-center text-center mb-6">
                <div className="w-24 h-24 bg-gray-100 rounded-full overflow-hidden mb-4">
                  {candidate.image ? (
                    <img src={candidate.image} alt={candidate.name} className="w-full h-full object-cover" />
                  ) : (
                    <Users className="w-12 h-12 m-6 text-gray-400" />
                  )}
                </div>
                <h3 className="text-xl font-bold text-gray-900">{candidate.name}</h3>
              </div>
              <div className={`${colors.lightBg} rounded-xl p-4 text-center`}>
                <span className={`block text-sm ${colors.text} font-medium mb-1`}>Perolehan Suara</span>
                <span className={`text-4xl font-bold ${colors.text}`}>{voteCounts[candidate.id] || 0}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (hasVoted) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12 sm:py-16 bg-white rounded-2xl shadow-sm border border-gray-200 px-4 sm:px-8">
        <CheckCircle className={`w-16 h-16 ${colors.text} mx-auto mb-4`} />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Terima Kasih!</h2>
        <p className="text-gray-500 mb-6">Suara Anda telah berhasil direkam secara anonim.</p>
        <div className={`inline-flex items-center gap-2 px-4 py-3 ${colors.lightBg} ${colors.text} rounded-xl text-sm text-left`}>
          <Lock size={18} className="flex-shrink-0" />
          <span>Hasil pemilihan dirahasiakan hingga proses voting ditutup oleh panitia.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 px-4 sm:px-0">
      <div className="text-center">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">{room.title}</h1>
        <p className="text-gray-500">Silakan pilih salah satu kandidat di bawah ini.</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {candidates.map((candidate) => (
          <div 
            key={candidate.id}
            onClick={() => setSelectedCandidate(candidate.id)}
            className={`
              bg-white rounded-2xl border-2 transition-all cursor-pointer overflow-hidden relative
              ${selectedCandidate === candidate.id ? `${colors.border} ring-4 ${colors.ring} shadow-md` : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'}
            `}
          >
            <div className={`absolute top-0 right-0 ${colors.bg} text-white w-12 h-12 flex items-center justify-center rounded-bl-2xl font-bold text-xl z-10`}>
              {candidate.order}
            </div>
            
            <div className="aspect-square bg-gray-100 relative">
              {candidate.image ? (
                <img src={candidate.image} alt={candidate.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <Users size={64} />
                </div>
              )}
            </div>
            
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">{candidate.name}</h3>
              
              <div className="space-y-3 text-sm">
                <div>
                  <strong className="text-gray-900 block mb-1">Visi:</strong>
                  <p className="text-gray-600 line-clamp-3">{candidate.vision}</p>
                </div>
                <div>
                  <strong className="text-gray-900 block mb-1">Misi:</strong>
                  <p className="text-gray-600 line-clamp-3">{candidate.mission}</p>
                </div>
              </div>
            </div>
            
            {selectedCandidate === candidate.id && (
              <div className={`absolute inset-0 border-4 ${colors.border} rounded-2xl pointer-events-none`}></div>
            )}
          </div>
        ))}
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-40">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-gray-600 text-center sm:text-left">
            {selectedCandidate ? (
              <span>Anda memilih: <strong className="text-gray-900">{candidates.find(c => c.id === selectedCandidate)?.name}</strong></span>
            ) : (
              <span>Pilih salah satu kandidat untuk melanjutkan.</span>
            )}
          </div>
          <button
            onClick={() => setShowTokenModal(true)}
            disabled={!selectedCandidate}
            className={`w-full sm:w-auto ${colors.bg} text-white px-8 py-3 rounded-xl font-bold hover:opacity-90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2`}
          >
            Kirim Suara
            <CheckCircle size={20} />
          </button>
        </div>
      </div>
      
      {/* Spacer for fixed bottom bar */}
      <div className="h-32 sm:h-24"></div>

      {/* Token Modal */}
      {showTokenModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 sm:p-8 relative max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => setShowTokenModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-full p-1 transition-colors"
            >
              <X size={20} />
            </button>
            
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Masukkan Token</h3>
            <p className="text-gray-500 mb-6 text-sm sm:text-base">Silakan masukkan token pemilih Anda untuk mengonfirmasi suara.</p>
            
            <div className="space-y-4">
              <div>
                <input
                  type="text"
                  placeholder="Token (Contoh: X7Y8Z9)"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value.toUpperCase())}
                  className={`w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:${colors.ring} focus:${colors.border} uppercase font-mono text-center tracking-widest text-lg`}
                  required
                />
              </div>
              
              {error && <p className="text-red-500 text-sm text-center">{error}</p>}
              
              <button
                onClick={handleVote}
                disabled={submitting || !tokenInput.trim()}
                className={`w-full ${colors.bg} text-white px-6 py-3.5 rounded-xl font-medium hover:opacity-90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2`}
              >
                {submitting ? 'Memverifikasi...' : 'Konfirmasi Suara'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
