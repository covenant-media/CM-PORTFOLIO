/** CSV export of the enquiry inbox. Permission-checked, and only ever what is stored. */
import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/guard';
import { exportSubmissionsCsv } from '@/lib/cms/repository';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    await requirePermission('submissions', 'read');
  } catch {
    return new NextResponse('Not allowed', { status: 403 });
  }
  const url = new URL(request.url);
  const filters: Record<string, string> = {};
  for (const key of ['form', 'status', 'q']) {
    const value = url.searchParams.get(key);
    if (value) filters[key] = value.slice(0, 80);
  }
  const csv = await exportSubmissionsCsv(filters);
  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="covenant-enquiries-${stamp}.csv"`,
      'cache-control': 'no-store',
    },
  });
}
