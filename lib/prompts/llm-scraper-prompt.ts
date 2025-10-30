export const LLM_SCRAPER_PROMPT = (normalizedWord: string) => `Provide the SAT vocabulary definition for the word "${normalizedWord}". Focus on the meaning commonly tested on the SAT exam, not technical or obscure definitions. Return a JSON object with these fields:
- definition: clear SAT-focused definition of the word
- partOfSpeech: noun, verb, adjective, etc.
- example: sentence showing usage (preferably in academic or literary context)
- synonyms: array of similar words (empty array if none)
- antonyms: array of opposite words (empty array if none)
- phonetic: pronunciation guide (empty string if unknown)
- etymology: word origin (empty string if unknown)
- difficulty: "easy", "medium", or "hard"

IMPORTANT: 
- For words with multiple meanings, prioritize the SAT vocabulary context
- Avoid technical definitions (e.g., for "abstract" use "theoretical" not "summary of research paper")
- Focus on meanings that would appear in academic reading, literature, or SAT prep materials

Example response format:
{
  "definition": "existing in thought or as an idea rather than as a physical reality; theoretical",
  "partOfSpeech": "adjective",
  "example": "She had abstract ideas about how society should be reformed.",
  "synonyms": ["theoretical", "conceptual", "intellectual"],
  "antonyms": ["concrete", "tangible", "practical"],
  "phonetic": "/ˈæbˌstrækt/",
  "etymology": "from Latin abstractus 'drawn away'",
  "difficulty": "medium"
}`;
