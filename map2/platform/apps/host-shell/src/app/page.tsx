import { redirect } from 'next/navigation';
import { getSessionTokens } from '@/lib/session';

export default async function RootPage(): Promise<never> {
  const session = await getSessionTokens();
  redirect(session ? '/app' : '/login');
}
