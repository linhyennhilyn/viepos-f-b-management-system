import { AuthShell } from '@/components/auth/auth-shell';
import { CreateAccountForm } from '@/components/auth/create-account-form';

export default function CreateAccountPage() {
  return (
    <AuthShell>
      <CreateAccountForm />
    </AuthShell>
  );
}
