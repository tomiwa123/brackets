import type { Candidate } from '../types';
import { generateWithLLM } from './llm';

const MOCK_REPTILES: Candidate[] = [
    { id: '1', name: 'Komodo Dragon', seed: 1, bio: 'The largest living lizard species, known for its venomous bite and strength.' },
    { id: '2', name: 'Saltwater Crocodile', seed: 2, bio: 'The largest living reptile, a formidable predator of the waterways.' },
    { id: '3', name: 'King Cobra', seed: 3, bio: 'The world\'s longest venomous snake, famous for its hood and potent venom.' },
    { id: '4', name: 'Galapagos Tortoise', seed: 4, bio: 'Giant tortoises known for their long lifespan and massive size.' },
    { id: '5', name: 'Green Iguana', seed: 5, bio: 'A large, arboreal, mostly herbivorous species of lizard.' },
    { id: '6', name: 'Boa Constrictor', seed: 6, bio: 'A large, non-venomous, heavy-bodied snake that constricts its prey.' },
    { id: '7', name: 'Chameleon', seed: 7, bio: 'Known for their ability to change color and their long, sticky tongues.' },
    { id: '8', name: 'Gecko', seed: 8, bio: 'Small to average sized lizards found in warm climates throughout the world.' },
    { id: '9', name: 'Monitor Lizard', seed: 9, bio: 'Large lizards native to Africa, Asia, and Oceania.' },
    { id: '10', name: 'Gila Monster', seed: 10, bio: 'A species of venomous lizard native to the southwestern United States.' },
    { id: '11', name: 'Python', seed: 11, bio: 'A family of nonvenomous snakes found in Africa, Asia, and Australia.' },
    { id: '12', name: 'Alligator', seed: 12, bio: 'Large crocodilians in the genus Alligator of the family Alligatoridae.' },
    { id: '13', name: 'Turtle', seed: 13, bio: 'Reptiles with a special bony or cartilaginous shell developed from their ribs.' },
    { id: '14', name: 'Skink', seed: 14, bio: 'Lizards belonging to the family Scincidae, one of the most diverse families.' },
    { id: '15', name: 'Anole', seed: 15, bio: 'A family of lizards native to the Americas.' },
    { id: '16', name: 'Viper', seed: 16, bio: 'A family of venomous snakes found in most parts of the world.' },
];

export const generateCandidates = async (topic: string): Promise<Candidate[]> => {
    const apiKey = localStorage.getItem('llm_api_key');
    const provider = (localStorage.getItem('llm_provider') as 'gemini' | 'openai') || 'gemini';

    if (apiKey) {
        try {
            console.log(`Generating candidates for topic: ${topic} using ${provider}`);
            return await generateWithLLM(topic, provider, apiKey);
        } catch (error: any) {
            console.error("Failed to generate with LLM, falling back to mock.", error);
            const errorMessage = error?.message || "Unknown error";
            alert(`Failed to generate with AI: ${errorMessage}\n\nCheck your API key and try again. Falling back to mock data.`);
        }
    } else {
        console.log("No API key found, using mock data.");
    }

    // Simulate API delay for mock
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Return mock data (maybe shuffle names slightly if we wanted, but keeping simple)
    return MOCK_REPTILES;
};
