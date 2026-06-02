'use client';

import { Building2, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type FormEvent, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const REGIONS = [
  { value: 'EU', label: 'European Union' },
  { value: 'US', label: 'United States' },
  { value: 'UK', label: 'United Kingdom' },
  { value: 'AP', label: 'Asia-Pacific' },
];

interface PasswordStrength {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
  tone: 'danger' | 'warning' | 'info' | 'success';
}

function scorePassword(value: string): PasswordStrength {
  let score = 0;
  if (value.length >= 12) score += 1;
  if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score += 1;
  if (/\d/.test(value)) score += 1;
  if (/[^A-Za-z0-9]/.test(value)) score += 1;
  const map: PasswordStrength[] = [
    { score: 0, label: 'Too short', tone: 'danger' },
    { score: 1, label: 'Weak', tone: 'danger' },
    { score: 2, label: 'Fair', tone: 'warning' },
    { score: 3, label: 'Good', tone: 'info' },
    { score: 4, label: 'Strong', tone: 'success' },
  ];
  return map[Math.min(score, 4)] as PasswordStrength;
}

interface ErrorBody {
  message?: string;
  correlationId?: string;
}

export function RegisterForm(): React.ReactElement {
  const router = useRouter();
  const [organisationName, setOrganisationName] = useState('');
  const [region, setRegion] = useState('EU');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<ErrorBody | null>(null);
  const [loading, setLoading] = useState(false);

  const strength = useMemo(() => scorePassword(password), [password]);
  const passwordTooShort = password.length > 0 && password.length < 12;

  async function onSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setError(null);
    if (password.length < 12) {
      setError({ message: 'Password must be at least 12 characters' });
      return;
    }
    setLoading(true);
    try {
      const response = await fetch('/api/proxy/auth/register', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          organisationName,
          region,
          fullName,
          email,
          password,
        }),
      });
      if (response.ok) {
        toast.success('Welcome!', {
          description: `Your workspace "${organisationName}" is ready.`,
        });
        router.push('/app');
        router.refresh();
        return;
      }
      const body = (await response.json().catch(() => ({}))) as ErrorBody;
      setError({
        message: body.message ?? 'Registration failed',
        correlationId: body.correlationId,
      });
    } catch {
      setError({ message: 'Unable to reach the platform — please try again.' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="org">
          <span className="inline-flex items-center gap-1.5">
            <Building2 size={14} className="text-brand-600" />
            Organisation name
          </span>
        </Label>
        <Input
          id="org"
          required
          minLength={2}
          maxLength={255}
          placeholder="Acme Surveying Ltd."
          value={organisationName}
          onChange={(event) => setOrganisationName(event.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="region">Data region</Label>
        <select
          id="region"
          value={region}
          onChange={(event) => setRegion(event.target.value)}
          className="flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:border-brand-500 focus-visible:ring-2 focus-visible:ring-brand-500/20"
        >
          {REGIONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="name">Your name</Label>
          <Input
            id="name"
            required
            minLength={2}
            maxLength={255}
            placeholder="Jane Doe"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
          />
        </div>
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
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            required
            minLength={12}
            maxLength={128}
            placeholder="At least 12 characters"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword((current) => !current)}
            className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-slate-400 hover:text-slate-600"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
        {password.length > 0 && (
          <div className="flex items-center gap-2 pt-1">
            <div className="flex flex-1 gap-1">
              {[1, 2, 3, 4].map((bar) => (
                <div
                  key={bar}
                  className={`h-1 flex-1 rounded-full ${
                    bar <= strength.score
                      ? strength.tone === 'danger'
                        ? 'bg-red-500'
                        : strength.tone === 'warning'
                          ? 'bg-amber-500'
                          : strength.tone === 'info'
                            ? 'bg-sky-500'
                            : 'bg-emerald-500'
                      : 'bg-slate-200'
                  }`}
                />
              ))}
            </div>
            <span
              className={`text-[11px] font-medium ${
                strength.tone === 'danger'
                  ? 'text-red-600'
                  : strength.tone === 'warning'
                    ? 'text-amber-600'
                    : strength.tone === 'info'
                      ? 'text-sky-600'
                      : 'text-emerald-600'
              }`}
            >
              {strength.label}
            </span>
          </div>
        )}
        <p className="text-[11px] text-slate-500">
          {passwordTooShort
            ? `${12 - password.length} more character${12 - password.length === 1 ? '' : 's'} needed`
            : 'Minimum 12 characters. Mix upper/lower/digits/symbols for the strongest score.'}
        </p>
      </div>

      {error && (
        <Alert tone="danger" title="Could not create the account" correlationId={error.correlationId}>
          {error.message}
        </Alert>
      )}

      <Button type="submit" disabled={loading} className="w-full" size="lg">
        {loading && <Loader2 size={14} className="animate-spin" />}
        {loading ? 'Creating workspace…' : 'Create workspace'}
      </Button>
      <p className="text-center text-[11px] text-slate-500">
        By creating an account you agree to the platform&apos;s terms and
        accept that processing usage is metered.
      </p>
    </form>
  );
}
