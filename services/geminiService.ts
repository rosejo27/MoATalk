import { GoogleGenAI } from "@google/genai";
import { type AppData, type NewsSummary } from '../types';
import { CATEGORY_IMAGES } from '../constants';

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

    **IMAGE & CATEGORY**:
    1. **Category**: Classify the news into one of: 'Politics', 'Economy', 'Society', 'World', 'Tech', 'Sports', 'Entertainment', 'Culture'.
    2. **Image URL**: If the search tool provides a high-quality image URL for the article, include it as 'searchImageUrl'. Otherwise leave empty.

    **Output JSON Format:**
    {
      "summaries": [
        {
          "title": "Clean Korean Headline (No [Exclusive] tags)",
          "summary": "Korean summary (2-3 sentences).",
          "category": "Politics",
          "searchImageUrl": "https://...",
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
            // 이미지 선택 로직:
            // 1. 검색 결과에 이미지가 있으면 사용 (가장 빠르고 정확함)
            // 2. 없으면 카테고리별 정적 이미지 사용 (캐싱되어 빠름)
            let imageUrl = item.searchImageUrl;

            if (!imageUrl || imageUrl.length < 10) {
                const category = item.category || 'Default';
                // 카테고리가 매칭되지 않으면 Default 사용
                imageUrl = CATEGORY_IMAGES[category] || CATEGORY_IMAGES['Default'];
            }

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
