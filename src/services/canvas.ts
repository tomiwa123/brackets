import type { Candidate } from '../types';

/**
 * Generates an ultra-premium visual Champion Card on an HTML5 Canvas
 * and returns it as a high-density PNG Data URI.
 * Size: 1200 x 630 px (Optimal for social sharing)
 */
export async function generateChampionCard(winner: Candidate, topic: string): Promise<string> {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 630;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get 2D canvas context');

    // 1. Draw Background Gradient
    const bgGrad = ctx.createRadialGradient(600, 315, 50, 600, 315, 700);
    bgGrad.addColorStop(0, '#0a0d1a'); // Dark indigo core
    bgGrad.addColorStop(0.5, '#05060b'); // Very dark body
    bgGrad.addColorStop(1, '#000000'); // Pure black edges
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1200, 630);

    // 2. Draw Cyberpunk Grid
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.04)'; // Subtle cyan
    ctx.lineWidth = 1;
    const gridSize = 40;
    for (let x = 0; x < 1200; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 630);
        ctx.stroke();
    }
    for (let y = 0; y < 630; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(1200, y);
        ctx.stroke();
    }

    // 3. Draw Outer Neon Border & Accent Corners
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 4;
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#00ffff';
    ctx.strokeRect(20, 20, 1160, 590);

    // Reset shadow for standard elements
    ctx.shadowBlur = 0;

    // Corner decorative sci-fi brackets
    ctx.fillStyle = '#ffff00';
    // Top-Left corner accent
    ctx.fillRect(15, 15, 40, 6);
    ctx.fillRect(15, 15, 6, 40);
    // Top-Right corner accent
    ctx.fillRect(1145, 15, 40, 6);
    ctx.fillRect(1179, 15, 6, 40);
    // Bottom-Left corner accent
    ctx.fillRect(15, 609, 40, 6);
    ctx.fillRect(15, 575, 6, 40);
    // Bottom-Right corner accent
    ctx.fillRect(1145, 609, 40, 6);
    ctx.fillRect(1179, 575, 6, 40);

    // 4. Load and Render Candidate Image on the Left
    const imgX = 80;
    const imgY = 90;
    const imgW = 400;
    const imgH = 450;

    // Draw Portrait Container Glow
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#ffff00';
    ctx.strokeStyle = '#ffff00';
    ctx.lineWidth = 4;
    ctx.strokeRect(imgX, imgY, imgW, imgH);
    ctx.shadowBlur = 0; // Reset

    let imageLoaded = false;
    if (winner.imageUrl) {
        try {
            const img = new Image();
            img.crossOrigin = 'anonymous'; // Attempt CORS-enabled load
            img.src = winner.imageUrl;
            
            await new Promise<void>((resolve, reject) => {
                img.onload = () => {
                    imageLoaded = true;
                    resolve();
                };
                img.onerror = () => reject();
                // Set timeout so we don't hang indefinitely
                setTimeout(() => reject(), 4000);
            });

            if (imageLoaded) {
                ctx.save();
                // Clip image inside the box
                ctx.beginPath();
                ctx.rect(imgX + 2, imgY + 2, imgW - 4, imgH - 4);
                ctx.clip();
                ctx.drawImage(img, imgX, imgY, imgW, imgH);
                ctx.restore();
            }
        } catch (e) {
            console.warn('Could not load champion image for Canvas, falling back to vector.', e);
        }
    }

    if (!imageLoaded) {
        // Futuristic vector illustration placeholder
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(imgX + 2, imgY + 2, imgW - 4, imgH - 4);

        // Neon design elements in placeholder
        ctx.strokeStyle = 'rgba(255, 255, 0, 0.1)';
        ctx.lineWidth = 2;
        for (let i = 0; i < imgW; i += 25) {
            ctx.beginPath();
            ctx.moveTo(imgX + i, imgY);
            ctx.lineTo(imgX + imgW - i, imgY + imgH);
            ctx.stroke();
        }

        // Draw a golden glowing trophy icon in vector
        ctx.save();
        ctx.translate(imgX + imgW / 2, imgY + imgH / 2 - 20);
        ctx.shadowBlur = 25;
        ctx.shadowColor = '#ffff00';
        ctx.fillStyle = '#ffff00';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;

        // Trophy Cup shape
        ctx.beginPath();
        ctx.moveTo(-40, -40);
        ctx.lineTo(40, -40);
        ctx.quadraticCurveTo(40, 10, 0, 40);
        ctx.quadraticCurveTo(-40, 10, -40, -40);
        ctx.fill();
        ctx.stroke();

        // Handles
        ctx.beginPath();
        ctx.arc(-42, -15, 15, Math.PI * 0.5, Math.PI * 1.6);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(42, -15, 15, Math.PI * 1.4, Math.PI * 0.5);
        ctx.stroke();

        // Stem & Base
        ctx.fillRect(-10, 40, 20, 20);
        ctx.strokeRect(-10, 40, 20, 20);

        ctx.beginPath();
        ctx.moveTo(-35, 60);
        ctx.lineTo(35, 60);
        ctx.lineTo(25, 75);
        ctx.lineTo(-25, 75);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Star
        ctx.fillStyle = '#00ffff';
        ctx.shadowColor = '#00ffff';
        ctx.beginPath();
        ctx.arc(0, -10, 10, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    // 5. Draw Seed Badge on Portrait
    ctx.fillStyle = '#000000';
    ctx.fillRect(imgX + 15, imgY + 15, 100, 36);
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(imgX + 15, imgY + 15, 100, 36);

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 14px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`SEED #${winner.seed}`, imgX + 65, imgY + 38);

    // 6. Draw Content on Right Side
    const textX = 530;
    ctx.textAlign = 'left';

    // "CHAMPION" Header
    ctx.save();
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#ffff00';
    const titleGrad = ctx.createLinearGradient(textX, 0, textX + 300, 0);
    titleGrad.addColorStop(0, '#ffff00');
    titleGrad.addColorStop(1, '#ff8800');
    ctx.fillStyle = titleGrad;
    ctx.font = 'italic 900 75px "Arial Black", Gadget, sans-serif';
    ctx.fillText('CHAMPION', textX, 150);
    ctx.restore();

    // Candidate Name
    ctx.fillStyle = '#ffffff';
    ctx.font = 'italic 900 50px "Arial Black", Gadget, sans-serif';
    // Constrain name size if too long
    const name = winner.name.toUpperCase();
    const nameWidth = ctx.measureText(name).width;
    if (nameWidth > 600) {
        ctx.font = 'italic 900 38px "Arial Black", Gadget, sans-serif';
    }
    ctx.fillText(name, textX, 220);

    // Battle Cry
    if (winner.scorecard?.battleCry) {
        ctx.fillStyle = '#00ffff';
        ctx.font = 'italic 700 24px "Georgia", serif';
        ctx.fillText(`"${winner.scorecard.battleCry}"`, textX, 275);
    }

    // Divider Line
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(textX, 305);
    ctx.lineTo(1120, 305);
    ctx.stroke();

    // Tournament Topic Title
    ctx.fillStyle = '#ff8800';
    ctx.font = '900 14px "Courier New", monospace';
    ctx.fillText(`TOURNAMENT TOPIC: ${topic.toUpperCase()}`, textX, 335);

    // Champion Bio Description (wrapped)
    ctx.fillStyle = '#cbd5e1'; // slate-300
    ctx.font = '500 18px "Courier New", monospace';
    const bioText = winner.scorecard?.bio || winner.bio || '';
    wrapText(ctx, bioText, textX, 375, 580, 26);

    // 7. Footer Accent Branding
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.font = 'bold 12px "Courier New", monospace';
    ctx.fillText('TOURNAMENT BRACKET CHAMPIONSHIP // BRACKETS APP', textX, 570);

    return canvas.toDataURL('image/png');
}

/**
 * Simple canvas text-wrapping helper
 */
function wrapText(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number
) {
    const words = text.split(' ');
    let line = '';
    let currentY = y;
    for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        const testWidth = metrics.width;
        if (testWidth > maxWidth && n > 0) {
            ctx.fillText(line, x, currentY);
            line = words[n] + ' ';
            currentY += lineHeight;
        } else {
            line = testLine;
        }
    }
    ctx.fillText(line, x, currentY);
}
