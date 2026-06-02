import { redirect } from 'next/navigation';

export default function SettingsIndex(): never {
  redirect('/app/settings/api-keys');
}
