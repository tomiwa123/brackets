import { getCandidateImage as getAIImage } from './llm';

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

export const getCandidateImage = async (
    name: string,
    topic: string
): Promise<string> => {
    const googleKey = localStorage.getItem('google_search_key');
    const googleCx = localStorage.getItem('google_search_cx');

    if (googleKey && googleCx) {
        const googleImage = await fetchGoogleImage(`${name} ${topic}`, googleKey, googleCx);
        if (googleImage) return googleImage;
    }

    // Fallback to AI generation
    return getAIImage(name, topic);
};
