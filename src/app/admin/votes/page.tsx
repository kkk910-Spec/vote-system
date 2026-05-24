'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Plus, Edit, Trash2, Users, Image as ImageIcon, ChevronRight, Settings } from 'lucide-react';
import Link from 'next/link';

interface Candidate {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  sms_content: string;
  vote_count: number;
  order_num: number;
}

interface VoteItem {
  id: string;
  title: string;
  description: string | null;
  status: string;
  sms_number: string;
  cover_image: string | null;
  top_text: string | null;
  vote_text: string | null;
  created_at: string;
  candidates: Candidate[];
  _count?: {
    vote_records: number;
  };
}

interface UserInfo {
  id: string;
  username: string;
  role: string;
  name: string;
}

export default function AdminVotesPage() {
  const router = useRouter();
  const [votes, setVotes] = useState<VoteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVote, setEditingVote] = useState<VoteItem | null>(null);
  const [candidatesDialogOpen, setCandidatesDialogOpen] = useState(false);
  const [currentVoteId, setCurrentVoteId] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [editingCandidate, setEditingCandidate] = useState<Partial<Candidate> | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const candidateImageRef = useRef<HTMLInputElement>(null);

  // 表单状态
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [smsNumber, setSmsNumber] = useState('106988881700511');
  const [coverImage, setCoverImage] = useState('');
  const [status, setStatus] = useState('active');
  const [topText, setTopText] = useState('');
  const [voteText, setVoteText] = useState('已有 {count} 人参与投票');

  useEffect(() => {
    checkAuth();
    fetchVotes();
  }, []);

  const checkAuth = async () => {
    const res = await fetch('/api/auth/me', { credentials: 'include' });
    const data = await res.json();
    if (!data.user) {
      router.push('/admin/login');
    } else {
      setUser(data.user);
    }
  };

  const fetchVotes = async () => {
    try {
      const res = await fetch('/api/votes', { credentials: 'include' });
      const data = await res.json();
      setVotes(data.votes || []);
    } catch (error) {
      console.error('获取投票列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setSmsNumber('106988881700511');
    setCoverImage('');
    setStatus('active');
    setTopText('');
    setVoteText('已有 {count} 人参与投票');
    setEditingVote(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (vote: VoteItem) => {
    setEditingVote(vote);
    setTitle(vote.title);
    setDescription(vote.description || '');
    setSmsNumber(vote.sms_number || '106988881700511');
    setCoverImage(vote.cover_image || '');
    setStatus(vote.status);
    setTopText(vote.top_text || '');
    setVoteText(vote.vote_text || '已有 {count} 人参与投票');
    setDialogOpen(true);
  };

  const handleSaveVote = async () => {
    if (!title.trim()) {
      alert('请输入投票标题');
      return;
    }

    setSaving(true);
    try {
      const url = editingVote ? `/api/votes/${editingVote.id}` : '/api/votes';
      const method = editingVote ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title,
          description,
          sms_number: smsNumber,
          cover_image: coverImage,
          status,
          top_text: topText,
          vote_text: voteText,
        }),
      });

      const data = await res.json();
      if (data.success || data.vote) {
        setDialogOpen(false);
        resetForm();
        fetchVotes();
      } else {
        alert(data.error || '保存失败');
      }
    } catch (error) {
      console.error('保存失败:', error);
      alert('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteVote = async (id: string) => {
    if (!confirm('确定要删除此投票吗？删除后不可恢复！')) return;
    
    try {
      const res = await fetch(`/api/votes/${id}`, { method: 'DELETE', credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        fetchVotes();
      } else {
        alert(data.error || '删除失败');
      }
    } catch (error) {
      console.error('删除失败:', error);
      alert('删除失败');
    }
  };

  const openCandidatesDialog = async (voteId: string) => {
    setCurrentVoteId(voteId);
    const vote = votes.find(v => v.id === voteId);
    if (vote) {
      setCandidates(vote.candidates || []);
    }
    setCandidatesDialogOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, isCover: boolean) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 显示上传中状态
    if (isCover) {
      setCoverImage('上传中...');
    } else {
      setEditingCandidate(prev => prev ? { ...prev, image_url: '上传中...' } : null);
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      const data = await res.json();
      
      if (data.url) {
        if (isCover) {
          setCoverImage(data.url);
        } else {
          setEditingCandidate(prev => prev ? { ...prev, image_url: data.url } : null);
        }
      } else {
        alert(data.error || '上传失败，请重试');
        // 重置状态
        if (isCover) {
          setCoverImage('');
        } else {
          setEditingCandidate(prev => prev ? { ...prev, image_url: '' } : null);
        }
      }
    } catch (error) {
      console.error('上传失败:', error);
      alert('上传失败，请检查网络连接');
      // 重置状态
      if (isCover) {
        setCoverImage('');
      } else {
        setEditingCandidate(prev => prev ? { ...prev, image_url: '' } : null);
      }
    }
  };

  const handleSaveCandidate = async () => {
    if (!editingCandidate?.name) {
      alert('请输入候选人名称');
      return;
    }

    setSaving(true);
    try {
      if (editingCandidate.id) {
        const res = await fetch(`/api/candidates/${editingCandidate.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            name: editingCandidate.name,
            description: editingCandidate.description,
            image_url: editingCandidate.image_url,
            sms_content: editingCandidate.sms_content,
            vote_count: editingCandidate.vote_count,
          }),
        });
        const data = await res.json();
        if (data.success) {
          setEditingCandidate(null);
          // 刷新候选人列表
          const res2 = await fetch(`/api/votes/${currentVoteId}`, { credentials: 'include' });
          const data2 = await res2.json();
          if (data2.vote) {
            setCandidates(data2.vote.candidates || []);
          }
          fetchVotes();
        } else {
          alert(data.error || '保存失败');
        }
      } else {
        const res = await fetch(`/api/votes/${currentVoteId}/candidates`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            name: editingCandidate.name,
            description: editingCandidate.description,
            image_url: editingCandidate.image_url,
            sms_content: editingCandidate.sms_content || `投票${editingCandidate.name}`,
          }),
        });
        const data = await res.json();
        if (data.success) {
          setEditingCandidate(null);
          fetchVotes();
          const res2 = await fetch(`/api/votes/${currentVoteId}`, { credentials: 'include' });
          const data2 = await res2.json();
          if (data2.vote) {
            setCandidates(data2.vote.candidates || []);
          }
        } else {
          alert(data.error || '保存失败');
        }
      }
    } catch (error) {
      console.error('保存失败:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCandidate = async (id: string) => {
    if (!confirm('确定要删除此候选人吗？')) return;
    
    try {
      const res = await fetch(`/api/candidates/${id}`, { method: 'DELETE', credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setCandidates(candidates.filter(c => c.id !== id));
        fetchVotes();
      }
    } catch (error) {
      console.error('删除失败:', error);
    }
  };

  const isAdmin = user?.role === 'admin';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {isAdmin ? '投票管理' : '投票列表'}
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {isAdmin ? '创建和管理投票项目' : '选择投票项目生成推广链接'}
          </p>
        </div>
        {isAdmin && (
          <Button onClick={openCreateDialog} className="bg-gray-900 hover:bg-gray-800">
            <Plus className="h-4 w-4 mr-2" />
            创建投票
          </Button>
        )}
      </div>

      {/* Votes List */}
      <div className="space-y-3">
        {votes.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-8 text-center text-sm text-gray-400">
            {isAdmin ? '暂无投票项目，点击"创建投票"开始' : '暂无可参与的投票项目'}
          </div>
        ) : (
          votes.map((vote) => (
            <div key={vote.id} className="bg-white rounded-xl border border-gray-100 p-4">
              <div className="flex items-start gap-4">
                {/* Cover Image */}
                {vote.cover_image ? (
                  <img src={vote.cover_image} alt={vote.title} className="w-16 h-16 object-cover rounded-lg flex-shrink-0" />
                ) : (
                  <div className="w-16 h-16 bg-gray-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-2xl">🗳️</span>
                  </div>
                )}
                
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-gray-900">{vote.title}</h3>
                    <Badge className={vote.status === 'active' ? 'bg-blue-500' : 'bg-gray-200 text-gray-600'}>
                      {vote.status === 'active' ? '进行中' : '已结束'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-400">
                    <span>📱 {vote.sms_number}</span>
                    <span>👥 {vote._count?.vote_records || 0} 人投票</span>
                    <span>👤 {vote.candidates?.length || 0} 位候选人</span>
                  </div>
                </div>
                
                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {isAdmin ? (
                    <>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-blue-600 border-blue-200 hover:bg-blue-50"
                        onClick={() => openCandidatesDialog(vote.id)}
                      >
                        <Settings className="h-4 w-4 mr-1" />
                        管理候选人
                      </Button>
                      <Link href={`/admin/records/${vote.id}`}>
                        <Button variant="outline" size="sm">
                          <Users className="h-4 w-4 mr-1" />
                          投票记录
                        </Button>
                      </Link>
                      <Button variant="ghost" size="sm" onClick={() => openEditDialog(vote)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteVote(vote.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Link href={`/admin/links?voteId=${vote.id}`}>
                        <Button variant="default" size="sm" className="bg-gray-900">
                          生成推广链接
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </Link>
                      <Link href={`/admin/records/${vote.id}`}>
                        <Button variant="outline" size="sm">
                          我的记录
                        </Button>
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 创建/编辑投票对话框 */}
      {isAdmin && (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingVote ? '编辑投票' : '创建投票'}</DialogTitle>
              <DialogDescription>
                {editingVote ? '修改投票信息' : '创建一个新的投票项目'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label className="text-sm text-gray-600">投票标题</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="请输入投票标题"
                  className="mt-1.5 h-10"
                />
              </div>
              <div>
                <Label className="text-sm text-gray-600">投票描述</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="请输入投票描述（可选）"
                  rows={2}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label className="text-sm text-gray-600">短信接收号码</Label>
                <Input
                  value={smsNumber}
                  onChange={(e) => setSmsNumber(e.target.value)}
                  placeholder="请输入短信接收号码"
                  className="mt-1.5 h-10"
                />
                <p className="text-xs text-gray-400 mt-1">用户投票时将发送短信到此号码</p>
              </div>
              <div>
                <Label className="text-sm text-gray-600">封面图片</Label>
                <div className="flex gap-2 mt-1.5">
                  <Input
                    value={coverImage}
                    onChange={(e) => setCoverImage(e.target.value)}
                    placeholder="图片URL或上传图片"
                    className="h-10"
                  />
                  <Button variant="outline" className="flex-shrink-0" onClick={() => fileInputRef.current?.click()}>
                    <ImageIcon className="h-4 w-4" />
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleImageUpload(e, true)}
                  />
                </div>
                {coverImage && (
                  <img src={coverImage} alt="封面" className="mt-2 w-20 h-20 object-cover rounded-lg" />
                )}
              </div>
              <div>
                <Label className="text-sm text-gray-600">状态</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="mt-1.5 h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">进行中</SelectItem>
                    <SelectItem value="closed">已结束</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm text-gray-600">顶部提示文字</Label>
                <Input
                  value={topText}
                  onChange={(e) => setTopText(e.target.value)}
                  placeholder="例如：请为你最喜欢的歌手投票"
                  className="mt-1.5 h-10"
                />
              </div>
              <div>
                <Label className="text-sm text-gray-600">投票统计文字</Label>
                <Input
                  value={voteText}
                  onChange={(e) => setVoteText(e.target.value)}
                  placeholder="例如：已有 {count} 人参与投票"
                  className="mt-1.5 h-10"
                />
                <p className="text-xs text-gray-400 mt-1">使用 {`{count}`} 显示投票人数</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setDialogOpen(false)}>取消</Button>
              <Button className="flex-1 bg-gray-900 hover:bg-gray-800" onClick={handleSaveVote} disabled={saving}>
                {saving ? '保存中...' : '保存'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* 候选人管理对话框 */}
      {isAdmin && (
        <Dialog open={candidatesDialogOpen} onOpenChange={setCandidatesDialogOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>管理候选人</DialogTitle>
              <DialogDescription>添加、编辑或删除候选人，可上传头像图片</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* Add Button */}
              <Button
                size="sm"
                className="bg-gray-900 hover:bg-gray-800"
                onClick={() => setEditingCandidate({ name: '', description: '', image_url: '', sms_content: '' })}
              >
                <Plus className="h-4 w-4 mr-2" />
                添加候选人
              </Button>

              {/* Add/Edit Form */}
              {editingCandidate && (
                <div className="bg-gray-50 rounded-xl p-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm text-gray-600">名称 *</Label>
                      <Input
                        value={editingCandidate.name || ''}
                        onChange={(e) => setEditingCandidate(prev => prev ? { ...prev, name: e.target.value } : null)}
                        placeholder="候选人名称"
                        className="mt-1.5 h-10"
                      />
                    </div>
                    <div>
                      <Label className="text-sm text-gray-600">简介</Label>
                      <Input
                        value={editingCandidate.description || ''}
                        onChange={(e) => setEditingCandidate(prev => prev ? { ...prev, description: e.target.value } : null)}
                        placeholder="候选人简介"
                        className="mt-1.5 h-10"
                      />
                    </div>
                    <div>
                      <Label className="text-sm text-gray-600">头像图片</Label>
                      <div className="flex gap-2 mt-1.5">
                        <Input
                          value={editingCandidate.image_url || ''}
                          onChange={(e) => setEditingCandidate(prev => prev ? { ...prev, image_url: e.target.value } : null)}
                          placeholder="图片URL或上传"
                          className="h-10"
                        />
                        <Button variant="outline" className="flex-shrink-0" onClick={() => candidateImageRef.current?.click()}>
                          <ImageIcon className="h-4 w-4" />
                        </Button>
                        <input
                          ref={candidateImageRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleImageUpload(e, false)}
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-600">短信内容</Label>
                      <Input
                        value={editingCandidate.sms_content || ''}
                        onChange={(e) => setEditingCandidate(prev => prev ? { ...prev, sms_content: e.target.value } : null)}
                        placeholder="投票时发送的短信"
                        className="mt-1.5 h-10"
                      />
                    </div>
                    {/* 编辑时显示票数修改 */}
                    {editingCandidate.id && (
                      <div>
                        <Label className="text-sm text-gray-600">票数（可手动修改）</Label>
                        <Input
                          type="number"
                          min="0"
                          value={editingCandidate.vote_count || 0}
                          onChange={(e) => setEditingCandidate(prev => prev ? { ...prev, vote_count: parseInt(e.target.value) || 0 } : null)}
                          placeholder="票数"
                          className="mt-1.5 h-10"
                        />
                      </div>
                    )}
                  </div>
                  {editingCandidate.image_url && (
                    <img src={editingCandidate.image_url} alt="预览" className="w-16 h-16 object-cover rounded-lg" />
                  )}
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => setEditingCandidate(null)}>取消</Button>
                    <Button size="sm" className="bg-gray-900 hover:bg-gray-800" onClick={handleSaveCandidate} disabled={saving}>
                      {saving ? '保存中...' : '保存'}
                    </Button>
                  </div>
                </div>
              )}

              {/* Candidates List */}
              <div className="space-y-2">
                {candidates.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">暂无候选人，点击上方按钮添加</p>
                ) : (
                  candidates.map((candidate, index) => (
                    <div key={candidate.id} className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-lg">
                      <div className="flex items-center gap-3">
                        {candidate.image_url ? (
                          <img src={candidate.image_url} alt={candidate.name} className="w-12 h-12 object-cover rounded-lg" />
                        ) : (
                          <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500 font-medium">
                            {index + 1}
                          </div>
                        )}
                        <div>
                          <div className="font-medium text-sm">{candidate.name}</div>
                          <div className="text-xs text-gray-400">{candidate.description || '暂无简介'}</div>
                          <div className="text-xs text-blue-500">短信: {candidate.sms_content}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-600">{candidate.vote_count} 票</span>
                        <Button variant="ghost" size="sm" onClick={() => setEditingCandidate(candidate)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteCandidate(candidate.id)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
