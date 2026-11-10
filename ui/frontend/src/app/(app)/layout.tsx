import {redirect} from 'next/navigation';
import {AppShell} from '@/components/shell/AppShell';
import {AppProvider} from '@/providers/AppProvider';
import {providerKeys} from '@/server/ai/providers';
import {getCurrentUser} from '@/server/session';

export default async function AuthenticatedLayout({children}: {children: React.ReactNode}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  return (
    <AppProvider ai={providerKeys()} user={user}>
      <AppShell>{children}</AppShell>
    </AppProvider>
  );
}
