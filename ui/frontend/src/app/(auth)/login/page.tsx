import {redirect} from 'next/navigation';
import {LoginExperience} from '@/components/login/LoginExperience';
import {getCurrentUser} from '@/server/session';

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect('/home');
  return <LoginExperience />;
}
