'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Download, Eye, EyeOff, Users, Copy, Check } from 'lucide-react';

interface VoteRecord {
  id: string;
  phone_number: string;
  created_at: string;
  candidate_name: string;
  vote_id: string;
  vote_title: string;
  agent_name?: string;
  agent_username?: string;
}

interface UserInfo {
  id: string;
  username: string;
  role: string;
  name: string;
}

export default function RecordsPage() {
  const router = useRouter();
  const [records, setRecords] = useState<VoteRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [showFullPhone, setShowFullPhone] = useState(false);
  const [stats, setStats] = useState({ total: 0, today: 0 });
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  const checkAuth = async () => {
    const res = await fetch('/api/auth/me', { credentials: 'include' });
    const data = await res.json();
    if (!data.user) {
      router.push('/admin/login');
    } else {
      setUser(data.user);
    }
  };

  const fetchRecords = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      // 获取所有投票项目
      const votesRes = await fetch('/api/votes', { credentials: 'include' });
      const votesData = await votesRes.json();
      const votes = votesData.votes || [];

      // 获取每个投票的记录
      const allRecords: VoteRecord[] = [];
      for (const vote of votes) {
        const recordsRes = await fetch(`/api/votes/${vote.id}/records`, { credentials: 'include' });
        const recordsData = await recordsRes.json();
        const voteRecords = (recordsData.records || []).map((r: Record<string, unknown>) => ({
          ...r,
          vote_title: r.vote_title as string || vote.title,
          candidate_name: r.candidate_name as string || '未知',
          agent_name: r.agent_name as string || '',
        }));
        allRecords.push(...voteRecords);
      }

      // 按时间排序
      allRecords.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setRecords(allRecords);

      // 计算统计
      const today = new Date().toDateString();
      setStats({
        total: allRecords.length,
        today: allRecords.filter(r => new Date(r.created_at).toDateString() === today).length,
      });
    } catch (error) {
      console.error('获取记录失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
    fetchRecords();
  }, []);

  // 自动刷新：每3秒拉取最新数据
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchRecords(true);
    }, 3000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const maskPhone = (phone: string) => {
    if (!phone || phone.length < 7) return phone;
    return phone.slice(0, 3) + '****' + phone.slice(-4);
  };

  const exportCSV = () => {
    const headers = ['手机号', '来源代理', '投票项目', '投票时间'];
    const rows = records.map(r => [
      r.phone_number,
      r.agent_name || '直接访问',
      r.vote_title,
      new Date(r.created_at).toLocaleString('zh-CN'),
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `投票记录_${new Date().toLocaleDateString()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">
            {user?.role === 'admin' ? '全部投票记录' : '我的投票记录'}
          </h1>
          <label className="flex items-center gap-1.5 text-sm text-gray-500 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded"
            />
            自动刷新
          </label>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => fetchRecords()} variant="outline" size="sm">
            刷新
          </Button>
          <Button onClick={exportCSV} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            导出CSV
          </Button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总投票数</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">今日投票</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.today}</div>
          </CardContent>
        </Card>
      </div>

      {/* 记录表格 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>投票记录列表</CardTitle>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowFullPhone(!showFullPhone)}
            >
              {showFullPhone ? (
                <>
                  <EyeOff className="h-4 w-4 mr-2" />
                  隐藏号码
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4 mr-2" />
                  查看完整号码
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {records.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              暂无投票记录
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>手机号</TableHead>
                    <TableHead>来源代理</TableHead>
                    <TableHead>投票项目</TableHead>
                    <TableHead>投票时间</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-mono">
                        <div className="flex items-center gap-2">
                          <span>{showFullPhone ? record.phone_number : maskPhone(record.phone_number)}</span>
                          <button
                            onClick={() => copyToClipboard(record.phone_number, record.id)}
                            className="p-1 hover:bg-gray-100 rounded transition-colors"
                            title="复制号码"
                          >
                            {copiedId === record.id ? (
                              <Check className="h-4 w-4 text-green-500" />
                            ) : (
                              <Copy className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                            )}
                          </button>
                        </div>
                      </TableCell>
                      <TableCell>
                        {record.agent_name ? (
                          <Badge variant="secondary">{record.agent_name}</Badge>
                        ) : (
                          <span className="text-gray-400">直接访问</span>
                        )}
                      </TableCell>
                      <TableCell>{record.vote_title}</TableCell>
                      <TableCell className="text-gray-500">
                        {new Date(record.created_at).toLocaleString('zh-CN')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
