import { Redis } from '@upstash/redis';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';

// Initialize Redis client using environment variables
// Vercel handles passing UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
});

const VIP_PASSWORD = process.env.VIP_PASSWORD || 'secretvip';
const SECRET_OPENAI_KEY = process.env.SECRET_OPENAI_KEY || '';
const SECRET_GEMINI_KEY = process.env.SECRET_GEMINI_KEY || '';
const SECRET_GOOGLE_SEARCH_KEY = process.env.SECRET_GOOGLE_SEARCH_KEY || '';
const SECRET_GOOGLE_SEARCH_CX = process.env.SECRET_GOOGLE_SEARCH_CX || '';

// Rate Limits per Hour
const GLOBAL_LIMIT = 2; // Strict worldwide limit
const VIP_LIMIT = 10;   // Strict worldwide limit for friends pool

export default async function handler(req: any, res: any) {
  // CORS configuration for local development and production
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, x-vip-password');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { type, topic, count, provider = 'gemini', candidatesData, query } = req.body;
  const providedPassword = req.headers['x-vip-password'] || '';

  // 1. DETERMINE TIER & RATE LIMIT
  let isVip = false;
  let redisKey = 'global_pool_count';
  let limit = GLOBAL_LIMIT;

  if (providedPassword === VIP_PASSWORD) {
    isVip = true;
    redisKey = 'vip_pool_count';
    limit = VIP_LIMIT;
  } else if (providedPassword) {
    // They provided a password, but it's wrong!
    return res.status(401).json({ error: 'Invalid Access Password. Please check your settings.' });
  }

  // 2. CHECK REDIS COUNTER
  try {
    if (process.env.UPSTASH_REDIS_REST_URL) {
      const currentCount = await redis.get(redisKey) as number | null;
      
      if (currentCount && currentCount >= limit) {
        return res.status(429).json({ 
          error: isVip 
            ? 'VIP pool exhausted for this hour. Please try again later.' 
            : 'Global public pool exhausted for this hour (Max 2). Please try again later or enter a valid access key/password in settings.'
        });
      }

      // ONLY increment counter on 'candidates' generation to represent "1 game", 
      // do not exhaust the limit by counting individual image fetches!
      if (type === 'candidates') {
        const newCount = await redis.incr(redisKey);
        if (newCount === 1) {
          await redis.expire(redisKey, 3600);
        }
      }
    } else {
      console.warn("No Redis credentials found. Skipping rate limit (DEV ONLY).");
    }
  } catch (err) {
    console.error("Redis Error:", err);
  }

  // 4. EXECUTE LOGIC
  try {
    if (type === 'image') {
      if (!SECRET_GOOGLE_SEARCH_KEY || !SECRET_GOOGLE_SEARCH_CX) {
        return res.status(500).json({ error: 'Server missing Google Search API configuration.' });
      }

      const url = `https://www.googleapis.com/customsearch/v1?q=${encodeURIComponent(query)}&cx=${SECRET_GOOGLE_SEARCH_CX}&key=${SECRET_GOOGLE_SEARCH_KEY}&searchType=image&num=1&safe=active`;
      const response = await fetch(url);
      
      if (!response.ok) {
          throw new Error('Google Image Search API Error');
      }

      const data = await response.json();
      if (data.items && data.items.length > 0) {
          return res.status(200).json({ imageUrl: data.items[0].link });
      }
      return res.status(404).json({ error: 'No image found' });
    }
    
    // GET SECURE LLM API KEY
    const apiKey = provider === 'gemini' ? SECRET_GEMINI_KEY : SECRET_OPENAI_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: `Server missing ${provider} API Key configuration.` });
    }

    if (type === 'candidates') {
      const prompt = `
        Generate a list of exactly ${count} distinct items related to the topic: "${topic}".
        For each item, provide:
        1. A unique ID (1-${count})
        2. Name
        3. A short, fun bio (max 2 sentences)
        4. A seed number (1-${count}, where 1 is the strongest/most popular)
        
        Return ONLY a valid JSON object with a "candidates" array.
        Example format:
        {
          "candidates": [
            { "id": "1", "name": "Item Name", "bio": "Fun description.", "seed": 1 }
          ]
        }
      `;

      if (provider === 'gemini') {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const jsonStr = text.replace(/```json\n?|\n?```/g, '').trim();
        return res.status(200).json(JSON.parse(jsonStr));
      } else {
        const openai = new OpenAI({ apiKey });
        const completion = await openai.chat.completions.create({
          messages: [{ role: "user", content: prompt }],
          model: "gpt-4o-mini",
          response_format: { type: "json_object" },
        });
        const content = completion.choices[0].message.content;
        return res.status(200).json(JSON.parse(content || '{}'));
      }
    } 
    
    else if (type === 'scorecards') {
      const prompt = `
        Generate fun, debate-worthy scorecards for these ${candidatesData.length} items in a tournament about "${topic}":
        ${candidatesData.map((c: any) => `- ${c.name} (ID: ${c.id})`).join('\n')}

        For EACH item, provide:
        1. "battleCry": A short, punchy motto (catchphrase style).
        2. "bio": A compelling 3-4 sentence description that explains why this item is notable in the context of "${topic}". 
           Make it informative, engaging, and relevant to the category.
        3. "attributes": Generate EXACTLY 4 succinct, creative bullet points relevant to "${topic}".
           - One MUST be "Strength" (positive), one "Weakness" (negative).
           - Others can be neutral/fun.
           - Keep each value SHORT and punchy (1-3 words ideally).

        Return ONLY a valid JSON object keyed by candidate ID:
        {
          "1": {
            "battleCry": "...",
            "bio": "3-4 sentences here...",
            "attributes": [
              { "label": "...", "value": "...", "sentiment": "positive"|"negative"|"neutral" }
            ]
          },
          ...
        }
      `;

      if (provider === 'gemini') {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const jsonStr = text.replace(/```json\n?|\n?```/g, '').trim();
        return res.status(200).json(JSON.parse(jsonStr));
      } else {
        const openai = new OpenAI({ apiKey });
        const completion = await openai.chat.completions.create({
          messages: [{ role: "user", content: prompt }],
          model: "gpt-4o-mini",
          response_format: { type: "json_object" },
        });
        const content = completion.choices[0].message.content;
        return res.status(200).json(JSON.parse(content || '{}'));
      }
    }

  } catch (error: any) {
    console.error("API Route Generation Error:", error);
    return res.status(500).json({ error: error.message || 'Failed to generate content' });
  }
}
