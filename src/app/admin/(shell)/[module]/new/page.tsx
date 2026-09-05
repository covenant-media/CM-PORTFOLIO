import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getCmsModule } from '@/lib/cms/modules';
import { RowEditor } from '../row-editor';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ module: string }> }): Promise<Metadata> {
  const { module: key } = await params;
  const mod = getCmsModule(key);
  return { title: mod ? `New ${mod.singular.toLowerCase()}` : 'CMS' };
}

export default async function NewRowPage({ params }: { params: Promise<{ module: string }> }) {
  const { module: key } = await params;
  if (!getCmsModule(key)) notFound();
  return <RowEditor moduleKey={key} id={null} />;
}
