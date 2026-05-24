'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Vote, Lock, User, AlertTriangle } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [locked, setLocked] = useState(false);
  const [remainingMinutes, setRemainingMinutes] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      
      if (data.success) {
        router.push('/admin');
      } else {
        setError(data.error || '登录失败');
        if (data.locked) {
          setLocked(true);
          setRemainingMinutes(data.remainingMinutes || 10);
        }
      }
    } catch {
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center mb-3">
            <div className="bg-blue-500 p-2.5 rounded-lg">
              <Vote className="h-6 w-6 text-white" />
            </div>
          </div>
          <h1 className="text-lg font-bold text-gray-900">投票管理系统</h1>
          <p className="text-gray-400 text-sm mt-1">请登录以继续</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-base font-bold text-gray-900 mb-1">登录</h2>
          <p className="text-gray-400 text-sm mb-5">输入您的账号和密码</p>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 锁定提示 */}
            {locked && (
              <div className="bg-red-50 text-red-500 text-xs p-3 rounded-lg flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">账号已被锁定</p>
                  <p>请在 {remainingMinutes} 分钟后重试</p>
                </div>
              </div>
            )}
            
            {/* 错误提示 */}
            {error && !locked && (
              <div className="bg-red-50 text-red-500 text-xs p-3 rounded-lg">
                {error}
              </div>
            )}
            
            <div className="space-y-1.5">
              <Label htmlFor="username" className="text-sm text-gray-600">用户名</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
                <Input
                  id="username"
                  type="text"
                  placeholder="请输入用户名"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-10 h-10 bg-gray-50 border-gray-100 focus:border-blue-500 focus:ring-blue-500"
                  required
                  disabled={locked}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm text-gray-600">密码</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
                <Input
                  id="password"
                  type="password"
                  placeholder="请输入密码"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 h-10 bg-gray-50 border-gray-100 focus:border-blue-500 focus:ring-blue-500"
                  required
                  disabled={locked}
                />
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full h-10 bg-gray-900 hover:bg-gray-800 text-white rounded-lg"
              disabled={loading || locked}
            >
              {loading ? '登录中...' : '登录'}
            </Button>
          </form>
        </div>

        {/* Back to Home */}
        <div className="text-center mt-5">
          <Link href="/" className="text-sm text-gray-400 hover:text-gray-600">
            返回首页
          </Link>
        </div>
      </div>
    </div>
  );
}
