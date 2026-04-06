export type RoomType = 'osis' | 'rt' | 'presiden' | 'pejabat' | 'custom';
export type RoomTheme = 'blue' | 'green' | 'purple' | 'orange' | 'rose';

export interface Room {
  id: string;
  code: string;
  title: string;
  type: RoomType;
  creatorId: string;
  status: 'active' | 'ended';
  createdAt: number;
  expiresAt: number; // 30 days from creation
  totalVoters?: number;
  theme?: RoomTheme;
}

export interface Candidate {
  id: string;
  roomId: string;
  name: string;
  image: string;
  vision: string;
  mission: string;
  order: number;
}

export interface Token {
  id: string;
  roomId: string;
  token: string;
  isUsed: boolean;
  usedAt?: number;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  role: 'admin' | 'voter' | 'developer';
  profileData?: {
    class?: string; // For OSIS
    role?: string; // e.g., teacher, student
    address?: string; // For RT
    [key: string]: any;
  };
}

export interface Vote {
  id: string;
  roomId: string;
  candidateId: string;
  timestamp: number;
}

export interface AuditLog {
  id: string;
  roomId: string;
  userId: string;
  userName: string;
  action: string;
  timestamp: number;
}
