import { ApiKeysManager } from '@/components/api-keys-manager';
import { fetchApiKeys } from '@/lib/api';
import { getSessionTokens } from '@/lib/session';

export default async function ApiKeysPage(): Promise<React.ReactElement> {
  const session = await getSessionTokens();
  if (!session) return <div>Not signed in.</div>;
  const keys = await fetchApiKeys(session.accessToken);
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">API keys</h2>
        <p className="mt-1 text-sm text-slate-500">
          Programmatic access tokens. Use them with{' '}
          <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-xs">
            Authorization: ApiKey &lt;value&gt;
          </code>{' '}
          on the <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-xs">/v1/public</code>{' '}
          endpoints.
        </p>
      </div>
      <ApiKeysManager initialKeys={keys} />
    </div>
  );
}
