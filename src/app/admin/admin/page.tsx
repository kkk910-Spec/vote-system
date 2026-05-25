'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Vote, Users, BarChart3, Clock } from 'lucide-react';

interface Stats {
  totalVotes: number;
  activeVotes: number;
  totalParticipants: number;
  totalUsers: number;
}

interface User {
  id: string;
  username: string;
  role: 'admin' | 'agent';
  name: string | null;
}

interface RecentVote {
  id: string;
  title: string;
  status: string;
  created_at: string;
  _count?: { options: number };
}

export default function AdminDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<Stats>({
    totalVotes: 0,
    activeVotes: 0,
    totalParticipants: 0,
    totalUsers: 0,
  });
  const [recentVotes, setRecentVotes] = useState<RecentVote[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const userRes = await fetch('/api/auth/me', { credentials: 'include' });
      const userData = await userRes.json();
      setUser(userData.user);

      const votesRes = await fetch('/api/votes', { credentials: 'include' });
      const votesData = await votesRes.json();
      
      if (votesData.votes) {
        const votes = votesData.votes;
        const activeVotes = votes.filter((v: RecentVote) => v.status === 'active');
        const totalParticipants = votes.reduce((sum: number, v: RecentVote & { options: { vote_count: number }[] }) => {
          return sum + (v.options?.reduce((s: number, o: { vote_count: number }) => s + o.vote_count, 0) || 0);
        }, 0);

        setStats({
          totalVotes: votes.length,
          activeVotes: activeVotes.length,
          totalParticipants,
          totalUsers: 0,
        });
        setRecentVotes(votes.slice(0, 5));
      }

      if (userData.user?.role === 'admin') {
        const usersRes = await fetch('/api/users', { credentials: 'include' });
        const usersData = await usersRes.json();
        if (usersData.users) {
          setStats(prev => ({ ...prev, totalUsers: usersData.users.length }));
        }
      }
    } catch (error) {
      console.error('获取数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">控制台</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          欢迎回来，{user?.name || user?.username}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-50 p-2 rounded-lg">
              <Vote className="h-4 w-4 text-blue-500" />
            </div>
            <div>
              <p className="text-xs text-gray-400">投票总数</p>
              <p className="text-xl font-bold text-gray-900">{stats.totalVotes}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="bg-green-50 p-2 rounded-lg">
              <Clock className="h-4 w-4 text-green-500" />
            </div>
            <div>
              <p className="text-xs text-gray-400">进行中</p>
              <p className="text-xl font-bold text-gray-900">{stats.activeVotes}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="bg-purple-50 p-2 rounded-lg">
              <BarChart3 className="h-4 w-4 text-purple-500" />
            </div>
            <div>
              <p className="text-xs text-gray-400">参与人数</p>
              <p className="text-xl font-bold text-gray-900">{stats.totalParticipants}</p>
            </div>
          </div>
        </div>

        {user?.role === 'admin' && (
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-center gap-3">
              <div className="bg-orange-50 p-2 rounded-lg">
                <Users className="h-4 w-4 text-orange-500" />
              </div>
              <div>
                <p className="text-xs text-gray-400">用户总数</p>
                <p className="text-xl font-bold text-gray-900">{stats.totalUsers}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Recent Votes */}
      <div className="bg-white rounded-xl border border-gray-100">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">最近投票</h2>
        </div>
        <div className="p-5">
          {recentVotes.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">暂无投票数据</p>
          ) : (
            <div className="space-y-2">
              {recentVotes.map((vote) => (
                <div 
                  key={vote.id} 
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-sm text-gray-900">{vote.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatDate(vote.created_at)}</p>
                  </div>
                  <Badge 
                    variant={vote.status === 'active' ? 'default' : 'secondary'}
                    className={vote.status === 'active' ? 'bg-blue-500' : 'bg-gray-200 text-gray-600'}
                  >
                    {vote.status === 'active' ? '进行中' : '已结束'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
