import { redirect } from 'next/navigation';

export default function ApplicationAliasPage({ params }: { params: { id: string } }) {
  redirect(`/loans/${params.id}`);
}
