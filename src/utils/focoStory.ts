/** Original FOCO share artwork. Only caller-supplied, recorded values are drawn. */
export interface FocoStory {
  title: string;
  subtitle: string;
  stats: { label: string; value: string }[];
  footnote: string;
  recordedAt: Date;
}

export async function createFocoStory(story: FocoStory): Promise<Blob | null> {
  try {
    await Promise.all([
      document.fonts.load('400 48px "Michroma"'),
      document.fonts.load('400 32px "Space Grotesk"'),
      document.fonts.load('700 32px "Space Grotesk"'),
    ]);
    const logo = new Image();
    logo.src = import.meta.env.BASE_URL + 'assets/brand/foco-v6-reference-vector.svg';
    await logo.decode();
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    const tokens = getComputedStyle(document.documentElement);
    const color = (role: string) => tokens.getPropertyValue('--foco-pro-' + role).trim();
    const text = (value: string, x: number, y: number, size: number, display = false, fill = color('ink')) => {
      ctx.fillStyle = fill;
      ctx.font = `${display ? 400 : 700} ${size}px "${display ? 'Michroma' : 'Space Grotesk'}"`;
      ctx.fillText(value, x, y);
    };
    const wrap = (value: string, x: number, y: number, width: number, size: number, fill: string) => {
      ctx.font = `400 ${size}px "Space Grotesk"`;
      ctx.fillStyle = fill;
      let line = '';
      for (const word of value.split(/\s+/)) {
        const next = line ? line + ' ' + word : word;
        if (line && ctx.measureText(next).width > width) {
          ctx.fillText(line, x, y, width);
          y += size * 1.5;
          line = word;
        } else line = next;
      }
      if (line) ctx.fillText(line, x, y, width);
      return y;
    };
    const panel = (x: number, y: number, width: number, height: number, fill: string) => {
      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.roundRect(x, y, width, height, 48);
      ctx.fill();
    };
    ctx.fillStyle = color('canvas');
    ctx.fillRect(0, 0, 1080, 1920);
    ctx.drawImage(logo, 78, 100, 430, 104);
    text(story.subtitle, 78, 295, 30, false, color('muted'));
    panel(60, 370, 960, 410, color('accent'));
    text('Seu ritmo.', 96, 480, 58, true, color('dark-ink'));
    text('Sua evolução.', 96, 575, 58, true, color('dark-ink'));
    const titleSize = story.title.length > 100 ? 24 : 32;
    wrap(story.title, 100, 650, 860, titleSize, color('dark-ink'));
    story.stats.slice(0, 4).forEach((stat, index) => {
      const x = 60 + index % 2 * 492;
      const y = 830 + Math.floor(index / 2) * 300;
      panel(x, y, 468, 270, color(index % 2 ? 'rose' : 'lilac'));
      text(stat.label, x + 30, y + 65, 28, false, color('dark-ink'));
      let size = 60;
      while (size > 24) {
        ctx.font = `400 ${size}px "Michroma"`;
        if (ctx.measureText(stat.value).width <= 408) break;
        size -= 2;
      }
      text(stat.value, x + 30, y + 165, size, true, color('dark-ink'));
    });
    wrap(story.footnote, 78, 1500, 920, 28, color('muted'));
    text(story.recordedAt.toLocaleDateString('pt-BR', { day:'2-digit', month:'long', year:'numeric' }), 78, 1755, 30, false, color('muted'));
    text('Um treino de cada vez.', 78, 1830, 32);
    return await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
  } catch {
    // The caller keeps the recorded session and offers retry if artwork cannot load.
    return null;
  }
}
