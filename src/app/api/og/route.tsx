import { ImageResponse } from 'next/og';

/**
 * Dynamic share card: /api/og?title=…&d=media|tech|main&brand=…&k=Wedding film
 *
 * Generated instead of committed so every page gets an on-brand card that
 * matches its real title, with no binary assets in the repo. Uses the Inter
 * font bundled with next/og — no third-party requests at runtime.
 */
export const runtime = 'nodejs';

const ACCENT: Record<string, { accent: string; soft: string; label: string }> = {
  main: { accent: '#c9a24a', soft: 'rgba(201,162,74,.16)', label: 'Covenant Media' },
  media: { accent: '#c9a24a', soft: 'rgba(201,162,74,.16)', label: 'Media Portfolio' },
  tech: { accent: '#7fa7ff', soft: 'rgba(127,167,255,.14)', label: 'Technology & Security' },
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const title = (url.searchParams.get('title') ?? 'Covenant Media').slice(0, 110);
  const kicker = (url.searchParams.get('k') ?? '').slice(0, 44);
  const brand = (url.searchParams.get('brand') ?? 'Covenant Media').slice(0, 40);
  const division = ACCENT[url.searchParams.get('d') ?? 'main'] ?? ACCENT.main!;
  const host = url.origin === 'http://localhost:3000' ? 'covenantmedia.studio' : url.host;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '76px 84px',
          background: '#0a0a0d',
          color: '#f3f1ec',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `radial-gradient(70% 60% at 12% 0%, ${division.soft}, rgba(10,10,13,0) 70%)`,
          }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, position: 'relative' }}>
          <div style={{ display: 'flex', width: 12, height: 12, borderRadius: 12, background: division.accent }} />
          <div style={{ display: 'flex', fontSize: 26, letterSpacing: 4, textTransform: 'uppercase', opacity: 0.72 }}>
            {brand}
          </div>
          <div style={{ display: 'flex', marginLeft: 'auto', fontSize: 24, letterSpacing: 3, textTransform: 'uppercase', opacity: 0.5 }}>
            {division.label}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 26, position: 'relative' }}>
          {kicker ? (
            <div style={{ display: 'flex', fontSize: 30, color: division.accent, letterSpacing: 1 }}>{kicker}</div>
          ) : null}
          <div
            style={{
              display: 'flex',
              fontSize: title.length > 62 ? 62 : title.length > 40 ? 76 : 92,
              lineHeight: 1.06,
              letterSpacing: -2.2,
              fontWeight: 600,
              maxWidth: 1000,
            }}
          >
            {title}
          </div>
          <div style={{ display: 'flex', width: 120, height: 4, background: division.accent, opacity: 0.85 }} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', opacity: 0.62, fontSize: 26 }}>
          <div style={{ display: 'flex' }}>{host}</div>
          <div style={{ display: 'flex', letterSpacing: 3, textTransform: 'uppercase', fontSize: 22 }}>Media · Technology</div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: { 'cache-control': 'public, max-age=86400, s-maxage=604800, immutable' },
    },
  );
}
