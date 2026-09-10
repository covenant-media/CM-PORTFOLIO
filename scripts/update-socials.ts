import { execute } from '../src/lib/db/index.js';
import { newId } from '../src/lib/db/index.js';

async function updateSocials() {
  const socials = [
    { network: 'github', url: 'https://github.com/covenant-media', handle: 'covenant-media', label: 'GitHub', order: 1 },
    { network: 'linkedin', url: 'https://www.linkedin.com/in/covenant-media-021b242a3?utm_source=share_via&utm_content=profile&utm_medium=member_android', handle: 'covenant-media-021b242a3', label: 'LinkedIn', order: 2 },
    { network: 'instagram', url: 'https://www.instagram.com/covenant_media_tv?stkn=MTh4aXM3N3kyY3Vsbw==', handle: 'covenant_media_tv', label: 'Instagram', order: 3 },
    { network: 'youtube', url: 'https://youtube.com/@covenant_media?si=_rvhuK0bVJfX0xDM', handle: '@covenant_media', label: 'YouTube', order: 4 },
    { network: 'x', url: 'https://x.com/Covenant__media', handle: '@Covenant__media', label: 'X', order: 5 },
    { network: 'whatsapp', url: 'https://wa.link/ufa5k5', handle: 'WhatsApp', label: 'WhatsApp', order: 6 },
    { network: 'mail', url: 'mailto:covenantmedia015@gmail.com', handle: 'covenantmedia015@gmail.com', label: 'Email', order: 7 }
  ];

  await execute('DELETE FROM social_link');

  for (const s of socials) {
    await execute(
      `INSERT INTO social_link (id, network, url, handle, label, icon, placements, is_verified, status, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [newId('soc'), s.network, s.url, s.handle, s.label, s.network, JSON.stringify(['header', 'footer', 'contact', 'media']), true, 'published', s.order]
    );
  }
  console.log('Social links updated');
}

updateSocials();
