import { useGameStore } from '../store/gameStore';

export const fetchGoogleImage = async (
    query: string,
    apiKey: string,
    searchEngineId: string
): Promise<string | null> => {
    try {
        const url = `https://www.googleapis.com/customsearch/v1?q=${encodeURIComponent(query)}&cx=${searchEngineId}&key=${apiKey}&searchType=image&num=1&safe=active`;

        const response = await fetch(url);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.warn("Google Image Search API Error:", errorData);
            
            // Set error in store if not already set
            const currentError = useGameStore.getState().error;
            if (!currentError) {
                const errDetail = errorData.error?.message || '';
                const errReason = errorData.error?.errors?.[0]?.reason || '';
                let alertMsg = "Your custom Google Search Key is currently unavailable. Falling back to retro neon grids!";
                
                if (response.status === 429 || errDetail.toLowerCase().includes("quota") || errReason.toLowerCase().includes("limitexceeded")) {
                    alertMsg = "Your custom Google Search Key has exceeded its daily quota limit. Candidates will display retro neon grids!";
                } else if (response.status === 403 || errReason.toLowerCase().includes("invalid") || errReason.toLowerCase().includes("keyinvalid")) {
                    alertMsg = "Your custom Google Search Key is invalid or unconfigured. Please check settings!";
                }
                useGameStore.getState().setError(alertMsg);
            }
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
        const apiUrl = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
            ? 'https://brackets-jet.vercel.app/api/generate'
            : '/api/generate';
        const response = await fetch(apiUrl, {
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
            // Only set a notice if there isn't one already active
            const currentError = useGameStore.getState().error;
            if (!currentError) {
                const errorData = await response.json().catch(() => ({}));
                const errText = errorData.error || '';
                let alertMsg = `Candidate image loading failed (${response.status}). Falling back to retro neon grids!`;
                
                if (response.status === 429 || errText.includes("Quota Exceeded")) {
                    alertMsg = "Server Google Search quota exceeded for this hour. Candidates will display retro neon grids!";
                } else if (response.status === 500 && errText.includes("API configuration")) {
                    alertMsg = "Server is missing Google Search API configuration. Candidates will display retro neon grids!";
                } else if (errText) {
                    alertMsg = `Server Google Search failed: ${errText}. Candidates will display retro neon grids!`;
                }
                useGameStore.getState().setError(alertMsg);
            }
            return ""; // Fallback to neon grid placeholder
        }

        const data = await response.json();
        return data.imageUrl || "";
    } catch (error) {
        console.error("Backend Image API network error:", error);
        return ""; // Fallback to neon grid placeholder
    }
};
