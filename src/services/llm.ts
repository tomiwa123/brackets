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
    // MOCK DATA INJECTION FOR TESTING
    if (topic === 'dev_test' || topic === 'dev test') {
        await new Promise(resolve => setTimeout(resolve, 800)); // Slight delay for realism
        return [
            { id: "1", name: "Viper", bio: "Agile and deadly, the Viper strikes before you know it.", seed: 1, imageUrl: "https://images.unsplash.com/photo-1533055640609-24b498dfd74c?w=500&auto=format&fit=crop&q=60" },
            { id: "2", name: "Gecko", bio: "Small but sticky, the Gecko can climb any obstacle.", seed: 16, imageUrl: "https://images.unsplash.com/photo-1595186981180-2ba5763528e1?w=500&auto=format&fit=crop&q=60" },
            { id: "3", name: "Komodo Dragon", bio: "The king of lizards, with a bite that spells doom.", seed: 2, imageUrl: "https://images.unsplash.com/photo-1520626354676-e137f6a7354f?w=500&auto=format&fit=crop&q=60" },
            { id: "4", name: "Chameleon", bio: "Master of disguise, blending into any environment.", seed: 15, imageUrl: "https://images.unsplash.com/photo-1582260274151-54b2dcd68c6e?w=500&auto=format&fit=crop&q=60" },
            { id: "5", name: "Iguana", bio: "Ancient and stoic, a dragon in miniature form.", seed: 3 },
            { id: "6", name: "Monitor Lizard", bio: "Intelligent and relentless hunter.", seed: 14 },
            { id: "7", name: "Gila Monster", bio: "Venomous and beautifully patterned desert dweller.", seed: 4 },
            { id: "8", name: "Bearded Dragon", bio: "Friendly but fierce when threatened.", seed: 13 },
            { id: "9", name: "Anole", bio: "The backyard warrior, displaying bright colors.", seed: 5 },
            { id: "10", name: "Skink", bio: "Glossy and quick, slipping through cracks.", seed: 12 },
            { id: "11", name: "Tegu", bio: "Smart enough to be a pet, strong enough to dominate.", seed: 6 },
            { id: "12", name: "Basilisk", bio: "The Jesus Lizard, running on water with speed.", seed: 11 },
            { id: "13", name: "Horned Toad", bio: "Spiky defense and blood-squirting eyes.", seed: 7 },
            { id: "14", name: "Frilled Neck", bio: "Intimidating display of flaps and fright.", seed: 10 },
            { id: "15", name: "Blue Tongue", bio: "Deceptive looks with a powerful jaw.", seed: 8 },
            { id: "16", name: "Thorny Devil", bio: "Covered in spikes, impossible to swallow.", seed: 9 }
        ];
    }

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
    // MOCK SCORECARD INJECTION
    if (topic === 'dev_test' || topic === 'dev test') {
        await new Promise(resolve => setTimeout(resolve, 500)); // Faster load
        return {
            battleCry: "Victory is written in the scales!",
            bio: `The ${candidateName} is a formidable opponent in the ${topic} arena. With swift movements and a history of survival in harsh environments, it brings a level of tenacity that few can match. Opponents beware of its hidden strengths and calculated strikes. This is a contender that refuses to back down regardless of the odds stacked against it.`,
            attributes: [
                { label: "Strength", value: "Adaptability", sentiment: "positive" },
                { label: "Weakness", value: "Cold Temps", sentiment: "negative" },
                { label: "Speed", value: "Blistering", sentiment: "neutral" },
                { label: "Defense", value: "Scaly Armor", sentiment: "neutral" }
            ]
        };
    }

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
    // MOCK BULK GENERATION
    if (topic === 'dev_test' || topic === 'dev test') {
        const results: Record<string, Candidate['scorecard']> = {};
        for (const c of candidates) {
            results[c.id] = {
                battleCry: "Victory is written in the scales!",
                bio: `The ${c.name} is a formidable opponent in the ${topic} arena. With swift movements and a history of survival in harsh environments, it brings a level of tenacity that few can match. Opponents beware of its hidden strengths and calculated strikes. This is a contender that refuses to back down regardless of the odds stacked against it.`,
                attributes: [
                    { label: "Strength", value: "Adaptability", sentiment: "positive" },
                    { label: "Weakness", value: "Cold Temps", sentiment: "negative" },
                    { label: "Speed", value: "Blistering", sentiment: "neutral" },
                    { label: "Defense", value: "Scaly Armor", sentiment: "neutral" }
                ]
            };
        }
        return results;
    }

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
