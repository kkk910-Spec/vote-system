'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Copy, QrCode, Plus, Trash2, ExternalLink, Link2, Vote } from 'lucide-react';
import QRCode from 'qrcode';
import Link from 'next/link';

interface Vote {
  id: string;
  title: string;
  description: string;
  status: string;
  candidates?: { id: string; name: string }[];
}

interface AgentLink {
  id: string;
  vote_id: string;
  link_code: string;
  click_count: number;
  vote_count: number;
  created_at: string;
  votes?: { title: string };
}

interface User {
  id: string;
  username: string;
  role: 'admin' | 'agent';
  name: string | null;
}

export default function LinksPage() {
  const [user, setUser] = useState<User | null>(null);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [links, setLinks] = useState<AgentLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [selectedVoteId, setSelectedVoteId] = useState('');
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [agents, setAgents] = useState<User[]>([]);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [currentLink, setCurrentLink] = useState<{ link: string; voteTitle: string; qrCode?: string } | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 获取用户信息
      const userRes = await fetch('/api/auth/me', { credentials: 'include' });
      const userData = await userRes.json();
      setUser(userData.user);

      // 获取所有进行中的投票（代理可以选择）
      const votesRes = await fetch('/api/votes', { credentials: 'include' });
      const votesData = await votesRes.json();
      setVotes(votesData.votes || []);

      // 管理员获取代理列表
      if (userData.user?.role === 'admin') {
        const usersRes = await fetch('/api/users', { credentials: 'include' });
        const usersData = await usersRes.json();
        const agentList = (usersData.users || []).filter((u: User) => u.role === 'agent');
        setAgents(agentList);
      }

      // 获取代理的推广链接
      const linksRes = await fetch('/api/agent-links', { credentials: 'include' });
      const linksData = await linksRes.json();
      setLinks(linksData.links || []);
    } catch (error) {
      console.error('获取数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // 获取当前域名
  const getDomain = () => {
    if (typeof window !== 'undefined') {
      return window.location.origin;
    }
    return '';
  };

  const generateLink = async () => {
    if (!selectedVoteId) return;
    // 管理员必须选择代理
    if (user?.role === 'admin' && !selectedAgentId) {
      alert('请选择代理');
      return;
    }

    try {
      const body: Record<string, string> = { vote_id: selectedVoteId };
      if (user?.role === 'admin') {
        body.agent_id = selectedAgentId;
      }

      const res = await fetch('/api/agent-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (data.success) {
        setDialogOpen(false);
        setSelectedVoteId('');
        setSelectedAgentId('');
        
        // 显示成功弹窗（附带二维码）
        const link = `${getDomain()}?ref=${data.link.link_code}`;
        const voteTitle = data.link.vote_title || votes.find(v => v.id === selectedVoteId)?.title || '';
        
        // 生成二维码
        const qr = await QRCode.toDataURL(link, {
          width: 200,
          margin: 2,
        });
        
        setCurrentLink({ link, voteTitle, qrCode: qr });
        setSuccessDialogOpen(true);
        
        fetchData();
      } else {
        alert(data.error || '生成失败');
      }
    } catch (error) {
      console.error('生成链接失败:', error);
      alert('生成失败');
    }
  };

  const deleteLink = async (linkId: string) => {
    if (!confirm('确定要删除此推广链接吗？')) return;

    try {
      const res = await fetch(`/api/agent-links?id=${linkId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      const data = await res.json();
      if (data.success) {
        fetchData();
      } else {
        alert(data.error || '删除失败');
      }
    } catch (error) {
      console.error('删除链接失败:', error);
      alert('删除失败');
    }
  };

  const showQRCode = async (linkCode: string) => {
    const link = `${getDomain()}?ref=${linkCode}`;
    
    try {
      const qr = await QRCode.toDataURL(link, {
        width: 300,
        margin: 2,
      });
      setQrCodeUrl(qr);
      setQrDialogOpen(true);
    } catch (error) {
      console.error('生成二维码失败:', error);
    }
  };

  const copyLink = (linkCode: string) => {
    const link = `${getDomain()}?ref=${linkCode}`;
    navigator.clipboard.writeText(link);
    alert('链接已复制到剪贴板');
  };

  const getFullLink = (linkCode: string) => {
    return `${getDomain()}?ref=${linkCode}`;
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
        <div>
          <h1 className="text-2xl font-bold">推广链接</h1>
          <p className="text-gray-500">
            选择投票项目生成专属推广链接，用户通过您的链接投票后，手机号将记录在您的账户下
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          生成推广链接
        </Button>
      </div>

      {links.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Link2 className="h-16 w-16 text-gray-300 mb-4" />
            <p className="text-gray-500 mb-4">暂无推广链接</p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              生成推广链接
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {links.map((link) => (
            <Card key={link.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Vote className="h-5 w-5 text-blue-600" />
                      <span className="font-medium">{link.votes?.title || '未知投票'}</span>
                      <Badge variant="outline">点击 {link.click_count || 0}</Badge>
                      <Badge variant="secondary">投票 {link.vote_count || 0}</Badge>
                    </div>
                    <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-2">
                      <Input
                        value={getFullLink(link.link_code)}
                        readOnly
                        className="font-mono text-sm bg-transparent border-0"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyLink(link.link_code)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => showQRCode(link.link_code)}
                      >
                        <QrCode className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                      >
                        <a href={getFullLink(link.link_code)} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                      创建时间: {new Date(link.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {/* 查看投票记录 */}
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/admin/records/${link.vote_id}`}>
                        查看记录
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => deleteLink(link.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 生成推广链接弹窗 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>生成推广链接</DialogTitle>
            <DialogDescription>
              选择一个投票项目，生成您的专属推广链接
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {user?.role === 'admin' && (
              <div className="space-y-2">
                <Label>选择代理</Label>
                <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="请选择代理" />
                  </SelectTrigger>
                  <SelectContent>
                    {agents.map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.name || agent.username}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>选择投票项目</Label>
              <Select value={selectedVoteId} onValueChange={setSelectedVoteId}>
                <SelectTrigger>
                  <SelectValue placeholder="请选择投票项目" />
                </SelectTrigger>
                <SelectContent>
                  {votes.filter(v => v.status === 'active').map((vote) => (
                    <SelectItem key={vote.id} value={vote.id}>
                      {vote.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {votes.filter(v => v.status === 'active').length === 0 && (
              <p className="text-sm text-gray-500">
                暂无可用的投票项目，请等待管理员创建
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={generateLink} disabled={!selectedVoteId || (user?.role === 'admin' && !selectedAgentId)}>
              生成链接
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 成功弹窗 - 附带二维码 */}
      <AlertDialog open={successDialogOpen} onOpenChange={setSuccessDialogOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-center text-green-600">✓ 推广链接已生成</AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <div className="text-center">
                <p className="font-medium text-gray-900">{currentLink?.voteTitle}</p>
              </div>
              
              {/* 二维码 */}
              {currentLink?.qrCode && (
                <div className="flex justify-center">
                  <img src={currentLink.qrCode} alt="二维码" className="rounded-lg border shadow-sm" />
                </div>
              )}
              
              {/* 链接 */}
              <div className="bg-gray-50 rounded-lg p-3">
                <code className="text-xs break-all block text-center">{currentLink?.link}</code>
              </div>
              
              <p className="text-xs text-gray-500 text-center">
                用户扫描二维码或访问链接投票后，手机号将记录在您的账户下
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
            <AlertDialogAction 
              className="w-full sm:w-auto"
              onClick={() => {
                // 下载二维码
                if (currentLink?.qrCode) {
                  const a = document.createElement('a');
                  a.href = currentLink.qrCode;
                  a.download = `qrcode-${Date.now()}.png`;
                  a.click();
                }
              }}
            >
              下载二维码
            </AlertDialogAction>
            <AlertDialogAction 
              className="w-full sm:w-auto"
              onClick={() => navigator.clipboard.writeText(currentLink?.link || '')}
            >
              复制链接
            </AlertDialogAction>
            <AlertDialogAction 
              className="w-full sm:w-auto"
              onClick={() => setSuccessDialogOpen(false)}
            >
              关闭
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 二维码弹窗 */}
      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>推广链接二维码</DialogTitle>
            <DialogDescription>
              扫描二维码即可访问投票页面
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center py-4">
            <img src={qrCodeUrl} alt="QR Code" className="rounded-lg" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQrDialogOpen(false)}>
              关闭
            </Button>
            <Button onClick={() => {
              const a = document.createElement('a');
              a.href = qrCodeUrl;
              a.download = 'qrcode.png';
              a.click();
            }}>
              下载二维码
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
