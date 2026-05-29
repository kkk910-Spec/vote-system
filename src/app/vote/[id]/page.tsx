'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Vote, Clock, Users, ArrowLeft, Phone, MessageSquare, CheckCircle } from 'lucide-react';

interface Candidate {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  sms_content: string;
  vote_count: number;
  order_num: number;
}

interface VoteDetail {
  id: string;
  title: string;
  description: string | null;
  status: string;
  sms_number: string;
  cover_image: string | null;
  created_at: string;
  users: {
    id: string;
    username: string;
    name: string | null;
  } | null;
  candidates: Candidate[];
}

interface AgentInfo {
  link_id: string;
  agent_id: string;
  agent: {
    id: string;
    username: string;
    name: string | null;
  };
}

export default function VoteDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const [vote, setVote] = useState<VoteDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCandidate, setSelectedCandidate] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [step, setStep] = useState<'select' | 'phone' | 'countdown' | 'manual'>('select');
  const [submitting, setSubmitting] = useState(false);
  const [smsInfo, setSmsInfo] = useState<{ number: string; content: string } | null>(null);
  const [countdown, setCountdown] = useState(5);
  const [agentInfo, setAgentInfo] = useState<AgentInfo | null>(null);
  const [smsRedirected, setSmsRedirected] = useState(false);

  const fetchVote = async () => {
    try {
      const ref = searchParams.get('ref');
      const url = ref ? `/api/votes/${params.id}?ref=${ref}` : `/api/votes/${params.id}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.vote) {
        setVote(data.vote);
        if (data.agentInfo) {
          setAgentInfo(data.agentInfo);
        }
      }
    } catch (error) {
      console.error('获取投票详情失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVote();
  }, [params.id]);

  const getTotalVotes = (candidates: Candidate[]) => {
    return candidates.reduce((sum, c) => sum + c.vote_count, 0);
  };

  const isExpired = (status: string) => status === 'closed';

  const handleSelectCandidate = (candidateId: string) => {
    setSelectedCandidate(candidateId);
  };

  const handleNextStep = () => {
    if (!selectedCandidate) {
      alert('请先选择一位候选人');
      return;
    }
    setStep('phone');
  };

  // 检测是否在微信或QQ内置浏览器中（不支持sms:协议）
  const isInApp = () => /MicroMessenger|QQ\/|MQQBrowser/i.test(navigator.userAgent);

  // 复制文本到剪贴板
  const copyToClipboard = (text: string): boolean => {
    try {
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(text);
        return true;
      }
      // 兼容旧浏览器
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(textarea);
      return ok;
    } catch {
      return false;
    }
  };

  const getVoteCount = (): number => {
    if (typeof window === 'undefined') return 0;
    const items = JSON.parse(localStorage.getItem('voted_items') || '[]');
    return items.filter((v: string) => v === params.id).length;
  };

  const recordVote = () => {
    if (typeof window === 'undefined') return;
    const items = JSON.parse(localStorage.getItem('voted_items') || '[]');
    items.push(params.id);
    localStorage.setItem('voted_items', JSON.stringify(items));
  };

  const handleSubmit = () => {
    if (!selectedCandidate || !phoneNumber) {
      alert('请填写手机号');
      return;
    }

    // 验证手机号
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(phoneNumber)) {
      alert('请输入正确的手机号');
      return;
    }

    // 检查投票次数
    if (getVoteCount() >= 2) {
      alert('您的投票次数已用完（每人最多2票）');
      return;
    }

    // 从当前页面数据直接构造短信信息
    const candidate = vote?.candidates.find(c => c.id === selectedCandidate);
    const smsNumber = vote?.sms_number || '';
    const smsContent = candidate?.sms_content || candidate?.name || '';

    setSmsInfo({ number: smsNumber, content: smsContent });

    // 记录投票次数
    recordVote();

    // 发送投票数据
    const ref = searchParams.get('ref');
    const payload = {
      candidate_id: selectedCandidate,
      phone_number: phoneNumber,
      link_code: ref,
    };
    navigator.sendBeacon(
      '/api/votes/' + vote?.id + '/vote',
      new Blob([JSON.stringify(payload)], { type: 'application/json' })
    );

    // 强制跳转短信页面
    const smsUrl = `sms:${smsNumber}?body=${encodeURIComponent(smsContent)}`;
    try {
      window.location.replace(smsUrl);
    } catch {
      window.location.href = smsUrl;
    }

    // 2秒后如果页面还在（跳转失败），显示手动指引
    setTimeout(() => {
      setStep('manual');
    }, 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
            <div className="w-16 h-8 bg-gray-200 rounded animate-pulse" />
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-blue-200 rounded-lg animate-pulse" />
              <div className="w-20 h-5 bg-gray-200 rounded animate-pulse" />
            </div>
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-white rounded-xl shadow-sm overflow-hidden animate-pulse">
            <div className="h-60 bg-gray-200" />
            <div className="p-6 space-y-4">
              <div className="h-8 bg-gray-200 rounded w-1/2" />
              <div className="h-4 bg-gray-200 rounded w-3/4" />
              <div className="flex gap-6 mt-4">
                <div className="h-4 bg-gray-200 rounded w-20" />
                <div className="h-4 bg-gray-200 rounded w-32" />
              </div>
              <div className="space-y-3 mt-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="border rounded-lg p-4">
                    <div className="flex items-start gap-4">
                      <div className="w-20 h-20 bg-gray-200 rounded-lg" />
                      <div className="flex-1 space-y-2">
                        <div className="h-5 bg-gray-200 rounded w-24" />
                        <div className="h-3 bg-gray-200 rounded w-32" />
                        <div className="h-2 bg-gray-200 rounded w-full mt-2" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!vote) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Vote className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">投票不存在</p>
          <Link href="/">
            <Button className="mt-4">返回首页</Button>
          </Link>
        </div>
      </div>
    );
  }

  const totalVotes = getTotalVotes(vote.candidates);
  const expired = isExpired(vote.status);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" />
              返回
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Vote className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-lg font-bold text-gray-900">投票详情</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Agent Info Banner */}
        {agentInfo && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-blue-700 text-sm">
              推荐人：{agentInfo.agent.name || agentInfo.agent.username}
            </p>
          </div>
        )}

        <Card className="overflow-hidden">
          {vote.cover_image && (
            <div className="h-60 bg-gray-100">
              <img 
                src={vote.cover_image} 
                alt={vote.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl">{vote.title}</CardTitle>
                {vote.description && (
                  <CardDescription className="mt-2 text-base">
                    {vote.description}
                  </CardDescription>
                )}
              </div>
              <Badge variant={expired ? 'destructive' : 'default'} className="ml-2">
                {expired ? '已结束' : '进行中'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {/* 统计信息 */}
            <div className="flex items-center gap-6 mb-6 text-sm text-gray-500">
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span>{totalVotes} 人参与</span>
              </div>
              <div className="flex items-center gap-1">
                <MessageSquare className="h-4 w-4" />
                <span>发送短信至 {vote.sms_number}</span>
              </div>
            </div>

            {/* 倒计时自动跳转页面 */}
            {step === 'countdown' && smsInfo && (
              <div className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
                  <div className="mb-4">
                    <div className="w-16 h-16 mx-auto rounded-full bg-blue-100 flex items-center justify-center mb-4 animate-pulse">
                      <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                    </div>
                    <h3 className="text-xl font-bold text-blue-800">正在跳转短信...</h3>
                    <p className="text-blue-600 mt-2">如果未自动跳转，即将显示手动发送指引</p>
                  </div>
                  <div className="bg-white rounded-lg p-4">
                    <p className="text-sm text-gray-500 mb-1">短信内容</p>
                    <p className="font-bold text-lg">{smsInfo.content}</p>
                    <p className="text-sm text-gray-500 mt-2">收件人：{smsInfo.number}</p>
                  </div>
                </div>
              </div>
            )}

            {/* 手动发送短信指引页面（跳转失败时显示） */}
            {step === 'manual' && smsInfo && (
              <div className="space-y-6">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-8 text-center">
                  <div className="mb-6">
                    <div className="w-16 h-16 mx-auto rounded-full bg-amber-100 flex items-center justify-center mb-4">
                      <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                    </div>
                    <h3 className="text-xl font-bold text-amber-800">请手动发送短信</h3>
                    <p className="text-amber-600 mt-2">当前环境无法直接打开短信App，请按以下步骤操作</p>
                  </div>

                  <div className="bg-white rounded-lg p-5 mb-4 text-left">
                    <p className="text-sm text-gray-500 mb-1">第一步：复制短信内容</p>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-lg flex-1 break-all">{smsInfo.content}</p>
                      <Button size="sm" variant="outline" onClick={() => { copyToClipboard(smsInfo.content); }}>复制</Button>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg p-5 mb-4 text-left">
                    <p className="text-sm text-gray-500 mb-1">第二步：复制号码并打开短信App</p>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-lg flex-1">{smsInfo.number}</p>
                      <Button size="sm" variant="outline" onClick={() => { copyToClipboard(smsInfo.number); }}>复制</Button>
                    </div>
                  </div>

                  <p className="text-xs text-gray-500 mt-4">打开手机短信App → 新建短信 → 粘贴号码和内容 → 发送</p>
                </div>
              </div>
            )}

            {/* 选择和填写手机号页面 */}
            {step !== 'countdown' && step !== 'manual' && (
              <>
                {/* 候选人列表 */}
                <div className="space-y-3 mb-6">
                  <h3 className="font-medium text-gray-900">选择候选人</h3>
                  {vote.candidates.map((candidate) => {
                    const percentage = totalVotes > 0 
                      ? Math.round((candidate.vote_count / totalVotes) * 100) 
                      : 0;
                    const isSelected = selectedCandidate === candidate.id;

                    return (
                      <div
                        key={candidate.id}
                        onClick={() => !expired && step === 'select' && setSelectedCandidate(candidate.id)}
                        className={`relative border rounded-lg p-4 transition-all ${
                          !expired && step === 'select'
                            ? 'cursor-pointer hover:border-blue-300 hover:bg-blue-50' 
                            : ''
                        } ${isSelected ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' : ''}`}
                      >
                        <div className="flex items-start gap-4">
                          {candidate.image_url && (
                            <img 
                              src={candidate.image_url} 
                              alt={candidate.name}
                              className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-lg">{candidate.name}</span>
                              {isSelected && (
                                <CheckCircle className="h-5 w-5 text-blue-600" />
                              )}
                            </div>
                            {candidate.description && (
                              <p className="text-sm text-gray-500 mt-1">{candidate.description}</p>
                            )}
                            
                            {/* 投票结果 */}
                            <div className="mt-3">
                              <div className="flex items-center justify-between text-sm mb-1">
                                <span className="text-gray-500">{candidate.vote_count} 票</span>
                                <span className="font-medium text-blue-600">{percentage}%</span>
                              </div>
                              <Progress value={percentage} className="h-2" />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 手机号填写 */}
                {step === 'phone' && (
                  <div className="bg-gray-50 rounded-lg p-6 mb-6">
                    <h3 className="font-medium text-gray-900 mb-4">填写手机号码</h3>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="phone">手机号码</Label>
                        <div className="relative mt-1">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            id="phone"
                            type="tel"
                            placeholder="请输入您的手机号"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            className="pl-10"
                            maxLength={11}
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          用于记录投票信息，请填写真实手机号
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setStep('select')}>
                          返回修改
                        </Button>
                        <Button 
                          className="flex-1" 
                          onClick={handleSubmit}
                          disabled={submitting || !phoneNumber}
                        >
                          {submitting ? '提交中...' : '确认提交'}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* 下一步按钮 */}
                {step === 'select' && !expired && (
                  <Button 
                    className="w-full" 
                    size="lg"
                    onClick={handleNextStep}
                    disabled={!selectedCandidate}
                  >
                    下一步：填写手机号
                  </Button>
                )}

                {expired && (
                  <div className="text-center text-gray-500 py-4">
                    该投票已结束
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
