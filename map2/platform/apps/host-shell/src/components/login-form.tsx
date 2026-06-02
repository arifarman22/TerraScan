'use client';

import { Loader2, ShieldCheck } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import { toast } from 'sonner';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface LoginErrorBody {
  message?: string;
  correlationId?: string;
}

export function LoginForm(): React.ReactElement {
  const router = useRouter();
  const search = useSearchParams();
  const nextPath = search.get('next') ?? '/app';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [needsMfa, setNeedsMfa] = useState(false);
  const [error, setError] = useState<LoginErrorBody | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/proxy/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          ...(needsMfa && mfaCode ? { mfaCode } : {}),
        }),
      });
      if (response.ok) {
        toast.success('Signed in', { description: 'Welcome back.' });
        router.push(nextPath);
        router.refresh();
        return;
      }
      const body = (await response.json().catch(() => ({}))) as LoginErrorBody;
      const message = body.message ?? 'Sign-in failed';
      if (message.toLowerCase().includes('multi-factor')) {
        setNeedsMfa(true);
        setError({ message: 'Enter the 6-digit code from your authenticator app' });
      } else {
        setError({ message, correlationId: body.correlationId });
      }
    } catch {
      setError({ message: 'Unable to reach the platform — please try again.' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@company.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="••••••••••••"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </div>
      {needsMfa && (
        <div className="space-y-1.5">
          <Label htmlFor="mfa">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-brand-600" />
              Authentication code
            </span>
          </Label>
          <Input
            id="mfa"
            type="text"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            placeholder="000000"
            value={mfaCode}
            onChange={(event) => setMfaCode(event.target.value)}
            className="text-center font-mono text-lg tracking-[0.5em]"
          />
        </div>
      )}
      {error && (
        <Alert tone="danger" title="Sign-in failed" correlationId={error.correlationId}>
          {error.message}
        </Alert>
      )}
      <Button type="submit" disabled={loading} className="w-full" size="lg">
        {loading && <Loader2 size={14} className="animate-spin" />}
        {loading ? 'Signing in…' : 'Sign in'}
      </Button>
    </form>
  );
}
