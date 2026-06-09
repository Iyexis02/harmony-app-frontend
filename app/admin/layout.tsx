import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect('/login');
  }

  const email = session.user.email.toLowerCase();
  if (ADMIN_EMAILS.length > 0 && !ADMIN_EMAILS.includes(email)) {
    redirect('/login');
  }

  return <>{children}</>;
}
