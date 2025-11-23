import { GoogleGenAI } from "@google/genai";
import { type AppData, type NewsSummary } from '../types';

/**
 * 문자열을 안정적인 해시값으로 변환 (간단한 해시 함수)
 */
function simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
}

/**
 * Fetches and summarizes news articles based on a query using the Gemini API.
 * Uses Google Search Tool for accurate links and grounding.
 * @param query The user's search query.
 * @returns A promise that resolves to the structured news data.
 */
export const fetchNewsSummary = async (query: string): Promise<AppData> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const today = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });

    const prompt = `
    You are a precise news aggregator for Korean users.
    Current Date: ${today}
    User Query: "${query}"

    **OBJECTIVE**:
    Use the 'googleSearch' tool to find the latest facts relevant to the query and date. 
    Return a JSON object containing summaries of **5 distinct** major news articles.

    **STRICT RULES FOR LINKS (CRITICAL for preventing 404s):**
    1. **SOURCE TRUTH**: You MUST use the 'googleSearch' tool results.
    2. **EXACT URL COPY**: The 'url' field in your JSON **MUST** be an exact character-for-character copy of the 'uri' provided by the search tool. 
       - **DO NOT** remove query parameters (e.g., '?sid=101', '&oid=...').
       - **DO NOT** shorten the URL.
       - **DO NOT** guess URLs. If the tool doesn't give a URL, do not invent one.
    3. **VALIDITY**: Prioritize links from major news outlets (Naver News, Yonhap, KBS, MBC, SBS, JTBC) that were published recently (within 24-48 hours if possible).
    4. **CONTENT MATCH**: The 'summary' MUST be based **ONLY** on the content of that specific 'url'.

    **IMAGE PROMPTS**:
    - Provide exactly **2 simple English nouns** for 'imageKeywords' (e.g., "storm car", "diplomat handshake"). Keep it extremely simple for fast generation.

    **Output JSON Format:**
    {
      "summaries": [
        {
          "title": "Clean Korean Headline (No [Exclusive] tags)",
          "summary": "Korean summary (2-3 sentences).",
          "imageKeywords": "noun1 noun2",
          "relatedArticles": [
            {
              "headline": "Original Headline",
              "url": "EXACT_URI_FROM_SEARCH_TOOL_DO_NOT_CHANGE"
            }
          ]
        }
      ],
      "recommendations": ["RelatedKeyword1", "RelatedKeyword2", "RelatedKeyword3"]
    }

    **IMPORTANT**: return ONLY the JSON string. No markdown, no intro text.
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
            },
        });
        
        const text = response.text || "{}";
        
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        const jsonStr = jsonMatch ? jsonMatch[0] : "{}";

        const rawData = JSON.parse(jsonStr);
        
        if (!rawData.summaries || !Array.isArray(rawData.summaries)) {
             throw new Error("Invalid Data Format");
        }

        const summaries: NewsSummary[] = rawData.summaries.map((item: any) => {
            const keywords = item.imageKeywords || 'news';
            const encodedPrompt = encodeURIComponent(keywords);
            
            // ========== 개선: 안정적인 시드값으로 이미지 캐싱 가능 ==========
            // 제목을 기반으로 한 해시값을 시드로 사용 (같은 제목 = 같은 이미지)
            const stableSeed = simpleHash(item.title + keywords);
            
            // 이미지 크기 최적화: 400x300 유지 (빠른 로딩)
            const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=400&height=300&nologo=true&seed=${stableSeed}`;

            const links = Array.isArray(item.relatedArticles) 
                ? item.relatedArticles
                    .filter((article: any) => {
                        if (!article.url || !article.url.startsWith('http')) return false;
                        
                        const url = article.url;
                        const badDomains = [
                            'namu.wiki', 
                            'wikipedia.org',
                            'youtube.com',
                            'facebook.com',
                            'instagram.com',
                            'twitter.com',
                            'x.com',
                            'tistory.com',
                            'blog.naver.com'
                        ];
                        
                        if (badDomains.some(domain => url.includes(domain))) return false;

                        return true;
                    })
                    .map((article: any) => ({
                        title: article.headline || "관련 기사 보기",
                        url: article.url
                    }))
                : [];

            return {
                title: item.title,
                summary: item.summary,
                imageUrl: imageUrl,
                links: links
            };
        }).filter((item: NewsSummary) => item.links.length > 0);

        return {
            summaries: summaries,
            recommendations: rawData.recommendations || []
        };

    } catch (e) {
        console.error("Gemini API Error:", e);
        throw new Error("뉴스 정보를 가져오는데 실패했습니다. 잠시 후 다시 시도해주세요.");
    }
};
