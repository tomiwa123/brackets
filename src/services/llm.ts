import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import type { Candidate } from '../types';

interface GenerationResponse {
    candidates: Candidate[];
}

export const generateWithLLM = async (
    topic: string,
    provider: 'gemini' | 'openai',
    apiKey: string
): Promise<Candidate[]> => {
    const prompt = `
    Generate a list of exactly 16 distinct items related to the topic: "${topic}".
    For each item, provide:
    1. A unique ID (1-16)
    2. Name
    3. A short, fun bio (max 2 sentences)
    4. A seed number (1-16, where 1 is the strongest/most popular)
    
    Return ONLY a valid JSON object with a "candidates" array.
    Example format:
    {
      "candidates": [
        { "id": "1", "name": "Item Name", "bio": "Fun description.", "seed": 1 }
      ]
    }
  `;

    try {
        if (provider === 'gemini') {
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

            console.log("Calling Gemini API...");
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            // Clean up markdown code blocks if present
            const jsonStr = text.replace(/```json\n?|\n?```/g, '').trim();
            const data = JSON.parse(jsonStr) as GenerationResponse;
            return data.candidates;
        } else {
            const openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
            const completion = await openai.chat.completions.create({
                messages: [{ role: "user", content: prompt }],
                model: "gpt-4o-mini",
                response_format: { type: "json_object" },
            });

            const content = completion.choices[0].message.content;
            if (!content) throw new Error("No content from OpenAI");

            const data = JSON.parse(content) as GenerationResponse;
            return data.candidates;
        }
    } catch (error) {
        console.error("LLM Generation Error:", error);
        throw error;
    }
};

export const generateScorecard = async (
    candidateName: string,
    topic: string,
    provider: 'gemini' | 'openai',
    apiKey: string
): Promise<Candidate['scorecard']> => {
    const prompt = `
    Create a fun, debate-worthy scorecard for "${candidateName}" in the context of a tournament about "${topic}".
    
    1. "battleCry": A short, punchy motto or quote (catchphrase style).
    2. "bio": A compelling 3-4 sentence description that explains why this item is notable in the context of "${topic}". 
       Make it informative, engaging, and relevant to the category.
    3. "attributes": Generate EXACTLY 4 succinct, creative bullet points relevant to "${topic}". 
       - For example, if topic is "Reptiles", attributes could be "Venom Level", "Aggression", "Diet", "Habitat".
       - If topic is "90s Sitcoms", attributes could be "Best Character", "Laugh Track Usage", "Cultural Impact", "Catchphrase".
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
    Keep it brief and fun.
  `;

    try {
        if (provider === 'gemini') {
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            const jsonStr = text.replace(/```json\n?|\n?```/g, '').trim();
            return JSON.parse(jsonStr);
        } else {
            const openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
            const completion = await openai.chat.completions.create({
                messages: [{ role: "user", content: prompt }],
                model: "gpt-4o-mini",
                response_format: { type: "json_object" },
            });
            const content = completion.choices[0].message.content;
            if (!content) throw new Error("No content");
            return JSON.parse(content);
        }
    } catch (error) {
        console.error("Scorecard Generation Error:", error);
        return {
            battleCry: "Ready for battle!",
            bio: "This competitor brings mystery and intrigue to the arena. With unknown capabilities and untested resolve, they represent the wild card of this tournament. Only time will tell what they're truly made of.",
            attributes: [
                { label: "Strength", value: "Unknown Power", sentiment: "positive" },
                { label: "Weakness", value: "Mystery", sentiment: "negative" },
                { label: "Potential", value: "Unlimited", sentiment: "neutral" },
                { label: "Experience", value: "Untested", sentiment: "neutral" }
            ]
        };
    }
};

export const generateAllScorecards = async (
    candidates: Candidate[],
    topic: string,
    provider: 'gemini' | 'openai',
    apiKey: string
): Promise<Record<string, Candidate['scorecard']>> => {
    const prompt = `
    Generate fun, debate-worthy scorecards for these 16 items in a tournament about "${topic}":
    ${candidates.map(c => `- ${c.name} (ID: ${c.id})`).join('\n')}

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

    try {
        if (provider === 'gemini') {
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
            const result = await model.generateContent(prompt);
            const text = result.response.text();
            const jsonStr = text.replace(/```json\n?|\n?```/g, '').trim();
            return JSON.parse(jsonStr);
        } else {
            const openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
            const completion = await openai.chat.completions.create({
                messages: [{ role: "user", content: prompt }],
                model: "gpt-4o-mini",
                response_format: { type: "json_object" },
            });
            const content = completion.choices[0].message.content;
            if (!content) throw new Error("No content");
            return JSON.parse(content);
        }
    } catch (error) {
        console.error("Bulk Scorecard Error:", error);
        return {};
    }
};

export const getCandidateImage = (name: string, topic: string): string => {
    // Use pollinations.ai for free, fast image generation
    // Add random seed to prevent caching/duplicates for similar items
    const seed = Math.floor(Math.random() * 10000);
    const prompt = encodeURIComponent(`high quality, 3d render, icon, ${name} related to ${topic}, vibrant, game asset style`);
    return `https://image.pollinations.ai/prompt/${prompt}?width=512&height=512&nologo=true&seed=${seed}`;
};
