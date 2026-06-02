import { Building2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchMe, fetchOrganisation } from '@/lib/api';
import { getSessionTokens } from '@/lib/session';
import { formatBytes } from '@/lib/utils';

export default async function OrganisationSettingsPage(): Promise<React.ReactElement> {
  const session = await getSessionTokens();
  if (!session) return <div>Not signed in.</div>;
  const [user, org] = await Promise.all([
    fetchMe(session.accessToken),
    fetchOrganisation(session.accessToken),
  ]);
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Organisation</h2>
        <p className="mt-1 text-sm text-slate-500">
          Read-only summary. Editing members, billing and SSO will land in a follow-up release.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>
            <span className="inline-flex items-center gap-1.5">
              <Building2 size={14} className="text-brand-600" /> Profile
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
            <DetailRow label="Name" value={org.name} />
            <DetailRow label="Slug" value={org.slug} mono />
            <DetailRow label="Region" value={org.region} />
            <DetailRow
              label="Status"
              value={<Badge tone={org.status === 'ACTIVE' ? 'success' : 'warning'}>{org.status}</Badge>}
            />
            <DetailRow
              label="Subscription"
              value={<Badge tone="brand">{org.subscriptionTier}</Badge>}
            />
            <DetailRow label="Primary contact" value={org.primaryContactEmail} mono />
          </dl>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Quota</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
            <DetailRow label="Storage" value={formatBytes(org.limits.storageBytes)} />
            <DetailRow label="Member seats" value={org.limits.memberSeats} />
            <DetailRow
              label="Concurrent jobs"
              value={org.limits.concurrentJobs ?? '—'}
            />
          </dl>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Your profile</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
            <DetailRow label="Name" value={user.fullName} />
            <DetailRow label="Email" value={user.email} mono />
            <DetailRow
              label="MFA"
              value={
                <Badge tone={user.mfaEnrolled ? 'success' : 'muted'}>
                  {user.mfaEnrolled ? 'Enabled' : 'Not enrolled'}
                </Badge>
              }
            />
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}

function DetailRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-[11px] font-medium uppercase tracking-wider text-slate-500">{label}</dt>
      <dd className={mono ? 'mt-0.5 font-mono text-xs text-slate-900' : 'mt-0.5 text-slate-900'}>
        {value}
      </dd>
    </div>
  );
}
