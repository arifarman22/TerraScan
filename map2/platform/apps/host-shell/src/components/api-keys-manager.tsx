'use client';

import { Check, Copy, Eye, EyeOff, Key, Loader2, Plus, Trash2 } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { toast } from 'sonner';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ApiKeySummary } from '@/lib/api';
import { formatRelativeTime } from '@/lib/utils';

interface NewKey {
  id: string;
  prefix: string;
  key: string;
  name: string;
}

export function ApiKeysManager({
  initialKeys,
}: {
  initialKeys: ApiKeySummary[];
}): React.ReactElement {
  const [keys, setKeys] = useState(initialKeys);
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<NewKey | null>(null);
  const [copied, setCopied] = useState(false);

  async function onCreate(event: FormEvent): Promise<void> {
    event.preventDefault();
    setError(null);
    setCreating(true);
    try {
      const res = await fetch('/api/proxy/api-keys', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(body.message ?? 'Could not create key');
      }
      const created = (await res.json()) as NewKey;
      setRevealed(created);
      setKeys((previous) => [
        {
          id: created.id,
          name: created.name,
          prefix: created.prefix,
          scopes: [],
          expiresAt: null,
          lastUsedAt: null,
          createdAt: new Date().toISOString(),
        },
        ...previous,
      ]);
      setName('');
      toast.success('API key created', {
        description: 'Copy the cleartext now — you will not see it again.',
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unexpected error');
    } finally {
      setCreating(false);
    }
  }

  async function onRevoke(id: string): Promise<void> {
    if (!confirm('Revoke this key? Requests using it will immediately fail.')) return;
    const res = await fetch(`/api/proxy/api-keys/${id}`, { method: 'DELETE' });
    if (res.ok || res.status === 204) {
      setKeys((previous) => previous.filter((k) => k.id !== id));
      toast.success('Key revoked');
    } else {
      toast.error('Could not revoke key');
    }
  }

  async function copyKey(): Promise<void> {
    if (!revealed) return;
    try {
      await navigator.clipboard.writeText(revealed.key);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error('Clipboard unavailable — copy manually');
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <form onSubmit={onCreate} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="keyname">New API key</Label>
            <Input
              id="keyname"
              required
              maxLength={255}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Production integration"
            />
          </div>
          <Button type="submit" disabled={creating || !name}>
            {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            Create key
          </Button>
        </form>
        {error && (
          <div className="border-t border-slate-200 px-5 py-3">
            <Alert tone="danger" title="Could not create key">{error}</Alert>
          </div>
        )}
      </Card>

      {revealed && (
        <Alert tone="warning" title="Copy your new key now">
          <p>
            This is the only time the cleartext will be shown. Store it in a
            secret manager — we keep only a hash.
          </p>
          <div className="mt-3 flex items-center gap-2 rounded-md border border-amber-300 bg-white px-3 py-2 font-mono text-sm text-slate-900">
            <RevealableKey
              value={revealed.key}
              maskedHint={`${revealed.prefix}…${revealed.key.slice(-4)}`}
            />
            <Button
              size="sm"
              variant="outline"
              onClick={copyKey}
              className="ml-auto"
            >
              {copied ? (
                <>
                  <Check size={12} /> Copied
                </>
              ) : (
                <>
                  <Copy size={12} /> Copy
                </>
              )}
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="mt-2"
            onClick={() => setRevealed(null)}
          >
            Dismiss
          </Button>
        </Alert>
      )}

      {keys.length === 0 ? (
        <EmptyState
          icon={Key}
          title="No API keys yet"
          description="Issue a key to give backend integrations programmatic access (Authorization: ApiKey …)."
        />
      ) : (
        <Card>
          <div className="border-b border-slate-200 px-5 py-3 text-sm font-semibold text-slate-900">
            {keys.length} active key{keys.length === 1 ? '' : 's'}
          </div>
          <ul className="divide-y divide-slate-100">
            {keys.map((key) => (
              <li key={key.id} className="flex items-center gap-4 px-5 py-3 text-sm">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-500">
                  <Key size={15} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium text-slate-900">{key.name}</div>
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                    <span className="font-mono">{key.prefix}…</span>
                    <span>·</span>
                    <span>created {formatRelativeTime(key.createdAt)}</span>
                    {key.lastUsedAt && (
                      <>
                        <span>·</span>
                        <span>last used {formatRelativeTime(key.lastUsedAt)}</span>
                      </>
                    )}
                  </div>
                </div>
                <Badge tone="success">Active</Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onRevoke(key.id)}
                  className="text-slate-400 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 size={15} />
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function RevealableKey({
  value,
  maskedHint,
}: {
  value: string;
  maskedHint: string;
}): React.ReactElement {
  const [shown, setShown] = useState(false);
  return (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <span className="truncate">{shown ? value : maskedHint}</span>
      <Button
        size="icon"
        variant="ghost"
        onClick={() => setShown((current) => !current)}
        className="h-7 w-7 text-slate-500"
        tabIndex={-1}
      >
        {shown ? <EyeOff size={12} /> : <Eye size={12} />}
      </Button>
    </div>
  );
}
