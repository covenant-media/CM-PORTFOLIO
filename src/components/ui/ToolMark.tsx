/**
 * Tool marks for the "Tools I use" band.
 *
 * **These are the real marks.** The band used to be drawn as hand-made vectors, and most of the
 * drawings read as approximations: the lettering, the CapCut cut mark and the OBS swirl are all
 * shapes that a person recognises instantly, and an approximation of one is worse than no mark
 * at all. Every icon below is now the product's own artwork, prepared once into
 * `public/images/tools/` and served as a transparent PNG:
 *
 *   • **CapCut, OBS Studio, DaVinci Resolve and Photoshop** come from the owner's own uploads,
 *     with their backgrounds removed: the cut mark and the broadcast swirl are kept as white
 *     artwork on transparency, and the two app plates are cropped to the plate and rounded, so
 *     each sits on the band's tile exactly as the app icon does.
 *   • **Premiere Pro and Lightroom** are Adobe's plates — aubergine with the violet ligature,
 *     navy with the blue one — drawn at 4× the size they are displayed at and downsampled, so
 *     the lettering stays sharp.
 *   • **vMix** is the nine-square mark, blue with its green and orange cells.
 *
 * Each file is 128×128 with a transparent background and the artwork inset by 4px, so every mark
 * occupies the same optical square inside its tile. The marks carry no text: the accessible name
 * comes from the tool's own label on the tile, and the image itself is `aria-hidden`.
 */

const SOURCES: Record<string, string> = {
  capcut: '/images/tools/capcut.png',
  davinci: '/images/tools/davinci.png',
  obs: '/images/tools/obs.png',
  vmix: '/images/tools/vmix.png',
  lightroom: '/images/tools/lightroom.png',
  photoshop: '/images/tools/photoshop.png',
  premiere: '/images/tools/premiere.png',
};

export function ToolMark({ id, className }: { id: string; className?: string }) {
  switch (id) {
    case 'capcut':
    case 'davinci':
    case 'obs':
    case 'vmix':
    case 'lightroom':
    case 'photoshop':
    case 'premiere':
      return <img src={SOURCES[id]} alt="" aria-hidden width={64} height={64} decoding="async" className={className} />;
    default:
      return null;
  }
}
