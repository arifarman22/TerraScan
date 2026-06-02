import { redirect } from 'next/navigation';
import { Toaster } from 'sonner';
import { AppSidebar } from '@/components/app-sidebar';
import { AppTopbar } from '@/components/app-topbar';
import { fetchMe, fetchOrganisation } from '@/lib/api';
import { getSessionTokens } from '@/lib/session';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}): Promise<React.ReactElement> {
  const session = await getSessionTokens();
  if (!session) {
    redirect('/login');
  }
  try {
    const [user, organisation] = await Promise.all([
      fetchMe(session.accessToken),
      fetchOrganisation(session.accessToken),
    ]);
    return (
      <div className="flex min-h-screen">
        <AppSidebar
          organisationName={organisation.name}
          subscriptionTier={organisation.subscriptionTier}
        />
        <div className="flex min-h-screen flex-1 flex-col bg-slate-50">
          <AppTopbar user={user} organisation={organisation} />
          <main className="flex-1 p-4 md:p-8">
            <div className="mx-auto max-w-7xl">{children}</div>
          </main>
        </div>
        <Toaster richColors position="top-right" />
      </div>
    );
  } catch {
    redirect('/login');
  }
}
