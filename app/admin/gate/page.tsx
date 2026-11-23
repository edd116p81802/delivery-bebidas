import { redirect } from 'next/navigation';

export default function GateRedirectPage() {
  redirect('/admin/gateway');
}
