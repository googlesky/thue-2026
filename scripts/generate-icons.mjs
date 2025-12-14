import sharp from 'sharp';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '../public');

// Icon SVG (simple design for favicon)
const iconSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1e40af"/>
      <stop offset="100%" style="stop-color:#3b82f6"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="96" fill="url(#bgGrad)"/>
  <text x="256" y="340" text-anchor="middle" font-family="Arial, sans-serif" font-size="280" font-weight="bold" fill="white">₫</text>
</svg>
`;

// OG Image SVG (1200x630)
const ogImageSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1e3a8a"/>
      <stop offset="50%" style="stop-color:#1e40af"/>
      <stop offset="100%" style="stop-color:#3b82f6"/>
    </linearGradient>
  </defs>
  <!-- Background -->
  <rect width="1200" height="630" fill="url(#bgGrad)"/>

  <!-- Logo circle -->
  <rect x="540" y="80" width="120" height="120" rx="24" fill="white"/>
  <text x="600" y="165" text-anchor="middle" font-family="Arial, sans-serif" font-size="72" font-weight="bold" fill="#1e40af">₫</text>

  <!-- Title -->
  <text x="600" y="280" text-anchor="middle" font-family="Arial, sans-serif" font-size="52" font-weight="bold" fill="white">Tính Thuế TNCN 2026</text>
  <text x="600" y="340" text-anchor="middle" font-family="Arial, sans-serif" font-size="28" fill="#93c5fd">So sánh Luật Thuế Cũ và Mới Việt Nam</text>

  <!-- Feature pills -->
  <rect x="160" y="400" width="160" height="48" rx="12" fill="rgba(255,255,255,0.1)"/>
  <text x="240" y="432" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" fill="white">GROSS-NET</text>

  <rect x="360" y="400" width="160" height="48" rx="12" fill="rgba(255,255,255,0.1)"/>
  <text x="440" y="432" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" fill="white">Thưởng Tết</text>

  <rect x="560" y="400" width="120" height="48" rx="12" fill="rgba(255,255,255,0.1)"/>
  <text x="620" y="432" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" fill="white">ESOP</text>

  <rect x="720" y="400" width="160" height="48" rx="12" fill="rgba(255,255,255,0.1)"/>
  <text x="800" y="432" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" fill="white">Quyết toán</text>

  <rect x="920" y="400" width="120" height="48" rx="12" fill="rgba(255,255,255,0.1)"/>
  <text x="980" y="432" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" fill="white">Tăng ca</text>

  <!-- Footer -->
  <text x="600" y="570" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" fill="#93c5fd">thue.1devops.io</text>
</svg>
`;

async function generateIcons() {
  console.log('Generating icons...');

  // Generate favicon.ico (32x32)
  const favicon = await sharp(Buffer.from(iconSvg))
    .resize(32, 32)
    .png()
    .toBuffer();
  writeFileSync(join(publicDir, 'favicon.ico'), favicon);
  console.log('✓ favicon.ico (32x32)');

  // Generate apple-touch-icon.png (180x180)
  const appleIcon = await sharp(Buffer.from(iconSvg))
    .resize(180, 180)
    .png()
    .toBuffer();
  writeFileSync(join(publicDir, 'apple-touch-icon.png'), appleIcon);
  console.log('✓ apple-touch-icon.png (180x180)');

  // Generate icon-192.png (for PWA)
  const icon192 = await sharp(Buffer.from(iconSvg))
    .resize(192, 192)
    .png()
    .toBuffer();
  writeFileSync(join(publicDir, 'icon-192.png'), icon192);
  console.log('✓ icon-192.png (192x192)');

  // Generate icon-512.png (for PWA)
  const icon512 = await sharp(Buffer.from(iconSvg))
    .resize(512, 512)
    .png()
    .toBuffer();
  writeFileSync(join(publicDir, 'icon-512.png'), icon512);
  console.log('✓ icon-512.png (512x512)');

  // Generate og-image.png (1200x630)
  const ogImage = await sharp(Buffer.from(ogImageSvg))
    .resize(1200, 630)
    .png()
    .toBuffer();
  writeFileSync(join(publicDir, 'og-image.png'), ogImage);
  console.log('✓ og-image.png (1200x630)');

  console.log('\nAll icons generated successfully!');
}

generateIcons().catch(console.error);
