import { ScrollText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { fetchAuditLog } from '@/lib/api';
import { getSessionTokens } from '@/lib/session';

const ACTION_TONE: Record<string, 'success' | 'danger' | 'info' | 'neutral'> = {
  'user.registered': 'success',
  'user.login.success': 'success',
  'user.login.failed': 'danger',
};

export default async function AuditLogPage(): Promise<React.ReactElement> {
  const session = await getSessionTokens();
  if (!session) return <div>Not signed in.</div>;
  const entries = await fetchAuditLog(session.accessToken, { limit: '200' });
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Audit log</h2>
        <p className="mt-1 text-sm text-slate-500">
          Immutable, tamper-evident record of security-relevant events. Reads
          only — the database forbids UPDATE and DELETE on this table.
        </p>
      </div>
      {entries.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title="No events recorded yet"
          description="Authentication, key issuance and resource changes appear here as the platform is used."
        />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50/50 text-left text-[11px] font-medium uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-2.5">When</th>
                  <th className="px-4 py-2.5">Action</th>
                  <th className="px-4 py-2.5">Resource</th>
                  <th className="px-4 py-2.5">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {entries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50/60">
                    <td className="whitespace-nowrap px-4 py-2.5 font-mono text-[11px] text-slate-500">
                      {new Date(entry.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge tone={ACTION_TONE[entry.action] ?? 'neutral'}>{entry.action}</Badge>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-[11px] text-slate-600">
                      {entry.resourceType}
                      {entry.resourceId && (
                        <span className="text-slate-400"> · {entry.resourceId.slice(0, 8)}…</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-[11px] text-slate-500">
                      {entry.ipAddress ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-slate-200 px-4 py-2.5 text-[11px] text-slate-500">
            Showing {entries.length} most recent event{entries.length === 1 ? '' : 's'}
          </div>
        </Card>
      )}
    </div>
  );
}
