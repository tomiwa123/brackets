import type { Candidate } from '../types';
import { generateWithLLM } from './llm';
import { useGameStore } from '../store/gameStore';
import { MOCK_MIDFIELDERS } from './mockData';

export { getMockScorecards } from './mockData';

export const generateCandidates = async (topic: string, count: number = 8): Promise<Candidate[]> => {
    const rawKey = localStorage.getItem('llm_api_key') || '';
    const provider = (localStorage.getItem('llm_provider') as 'gemini' | 'openai') || 'gemini';

    // BYOK keys typically start with sk- (OpenAI) or AIza (Gemini)
    const isByok = rawKey.startsWith('sk-') || rawKey.startsWith('AIza');

    try {
        if (isByok) {
            console.log(`Generating candidates natively using BYOK ${provider}`);
            return await generateWithLLM(topic, provider, rawKey, count);
        } else {
            console.log(`Generating candidates via Secure Backend (Tier 2/3)`);
            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-vip-password': rawKey, // Empty for Global Pool, or populated for VIP
                },
                body: JSON.stringify({
                    type: 'candidates',
                    topic,
                    count,
                    provider
                })
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            if (!data.candidates) throw new Error("Invalid response format from backend");
            return data.candidates;
        }
    } catch (error: any) {
        console.error("Failed to generate with LLM, falling back to mock.", error);
        const errorMessage = error?.message || "Unknown error";
        useGameStore.getState().setError(`Scouting generation failed (${errorMessage}). Setting up classic mock contenders!`);
    }

    // Simulate API delay for mock
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Update the game store topic to match the mock contenders
    useGameStore.getState().setTopic("All-Time Greatest Soccer Midfielders");

    // Return mock data sliced to requested count
    return MOCK_MIDFIELDERS.slice(0, count);
};
