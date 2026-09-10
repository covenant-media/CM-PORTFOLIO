import { NextResponse } from 'next/server';
import { insertRow } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { email, source } = await request.json();

    if (!email || !/^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(email)) {
      return NextResponse.json({ ok: false, error: 'Enter a valid email address.' }, { status: 400 });
    }

    try {
      await insertRow('newsletter_subscriber', {
        email,
        source: source || 'footer',
      });
    } catch (e: any) {
      // Ignore unique constraint violation if they already subscribed
      if (e.code === '23505' || e.message?.includes('UNIQUE')) {
        // They are already subscribed
      } else {
        throw e;
      }
    }

    return NextResponse.json({ ok: true, message: 'Subscribed successfully.' });
  } catch (err) {
    console.error('[newsletter] error', err);
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 });
  }
}
