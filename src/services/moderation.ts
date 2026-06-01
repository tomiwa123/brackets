/**
 * Content Moderation Helper
 * Performs fast, client-side pre-filtering on tournament topics to intercept
 * inappropriate content instantly without calling external APIs or burning credits.
 */

// A collection of basic regex patterns and exact words covering:
// 1. Hate speech / severe slurs
// 2. Explicit / pornographic content
// 3. Extreme violence / self-harm
const INAPPROPRIATE_PATTERNS = [
    // Hate speech & severe slurs
    /\b(nigger|nigga|chink|kike|spic|faggot|dyke|retard|cunt|slut|whore|bitch|bastard|asshole)\b/i,
    
    // Standard swear words / vulgar expressions
    /\b(fuck|fucking|fucker|shit|shitting|crap|ass)\b/i,
    
    // Explicit / sexual content
    /\b(porn|pornography|hentai|orgied|gangbang|milf|dildo|butt plug|erotic|nsfw|cybersex|blowjob|cunnilingus|deepthroat)\b/i,
    /\b(cock|penis|vagina|clitoris|testicles|scrotum|semen|cumshot|ejaculation)\b/i,
    
    // Extreme violence / self-harm / illicit acts
    /\b(suicide|kill myself|cutting myself|self harm|bombing|terrorism|terrorist|nazism|hitler|swastika|pedophilia|pedophile|rape|rapist|incest)\b/i,
];

// Normalize a topic string for accurate checks (removes accents/diacritics, excess punctuation, etc.)
const normalizeText = (text: string): string => {
    return text
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, "") // Remove special characters
        .trim();
};

export interface ModerationResult {
    isValid: boolean;
    reason?: string;
}

/**
 * Validates whether a given topic is appropriate for a tournament bracket.
 * @param topic The input topic string
 * @returns ModerationResult containing validity and optional warning reason
 */
export const checkTopicAppropriateness = (topic: string): ModerationResult => {
    if (!topic || !topic.trim()) {
        return { isValid: false, reason: "Topic cannot be empty." };
    }

    const normalized = normalizeText(topic);

    // 1. Check against length limits
    if (normalized.length < 2) {
        return { isValid: false, reason: "Topic is too short." };
    }
    if (topic.length > 100) {
        return { isValid: false, reason: "Topic is too long (Max 100 characters)." };
    }

    // 2. Check against inappropriate patterns
    for (const pattern of INAPPROPRIATE_PATTERNS) {
        if (pattern.test(topic) || pattern.test(normalized)) {
            return {
                isValid: false,
                reason: "🚨 SAFETY SHIELD ACTIVE: Topic contains terms that violate our community guidelines. Let's keep it friendly and fun!"
            };
        }
    }

    return { isValid: true };
};
