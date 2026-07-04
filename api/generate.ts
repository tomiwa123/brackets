import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { Redis } from '@upstash/redis';
const envPath = path.resolve(__dirname, '..', '.env.local');
dotenv.config({ path: envPath });


// Removed stray object literal; environment variables are accessed via process.env directly in later const declarations.

import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import OpenAI from 'openai';

const SAFETY_SETTINGS = [
    {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
];

// Initialize Redis client using environment variables
// Vercel handles passing UPSTASH_REDIS_REST_URL and _REST_TOKEN
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
});

const SUPER_VIP_PASSWORD = process.env.SUPER_VIP_PASSWORD || 'tahoe26';
const VIP_PASSWORD = process.env.VIP_PASSWORD || 'secretvip';
const SECRET_OPENAI_KEY = process.env.SECRET_OPENAI_KEY || '';
const SECRET_GEMINI_KEY = process.env.SECRET_GEMINI_KEY || '';

// Rate Limits per Hour
const GLOBAL_LIMIT = 2; // Strict worldwide limit
const VIP_LIMIT = 10;   // Strict worldwide limit for friends pool
const SUPER_VIP_LIMIT = 50; // Super VIP pool limit


  


export default async function handler(req: any, res: any) {
  // Log environment variables on every request, even if none are set
  
  // Existing CORS configuration
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, x-vip-password');

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

  // Determine which LLM provider to use. Default to Gemini, but fall back to OpenAI if the Gemini key is missing.
  let { type, topic, count, provider, candidatesData, query } = req.body;
  // If provider not supplied, pick based on available keys
  if (!provider) {
  provider = SECRET_GEMINI_KEY ? 'gemini' : 'openai';
}
// If Gemini is requested but its key is missing, gracefully fall back to OpenAI
if (provider === 'gemini' && (!SECRET_GEMINI_KEY || SECRET_GEMINI_KEY === '')) {
  provider = 'openai';
}
  const providedPassword = req.headers['x-vip-password'] || '';



  // 1. DETERMINE TIER & RATE LIMIT
  let isVip = false;
  let isSuperVip = false;
  let redisKey = 'global_pool_count';
  let limit = GLOBAL_LIMIT;

  if (providedPassword === SUPER_VIP_PASSWORD) {
    isSuperVip = true;
    isVip = true;
    redisKey = 'super_vip_pool_count';
    limit = SUPER_VIP_LIMIT;
  } else if (providedPassword === VIP_PASSWORD) {
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

      if (type === 'candidates' && currentCount && currentCount >= limit) {
        return res.status(429).json({
          error: isSuperVip
            ? 'Super VIP pool exhausted for this hour. Please try again later.'
            : isVip
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
  
    }
  } catch (err) {

  }

  // 4. EXECUTE LOGIC
  try {
    if (type === 'image') {
      const searchKey = process.env.SECRET_GOOGLE_SEARCH_KEY || process.env.GOOGLE_SEARCH_KEY || process.env.GOOGLE_API_KEY || '';
      const searchCx = process.env.SECRET_GOOGLE_SEARCH_CX || process.env.GOOGLE_SEARCH_CX || process.env.GOOGLE_CX || process.env.GOOGLE_SEARCH_ENGINE_ID || '';

      if (!searchKey || !searchCx) {
        return res.status(500).json({ error: 'Server missing Google Search API configuration. Please configure SECRET_GOOGLE_SEARCH_KEY and SECRET_GOOGLE_SEARCH_CX (or GOOGLE_SEARCH_KEY and GOOGLE_SEARCH_CX).' });
      }

      const url = `https://www.googleapis.com/customsearch/v1?q=${encodeURIComponent(query)}&cx=${searchCx}&key=${searchKey}&searchType=image&num=1&safe=active`;
      const response = await fetch(url);

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        const errDetail = errJson.error?.message || '';
        const errReason = errJson.error?.errors?.[0]?.reason || '';
        
        if (response.status === 429 || errDetail.toLowerCase().includes("quota") || errReason.toLowerCase().includes("limitexceeded")) {
          return res.status(429).json({ error: 'Google Image Search API Quota Exceeded' });
        }
        return res.status(response.status).json({ error: `Google Image Search API Error: ${errDetail || response.statusText}` });
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
        const model = genAI.getGenerativeModel({ 
          model: "gemini-2.5-flash",
          safetySettings: SAFETY_SETTINGS
        });
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
        if (completion.choices[0].finish_reason === 'content_filter') {
          return res.status(422).json({ error: "SAFETY_VIOLATION" });
        }
        const content = completion.choices[0].message.content;
        return res.status(200).json(JSON.parse(content || '{}'));
      }
    }

    else if (type === 'scorecards') {
      const generateCard = async (c: any) => {
        const prompt = `
          Create a fun, debate-worthy scorecard for "${c.name}" in the context of a tournament about "${topic}".
          
          1. "battleCry": A short, punchy motto or quote (catchphrase style).
          2. "bio": A compelling 3-4 sentence description that explains why this item is notable in the context of "${topic}". 
             Make it informative, engaging, and relevant to the category.
          3. "attributes": Generate EXACTLY 4 succinct, creative bullet points relevant to "${topic}". 
             - One attribute MUST be a "Strength" (positive) and one MUST be a "Weakness" (negative).
             - The others can be neutral stats or fun facts.
             - Keep each value SHORT and punchy (1-3 words ideally).
          
          Return ONLY a valid JSON object with this structure:
          {
            "battleCry": "...",
            "bio": "3-4 sentences here...",
            "attributes": [
              { "label": "Category Name", "value": "Short value", "sentiment": "positive" | "negative" | "neutral" }
            ]
          }
        `;

        if (provider === 'gemini') {
          const genAI = new GoogleGenerativeAI(apiKey);
          const model = genAI.getGenerativeModel({ 
            model: "gemini-2.5-flash",
            safetySettings: SAFETY_SETTINGS
          });
          const result = await model.generateContent(prompt);
          const text = result.response.text();
          const jsonStr = text.replace(/```json\n?|\n?```/g, '').trim();
          return { id: c.id, card: JSON.parse(jsonStr) };
        } else {
          const openai = new OpenAI({ apiKey });
          const completion = await openai.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: "gpt-4o-mini",
            response_format: { type: "json_object" },
          });
          if (completion.choices[0].finish_reason === 'content_filter') {
            throw new Error("SAFETY_VIOLATION");
          }
          const content = completion.choices[0].message.content;
          return { id: c.id, card: JSON.parse(content || '{}') };
        }
      };

      const cardPromises = candidatesData.map((c: any) => generateCard(c));
      const results = await Promise.all(cardPromises);
      const scorecards: Record<string, any> = {};
      for (const resItem of results) {
        scorecards[resItem.id] = resItem.card;
      }
      return res.status(200).json(scorecards);
    }

  } catch (error: any) {
    const errMsg = error?.message || error?.toString() || "";
    if (
      errMsg.includes("safety") || 
      errMsg.includes("blocked") || 
      errMsg.includes("SAFETY_VIOLATION") || 
      error?.status === 400 && errMsg.includes("content")
    ) {
      return res.status(422).json({ error: "SAFETY_VIOLATION" });
    }
    return res.status(500).json({ error: error.message || 'Failed to generate content' });
  }
}
