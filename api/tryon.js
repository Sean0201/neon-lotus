/**
 * /api/tryon.js â Vercel Edge Function
 * Proxies virtual try-on requests to Google Gemini 2.5 Flash Image
 * Supports: tops, bottoms, bags, hats â with layered outfit composition
 */

export const config = { runtime: 'edge', maxDuration: 300, regions: ['iad1'] };

/* ââ Category-specific prompt builders âââââââââââââââââââââââ */
function getPrompt(category, productName) {
  const pname = productName || 'this item';

  const prompts = {
    top: [
      'You are a virtual fitting room assistant. The user wants to try on "' + pname + '".',
      '',
      'TASK: Generate ONE photorealistic image showing the person in the first image wearing the TOP/UPPER-BODY clothing shown in the second image.',
      '',
      'CRITICAL RULES:',
      '- Preserve the person\'s face, hairstyle, skin tone, body shape, pose, and proportions EXACTLY',
      '- Replace ONLY the upper-body clothing (shirt/jacket/hoodie) with the garment from the second image',
      '- Keep the person\'s EXISTING pants/bottoms, shoes, and accessories unchanged',
      '- Maintain the original photo\'s lighting, camera angle, and background',
      '- The clothing must look naturally fitted â correct draping, folds, shadows',
      '- Output a single high-quality photorealistic image',
      '- Do NOT add text, watermarks, or borders'
    ].join('\n'),

    bottom: [
      'You are a virtual fitting room assistant. The user wants to try on "' + pname + '".',
      '',
      'TASK: Generate ONE photorealistic image showing the person in the first image wearing the PANTS/BOTTOMS shown in the second image.',
      '',
      'CRITICAL RULES:',
      '- Preserve the person\'s face, hairstyle, skin tone, body shape, pose, and proportions EXACTLY',
      '- Replace ONLY the lower-body clothing (pants/shorts/skirt) with the item from the second image',
      '- Keep the person\'s EXISTING top/upper-body clothing, shoes, and accessories COMPLETELY unchanged',
      '- Maintain the original photo\'s lighting, camera angle, and background',
      '- The clothing must look naturally fitted â correct draping, folds, shadows',
      '- Output a single high-quality photorealistic image',
      '- Do NOT add text, watermarks, or borders'
    ].join('\n'),

    bag: [
      'You are a virtual fitting room assistant. The user wants to try on "' + pname + '".',
      '',
      'TASK: Generate ONE photorealistic image showing the person in the first image carrying/wearing the BAG shown in the second image.',
      '',
      'CRITICAL RULES:',
      '- Preserve the person\'s face, hairstyle, skin tone, body shape, pose, and ALL clothing EXACTLY',
      '- ADD the bag from the second image naturally â on the shoulder, crossbody, or hand depending on bag style',
      '- Do NOT change any existing clothing or accessories',
      '- Maintain the original photo\'s lighting, camera angle, and background',
      '- The bag must look naturally placed with correct shadows and proportions',
      '- Output a single high-quality photorealistic image',
      '- Do NOT add text, watermarks, or borders'
    ].join('\n'),

    hat: [
      'You are a virtual fitting room assistant. The user wants to try on "' + pname + '".',
      '',
      'TASK: Generate ONE photorealistic image showing the person in the first image wearing the HAT/CAP shown in the second image.',
      '',
      'CRITICAL RULES:',
      '- Preserve the person\'s face, hairstyle (visible parts), skin tone, body shape, pose, and ALL clothing EXACTLY',
      '- ADD the hat/cap from the second image naturally on the person\'s head',
      '- The hat must match the person\'s head angle and size proportionally',
      '- Do NOT change any existing clothing, accessories, or hairstyle below the hat',
      '- Maintain the original photo\'s lighting, camera angle, and background',
      '- Output a single high-quality photorealistic image',
      '- Do NOT add text, watermarks, or borders'
    ].join('\n')
  };

  return prompts[category] || [
    'You are a virtual fitting room assistant. The user wants to try on "' + pname + '".',
    '',
    'TASK: Generate ONE photorealistic image showing the person in the first image wearing the clothing item shown in the second image.',
    '',
    'CRITICAL RULES:',
    '- Preserve the person\'s face, hairstyle, skin tone, body shape, pose, and proportions EXACTLY',
    '- Replace ONLY the relevant clothing with the garment from the second image',
    '- Maintain the original photo\'s lighting, camera angle, and background',
    '- The clothing must look naturally fitted â correct draping, folds, shadows',
    '- Output a single high-quality photorealistic image',
    '- Do NOT add text, watermarks, or borders'
  ].join('\n');
}

export default async function handler(request) {
  // CORS
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }

  if (request.method !== 'POST') {
    return json(405, { error: 'Method not allowed' });
  }

  const GEMINI_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_KEY) return json(500, { error: 'GEMINI_API_KEY not configured' });

  try {
    const body = await request.json();
    const {
      selfieBase64, selfieType,
      clothingUrl, clothingBase64, clothingType,
      productName, category
    } = body;

    if (!selfieBase64) return json(400, { error: 'Missing selfie image' });
    if (!clothingBase64 && !clothingUrl) return json(400, { error: 'Missing clothing image' });

    // Build prompt based on category
    const promptText = getPrompt(category, productName);

    // Build image parts
    const parts = [];
    parts.push({ text: promptText });

    // Selfie image (or previous result for layered composition)
    parts.push({
      inlineData: {
        mimeType: selfieType || 'image/jpeg',
        data: selfieBase64
      }
    });

    // Clothing image
    if (clothingBase64) {
      parts.push({
        inlineData: {
          mimeType: clothingType || 'image/jpeg',
          data: clothingBase64
        }
      });
    } else if (clothingUrl) {
      const imgRes = await fetch(clothingUrl);
      if (!imgRes.ok) return json(400, { error: 'Failed to fetch clothing image', details: 'status ' + imgRes.status + ' from ' + clothingUrl.substring(0, 100) });
      const imgBuf = await imgRes.arrayBuffer();
      const bytes = new Uint8Array(imgBuf);
      /* Chunk-based btoa to avoid string size limits in Edge runtime */
      const CHUNK = 8192;
      let binary = '';
      for (let i = 0; i < bytes.length; i += CHUNK) {
        binary += String.fromCharCode.apply(null, bytes.subarray(i, Math.min(i + CHUNK, bytes.length)));
      }
      const imgBase64 = btoa(binary);
      const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
      parts.push({
        inlineData: {
          mimeType: contentType,
          data: imgBase64
        }
      });
    }

    // Call Gemini API with timeout protection
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 250000); // 250s timeout

    let geminiRes;
    try {
      geminiRes = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=' + GEMINI_KEY,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [{ role: 'user', parts }],
            generationConfig: {
              responseModalities: ['TEXT', 'IMAGE'],
              temperature: 0.4
            }
          })
        }
      );
    } catch (fetchErr) {
      clearTimeout(timeoutId);
      if (fetchErr.name === 'AbortError') {
        return json(504, { error: 'Gemini API timeout', details: 'The AI took too long to generate the image. Please try again.' });
      }
      throw fetchErr;
    }
    clearTimeout(timeoutId);

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      // Friendly error for region restriction
      if (errText.includes('location is not supported')) {
        return json(400, { error: 'Region not supported', details: 'location_error' });
      }
      return json(geminiRes.status, { error: 'Gemini API error', details: errText.substring(0, 500) });
    }

    const geminiData = await geminiRes.json();

    // Extract image from response
    const candidates = geminiData.candidates || [];
    for (const candidate of candidates) {
      const resParts = candidate.content?.parts || [];
      for (const part of resParts) {
        if (part.inlineData) {
          return json(200, {
            success: true,
            image: part.inlineData.data,
            mimeType: part.inlineData.mimeType || 'image/png'
          });
        }
      }
    }

    return json(500, {
      error: 'No image generated',
      raw: JSON.stringify(geminiData).substring(0, 500)
    });

  } catch (err) {
    return json(500, { error: err.message || 'Unknown server error', details: String(err.stack || err).substring(0, 300) });
  }
}

function json(status, data) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}
