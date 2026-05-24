export const fetchGoogleImage = async (
    query: string,
    apiKey: string,
    searchEngineId: string
): Promise<string | null> => {
    try {
        const url = `https://www.googleapis.com/customsearch/v1?q=${encodeURIComponent(query)}&cx=${searchEngineId}&key=${apiKey}&searchType=image&num=1&safe=active`;

        const response = await fetch(url);

        if (!response.ok) {
            const errorData = await response.json();
            console.warn("Google Image Search API Error:", errorData);
            return null;
        }

        const data = await response.json();

        if (data.items && data.items.length > 0) {
            return data.items[0].link;
        }
        return null;
    } catch (error) {
        console.error("Google Image Search Network Error:", error);
        return null;
    }
};

import { MOCK_MIDFIELDERS } from './mockData';

const normalizeName = (str: string): string => {
    return str
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
};

export const getCandidateImage = async (
    name: string,
    topic: string
): Promise<string> => {
    // 0. If candidate is a mock midfielder, return their high-quality Wikimedia Commons photo URL directly
    const midfielder = MOCK_MIDFIELDERS.find(m => {
        const n1 = normalizeName(m.name);
        const n2 = normalizeName(name);
        return n1 === n2 || n1.includes(n2) || n2.includes(n1);
    });
    if (midfielder && midfielder.imageUrl) {
        return midfielder.imageUrl;
    }

    const googleKey = localStorage.getItem('google_search_key');
    const googleCx = localStorage.getItem('google_search_cx');

    const query = `${name} ${topic}`;


    // 1. BYOK: If user provided their own key, use it directly (bypasses limits)
    if (googleKey && googleCx) {
        const googleImage = await fetchGoogleImage(query, googleKey, googleCx);
        if (googleImage) return googleImage;
        return ""; // Fallback to empty to trigger neon grid
    }

    // 2. TIER 2/3: Fetch via Secure Backend
    try {
        const vipPassword = localStorage.getItem('llm_api_key') || ''; // The password field
        const response = await fetch('/api/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-vip-password': vipPassword,
            },
            body: JSON.stringify({
                type: 'image',
                query
            })
        });

        if (!response.ok) {
            console.warn("Backend Image API exhausted or failed", response.status);
            return ""; // Fallback to neon grid placeholder
        }

        const data = await response.json();
        return data.imageUrl || "";
    } catch (error) {
        console.error("Backend Image API network error:", error);
        return ""; // Fallback to neon grid placeholder
    }
};
