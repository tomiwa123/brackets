import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import OpenAI from 'openai';
import type { Candidate } from '../types';
import { MOCK_MIDFIELDERS, MOCK_SCORECARDS } from './mockData';

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


const normalizeName = (str: string): string => {
    return str
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
};

const getMidfielderScorecard = (name: string): Candidate['scorecard'] | null => {
    const midfielder = MOCK_MIDFIELDERS.find(m => {
        const n1 = normalizeName(m.name);
        const n2 = normalizeName(name);
        return n1 === n2 || n1.includes(n2) || n2.includes(n1);
    });
    if (midfielder) {
        return MOCK_SCORECARDS[midfielder.id] || null;
    }
    return null;
};


interface GenerationResponse {
    candidates: Candidate[];
}

export const generateWithLLM = async (
    topic: string,
    provider: 'gemini' | 'openai',
    apiKey: string,
    count: number = 8
): Promise<Candidate[]> => {
    // MOCK DATA INJECTION FOR TESTING
    if (topic === 'dev_test' || topic === 'dev test' || topic === 'All-Time Greatest Soccer Midfielders') {
        await new Promise(resolve => setTimeout(resolve, 800)); // Slight delay for realism
        const devMock = MOCK_MIDFIELDERS.map(m => ({
            id: m.id,
            name: m.name,
            bio: m.bio,
            seed: m.seed,
            imageUrl: m.imageUrl
        }));
        return devMock.slice(0, count).map((item, index) => ({
            ...item,
            seed: index + 1
        }));
    }

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

    try {
        if (provider === 'gemini') {
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ 
                model: "gemini-2.5-flash",
                safetySettings: SAFETY_SETTINGS
            });

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

            if (completion.choices[0].finish_reason === 'content_filter') {
                throw new Error("SAFETY_VIOLATION");
            }

            const content = completion.choices[0].message.content;
            if (!content) throw new Error("No content from OpenAI");

            const data = JSON.parse(content) as GenerationResponse;
            return data.candidates;
        }
    } catch (error: any) {
        console.error("LLM Generation Error:", error);
        const errMsg = error?.message || error?.toString() || "";
        if (
            errMsg.includes("safety") || 
            errMsg.includes("blocked") || 
            errMsg.includes("SAFETY_VIOLATION") || 
            error?.status === 400 && errMsg.includes("content")
        ) {
            throw new Error("SAFETY_VIOLATION");
        }
        throw error;
    }
};

export const generateScorecard = async (
    candidateName: string,
    topic: string,
    provider: 'gemini' | 'openai',
    apiKey: string
): Promise<Candidate['scorecard']> => {
    // MOCK SCORECARD INJECTION
    if (topic === 'dev_test' || topic === 'dev test') {
        await new Promise(resolve => setTimeout(resolve, 500)); // Faster load
        const midfielderCard = getMidfielderScorecard(candidateName);
        if (midfielderCard) return midfielderCard;

        return {
            battleCry: "The pitch is my cathedral!",
            bio: `The legendary ${candidateName} is an elite contender in the ${topic} arena. With legendary vision, world-class trophies, and a historic career, they bring a level of tactical excellence that few in history can match. Opponents beware of their signature style and unmatched influence on the game.`,
            attributes: [
                { label: "Strength", value: "Elite Vision", sentiment: "positive" },
                { label: "Weakness", value: "Set Pieces", sentiment: "negative" },
                { label: "Trophies", value: "WC + UCL", sentiment: "neutral" },
                { label: "Style", value: "Regista", sentiment: "neutral" }
            ]
        };
    }

    const prompt = `
    Create a fun, debate-worthy scorecard for "${candidateName}" in the context of a tournament about "${topic}".
    
    1. "battleCry": A short, punchy motto or quote (catchphrase style).
    2. "bio": A compelling 3-4 sentence description that explains why this item is notable in the context of "${topic}". 
       Make it informative, engaging, and relevant to the category.
    3. "attributes": Generate EXACTLY 4 succinct, creative bullet points relevant to "${topic}". 
       - For example, if topic is "Soccer Midfielders", attributes could be "Play Style", "Trophy Count", "Peak Era", "Best Club".
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
            const model = genAI.getGenerativeModel({ 
                model: "gemini-2.5-flash",
                safetySettings: SAFETY_SETTINGS
            });

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
    // MOCK BULK GENERATION
    if (topic === 'dev_test' || topic === 'dev test' || topic === 'All-Time Greatest Soccer Midfielders') {
        const results: Record<string, Candidate['scorecard']> = {};
        for (const c of candidates) {
            const midfielderCard = getMidfielderScorecard(c.name);
            results[c.id] = midfielderCard || {
                battleCry: "The pitch is my cathedral!",
                bio: `The legendary ${c.name} is an elite contender in the ${topic} arena. With legendary vision, world-class trophies, and a historic career, they bring a level of tactical excellence that few in history can match. Opponents beware of their signature style and unmatched influence on the game.`,
                attributes: [
                    { label: "Strength", value: "Elite Vision", sentiment: "positive" },
                    { label: "Weakness", value: "Set Pieces", sentiment: "negative" },
                    { label: "Trophies", value: "WC + UCL", sentiment: "neutral" },
                    { label: "Style", value: "Regista", sentiment: "neutral" }
                ]
            };
        }
        return results;
    }

    const isByok = apiKey.startsWith('sk-') || apiKey.startsWith('AIza');

    try {
        if (isByok) {
            const cardPromises = candidates.map(async (c) => {
                const card = await generateScorecard(c.name, topic, provider, apiKey);
                return { id: c.id, card };
            });
            const results = await Promise.all(cardPromises);
            const scorecards: Record<string, Candidate['scorecard']> = {};
            for (const resItem of results) {
                scorecards[resItem.id] = resItem.card;
            }
            return scorecards;
        } else {
            console.log(`Generating scorecards via Secure Backend`);
            const apiUrl = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
                ? 'https://brackets-jet.vercel.app/api/generate'
                : '/api/generate';
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-vip-password': apiKey,
                },
                body: JSON.stringify({
                    type: 'scorecards',
                    topic,
                    count: candidates.length,
                    candidatesData: candidates,
                    provider
                })
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || `HTTP error! status: ${response.status}`);
            }

            return await response.json();
        }
    } catch (error: any) {
        console.error("Bulk Scorecard Error, generating robust client-side fallbacks:", error);
        
        const errorMessage = error?.message || "Unknown error";
        try {
            // Use dynamic import to avoid circular dependency since store imports llm
            import('../store/gameStore').then(({ useGameStore }) => {
                useGameStore.getState().setError(`Scouting reports failed (${errorMessage}). Attributes generated locally!`);
            });
        } catch (e) {
            console.error("Failed to set store error:", e);
        }

        // Generate robust fallback scorecards locally so the app NEVER hangs on loading spinners!
        const results: Record<string, Candidate['scorecard']> = {};
        for (const c of candidates) {
            const midfielderCard = getMidfielderScorecard(c.name);
            results[c.id] = midfielderCard || {
                battleCry: `Fear the might of ${c.name}!`,
                bio: `${c.name} is a legendary contender stepping into the "${topic}" arena. Possessing unparalleled spirit, unique tactical assets, and solid backing from its supporters, it is prepared to conquer all matchups in this tournament bracket.`,
                attributes: [
                    { label: "Strength", value: "Iron Will", sentiment: "positive" },
                    { label: "Weakness", value: "Overconfidence", sentiment: "negative" },
                    { label: "Specialty", value: "Crowd Favorite", sentiment: "neutral" },
                    { label: "Hype Level", value: "Over 9000", sentiment: "neutral" }
                ]
            };
        }
        return results;
    }
};


