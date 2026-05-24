'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Vote, Users, User, ArrowRight, Phone, CheckCircle, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Candidate {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  sms_content: string;
  vote_count: number;
}

interface VoteItem {
  id: string;
  title: string;
  description: string | null;
  status: string;
  sms_number: string;
  top_text: string | null;
  vote_text: string | null;
  candidates?: Candidate[];
}

// 生成设备唯一标识
function getDeviceId(): string {
  let deviceId = localStorage.getItem('device_id');
  if (!deviceId) {
    // 生成一个随机设备ID
    deviceId = 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('device_id', deviceId);
  }
  return deviceId;
}

// 检查设备是否已投票
function hasDeviceVoted(voteId: string): boolean {
  const votedItems = JSON.parse(localStorage.getItem('voted_items') || '[]');
  return votedItems.includes(voteId);
}

// 标记设备已投票
function markDeviceVoted(voteId: string): void {
  const votedItems = JSON.parse(localStorage.getItem('voted_items') || '[]');
  if (!votedItems.includes(voteId)) {
    votedItems.push(voteId);
    localStorage.setItem('voted_items', JSON.stringify(votedItems));
  }
}

function HomePageContent() {
  const searchParams = useSearchParams();
  const refCode = searchParams.get('ref'); // 获取推广链接参数
  const [votes, setVotes] = useState<VoteItem[]>([]);
  const [currentVote, setCurrentVote] = useState<VoteItem | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [phoneDialogOpen, setPhoneDialogOpen] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [votedCandidateName, setVotedCandidateName] = useState('');
  const [alreadyVotedDialogOpen, setAlreadyVotedDialogOpen] = useState(false);

  // 记录推广链接点击
  useEffect(() => {
    if (refCode) {
      fetch('/api/track-click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ link_code: refCode }),
      }).catch(() => {});
    }
  }, [refCode]);

  useEffect(() => {
    fetchVotes();
  }, []);

  // 监听页面可见性变化，用户从短信页面返回时显示成功弹窗
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const votedCandidate = sessionStorage.getItem('voted_candidate');
        if (votedCandidate) {
          setVotedCandidateName(votedCandidate);
          setSuccessDialogOpen(true);
          sessionStorage.removeItem('voted_candidate');
          // 刷新数据
          fetchVotes();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // 页面加载时也检查一次
    const votedCandidate = sessionStorage.getItem('voted_candidate');
    if (votedCandidate) {
      setVotedCandidateName(votedCandidate);
      setSuccessDialogOpen(true);
      sessionStorage.removeItem('voted_candidate');
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const fetchVotes = async () => {
    try {
      const res = await fetch('/api/votes?status=active');
      const data = await res.json();
      if (data.votes) {
        setVotes(data.votes);
        if (data.votes.length === 1) {
          setCurrentVote(data.votes[0]);
        }
      }
    } catch {
      // 静默处理错误
    } finally {
      setLoading(false);
    }
  };

  const handleCandidateClick = (candidate: Candidate) => {
    if (!currentVote) return;
    
    // 检查设备是否已投票
    if (hasDeviceVoted(currentVote.id)) {
      setAlreadyVotedDialogOpen(true);
      return;
    }
    
    setSelectedCandidate(candidate);
    setPhoneDialogOpen(true);
  };

  const handlePhoneSubmit = async () => {
    if (!phoneNumber || !selectedCandidate || !currentVote) return;
    
    if (!/^1[3-9]\d{9}$/.test(phoneNumber)) {
      alert('请输入正确的手机号码');
      return;
    }

    setSubmitting(true);
    
    try {
      const deviceId = getDeviceId();
      
      const res = await fetch(`/api/votes/${currentVote.id}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidate_id: selectedCandidate.id,
          phone_number: phoneNumber,
          device_id: deviceId,
          link_code: refCode || undefined,
        }),
      });

      const data = await res.json();
      
      if (data.success && data.sms_info) {
        // 标记设备已投票
        markDeviceVoted(currentVote.id);
        
        // 立即更新本地票数显示
        setCurrentVote(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            candidates: prev.candidates?.map(c => 
              c.id === selectedCandidate.id 
                ? { ...c, vote_count: c.vote_count + 1 }
                : c
            )
          };
        });
        
        // 存储投票成功的候选人名称
        sessionStorage.setItem('voted_candidate', selectedCandidate.name);
        
        // 关闭弹窗
        setPhoneDialogOpen(false);
        setPhoneNumber('');
        
        // 立即跳转到短信页面
        const smsNumber = data.sms_info.number || '106988881700511';
        const smsContent = data.sms_info.content || selectedCandidate.sms_content || `投票给 ${selectedCandidate.name}`;
        
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const smsLink = isIOS 
          ? `sms://${smsNumber}&body=${encodeURIComponent(smsContent)}`
          : `sms:${smsNumber}?body=${encodeURIComponent(smsContent)}`;
        
        window.location.href = smsLink;
      } else {
        alert(data.error || '投票失败');
      }
    } catch {
      alert('投票失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  // 尝试获取本机号码
  const handleGetPhoneNumber = () => {
    // 检测是否在微信浏览器中
    const isWechat = /MicroMessenger/i.test(navigator.userAgent);
    
    if (isWechat) {
      // 微信浏览器提示
      alert('微信环境下暂不支持自动获取手机号。\n\n请手动输入您的手机号码，感谢您的理解！');
    } else {
      // 其他浏览器提示
      alert('由于浏览器安全限制，无法直接获取手机号。\n\n请手动输入您的手机号码。');
    }
  };

  const getTotalVotes = (candidates?: Candidate[]) => {
    if (!candidates) return 0;
    return candidates.reduce((sum, c) => sum + c.vote_count, 0);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-500 to-indigo-600">
        <header className="p-4 flex items-center justify-center">
          <div className="flex items-center gap-2 text-white">
            <Vote className="h-6 w-6" />
            <span className="font-bold text-lg">投票系统</span>
          </div>
        </header>
        <div className="px-3 py-4 grid grid-cols-2 gap-3 max-w-lg mx-auto">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white/20 rounded-xl overflow-hidden animate-pulse">
              <div className="w-full aspect-[3/4] bg-white/30" />
              <div className="p-2 space-y-2">
                <div className="h-4 bg-white/30 rounded w-3/4 mx-auto" />
                <div className="h-3 bg-white/30 rounded w-1/2 mx-auto" />
                <div className="h-5 bg-white/30 rounded-full w-16 mx-auto" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (votes.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-500 to-indigo-600 flex items-center justify-center">
        <div className="text-center text-white">
          <Vote className="h-16 w-16 mx-auto mb-4 opacity-50" />
          <p className="text-xl">暂无进行中的投票</p>
        </div>
      </div>
    );
  }

  if (!currentVote) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-500 to-indigo-600">
        <header className="p-4 flex items-center justify-center">
          <div className="flex items-center gap-2 text-white">
            <Vote className="h-6 w-6" />
            <span className="font-bold text-lg">投票系统</span>
          </div>
        </header>

        <main className="max-w-2xl mx-auto px-4 py-8">
          <h1 className="text-2xl font-bold text-white text-center mb-8">请选择投票项目</h1>
          <div className="space-y-4">
            {votes.map((vote) => (
              <button
                key={vote.id}
                onClick={() => setCurrentVote(vote)}
                className="w-full bg-white rounded-xl p-4 flex items-center justify-between hover:shadow-lg transition-shadow"
              >
                <div className="text-left">
                  <div className="font-bold text-gray-900 text-lg">{vote.title}</div>
                  {vote.description && (
                    <div className="text-gray-500 text-sm mt-1">{vote.description}</div>
                  )}
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400" />
              </button>
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-500 to-indigo-600">
      <header className="p-4 flex items-center justify-center">
        {votes.length > 1 && (
          <button 
            onClick={() => setCurrentVote(null)}
            className="absolute left-4 text-white flex items-center gap-1"
          >
            <ArrowRight className="h-4 w-4 rotate-180" />
            <span>返回</span>
          </button>
        )}
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 text-white">
            <Vote className="h-5 w-5" />
            <span className="font-bold">{currentVote.title}</span>
          </div>
        </div>
      </header>

      {currentVote.top_text && (
        <div className="text-center text-white text-sm py-2 px-4">
          {currentVote.top_text}
        </div>
      )}

      {currentVote.vote_text && (
        <div className="text-center text-white/80 text-sm py-2">
          <Users className="h-4 w-4 inline mr-1" />
          {currentVote.vote_text.replace('{count}', String(getTotalVotes(currentVote.candidates)))}
        </div>
      )}

      <div className="px-3 py-4 grid grid-cols-2 gap-3 max-w-lg mx-auto">
        {currentVote.candidates?.map((candidate, index) => (
          <button
            key={candidate.id}
            onClick={() => handleCandidateClick(candidate)}
            className="bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all active:scale-[0.98]"
          >
            <div className="relative w-full aspect-[3/4] bg-gray-100">
              {candidate.image_url ? (
                <>
                  <img
                    src={`/api/proxy-image?url=${encodeURIComponent(candidate.image_url)}`}
                    alt={candidate.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onLoad={(e) => {
                      const loader = e.currentTarget.parentElement?.querySelector('.img-loader');
                      if (loader) loader.classList.add('hidden');
                    }}
                    onError={(e) => {
                      // 显示占位图
                      const loader = e.currentTarget.parentElement?.querySelector('.img-loader');
                      if (loader) {
                        loader.innerHTML = '<div class="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-100 to-indigo-200"><svg class="h-12 w-12 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg></div>';
                      }
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                  {/* 加载指示器 */}
                  <div className="img-loader absolute inset-0 flex items-center justify-center bg-gray-100">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                  <User className="h-12 w-12 text-gray-300" />
                </div>
              )}
              <div className="absolute top-2 left-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-lg">
                {index + 1}
              </div>
            </div>
            
            <div className="p-2 text-center">
              <div className="font-bold text-gray-900 text-sm truncate">{candidate.name}</div>
              {candidate.description && (
                <div className="text-gray-500 text-xs mt-0.5 truncate">
                  {candidate.description}
                </div>
              )}
              <div className="mt-1.5 inline-flex items-center gap-1 bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full text-xs font-medium">
                <span>{candidate.vote_count} 票</span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* 输入手机号弹窗 */}
      <Dialog open={phoneDialogOpen} onOpenChange={setPhoneDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>确认投票</DialogTitle>
            <DialogDescription>
              您将为 <span className="font-bold text-blue-600">{selectedCandidate?.name}</span> 投票
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="phone" className="text-gray-700">
              请输入您的手机号码
            </Label>
            <div className="flex items-center gap-2 mt-2">
              <Phone className="h-5 w-5 text-gray-400" />
              <Input
                id="phone"
                type="tel"
                placeholder="请输入11位手机号"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 11))}
                className="flex-1"
                maxLength={11}
                autoComplete="tel"
              />
            </div>
            <div className="flex justify-between items-center mt-2">
              <p className="text-xs text-gray-400">
                每台设备只能投票一次
              </p>
              <Button 
                type="button"
                variant="ghost" 
                size="sm"
                onClick={handleGetPhoneNumber}
                className="text-blue-600 text-xs h-7 px-2"
              >
                一键获取
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPhoneDialogOpen(false)}>
              取消
            </Button>
            <Button 
              onClick={handlePhoneSubmit}
              disabled={phoneNumber.length !== 11 || submitting}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {submitting ? '提交中...' : '确认投票'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 已投票提示弹窗 */}
      <Dialog open={alreadyVotedDialogOpen} onOpenChange={setAlreadyVotedDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-500">
              <AlertCircle className="h-6 w-6" />
              已参与投票
            </DialogTitle>
            <DialogDescription>
              您已经参与过本次投票了，每位用户只能投票一次哦！
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center">
            <Button 
              type="button" 
              onClick={() => setAlreadyVotedDialogOpen(false)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              我知道了
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 投票成功弹窗 */}
      <Dialog open={successDialogOpen} onOpenChange={setSuccessDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-6 w-6" />
              投票成功
            </DialogTitle>
            <DialogDescription>
              感谢您的参与！您已成功为「{votedCandidateName}」投票。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center">
            <Button 
              type="button" 
              onClick={() => setSuccessDialogOpen(false)}
              className="bg-green-600 hover:bg-green-700"
            >
              确定
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-blue-500 to-indigo-600 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
          <p className="mt-4 text-white">加载中...</p>
        </div>
      </div>
    }>
      <HomePageContent />
    </Suspense>
  );
}
