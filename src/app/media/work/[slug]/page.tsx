import { ProjectDetailView } from '@/components/site/ProjectDetailView';
import { projectMetadata } from '@/lib/seo/page';

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return projectMetadata('media', slug);
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <ProjectDetailView slug={slug} division="media" />;
}
