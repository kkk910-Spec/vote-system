'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Eye, Download } from 'lucide-react';

interface VoteRecord {
  id: string;
  phone_number: string;
  created_at: string;
  ip_address?: string;
  candidate_id: string;
  vote_candidates: {
    name: string;
  };
}

interface VoteInfo {
  id: string;
  title: string;
  candidates: { id: string; name: string }[];
}

export default function VoteRecordsPage() {
  const params = useParams();
  const router = useRouter();
  const voteId = params.id as string;
  
  const [voteInfo, setVoteInfo] = useState<VoteInfo | null>(null);
  const [records, setRecords] = useState<VoteRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<string>('');
  const [showFullPhone, setShowFullPhone] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const voteRes = await fetch(`/api/votes/${voteId}`, {
          credentials: 'include',
        });
        
        if (!voteRes.ok) {
          const voteErr = await voteRes.json().catch(() => ({}));
          throw new Error(voteErr.error || `获取投票信息失败 (${voteRes.status})`);
        }
        
        const voteData = await voteRes.json();
        setVoteInfo(voteData.vote);
        
        const recordsUrl = selectedCandidate
          ? `/api/votes/${voteId}/records?candidate_id=${selectedCandidate}`
          : `/api/votes/${voteId}/records`;
        
        const recordsRes = await fetch(recordsUrl, {
          credentials: 'include',
        });
        
        if (!recordsRes.ok) {
          const recordsErr = await recordsRes.json().catch(() => ({}));
          throw new Error(recordsErr.error || `获取投票记录失败 (${recordsRes.status})`);
        }
        
        const recordsData = await recordsRes.json();
        setRecords(recordsData.records || []);
        
      } catch (err) {
        console.error('获取数据失败:', err);
        setError(err instanceof Error ? err.message : '获取数据失败');
      } finally {
        setLoading(false);
      }
    };
    
    if (voteId) {
      fetchData();
    }
  }, [voteId, selectedCandidate]);

  const handleExport = () => {
    if (!records.length) return;
    
    const headers = ['手机号', '候选人', '投票时间', 'IP地址'];
    const rows = records.map(r => [
      r.phone_number || '',
      r.vote_candidates?.name || '',
      r.created_at ? new Date(r.created_at).toLocaleString('zh-CN') : '',
      r.ip_address || '',
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `投票记录_${voteInfo?.title || voteId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const maskPhone = (phone: string) => {
    if (!phone || phone.length < 7) return phone;
    return phone.slice(0, 3) + '****' + phone.slice(-4);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
          <p className="font-medium">加载失败</p>
          <p className="text-sm mt-1">{error}</p>
          <button
            onClick={() => router.push('/admin/votes')}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700"
          >
            返回投票管理
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{voteInfo?.title || '投票记录'}</h1>
          <p className="text-gray-500 mt-1">共 {records.length} 条记录</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowFullPhone(!showFullPhone)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 flex items-center gap-2"
          >
            <Eye className="h-4 w-4" />
            {showFullPhone ? '隐藏手机号' : '查看完整手机号'}
          </button>
          <button
            onClick={handleExport}
            disabled={!records.length}
            className="px-4 py-2 bg-green-600 text-white rounded-md text-sm hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            导出 CSV
          </button>
          <button
            onClick={() => router.push('/admin/votes')}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
          >
            返回
          </button>
        </div>
      </div>

      {voteInfo?.candidates && voteInfo.candidates.length > 0 && (
        <div className="mb-4">
          <select
            value={selectedCandidate}
            onChange={(e) => setSelectedCandidate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="">全部候选人</option>
            {voteInfo.candidates.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      )}

      {records.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500">暂无投票记录</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">手机号</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">候选人</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">投票时间</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP地址</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {records.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {showFullPhone 
                      ? (record.phone_number || '-') 
                      : maskPhone(record.phone_number || '')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {record.vote_candidates?.name || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {record.created_at ? new Date(record.created_at).toLocaleString('zh-CN') : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {record.ip_address || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
