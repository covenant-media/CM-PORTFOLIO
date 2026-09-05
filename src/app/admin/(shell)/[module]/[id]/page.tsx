import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getCmsModule } from '@/lib/cms/modules';
import { RowEditor } from '../row-editor';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ module: string; id: string }> }): Promise<Metadata> {
  const { module: key } = await params;
  const mod = getCmsModule(key);
  return { title: mod ? `Edit ${mod.singular.toLowerCase()}` : 'CMS' };
}

export default async function EditRowPage({ params }: { params: Promise<{ module: string; id: string }> }) {
  const { module: key, id } = await params;
  if (!getCmsModule(key)) notFound();
  if (!/^[A-Za-z0-9_.:-]{1,64}$/.test(id)) notFound();
  return <RowEditor moduleKey={key} id={id} />;
}
