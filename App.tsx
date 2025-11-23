import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Header from './components/Header';
import SearchBar from './components/SearchBar';
import ResultsDisplay from './components/ResultsDisplay';
import LoadingSpinner from './components/LoadingSpinner';
import Recommendations from './components/Recommendations';
import { fetchNewsSummary } from './services/geminiService';
import { type NewsSummary, type AppData } from './types';
import useSpeechSynthesis from './hooks/useSpeechSynthesis';

// ========== 디바운스 함수 ==========
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

const App: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });
  const [isSoundOn, setIsSoundOn] = useState<boolean>(true); 
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [appData, setAppData] = useState<AppData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [currentlyPlayingTitle, setCurrentlyPlayingTitle] = useState<string | null>(null);
  const [isAutoPlaying, setIsAutoPlaying] = useState<boolean>(false);

  // ========== 캐싱 시스템 ==========
  const searchCache = useRef<Map<string, {
    data: AppData;
    timestamp: number;
  }>>(new Map());
  const CACHE_DURATION = 5 * 60 * 1000; // 5분

  const { speak, cancel, isSpeaking } = useSpeechSynthesis();
  const resultsRef = useRef<HTMLDivElement>(null);
  const autoPlayQueue = useRef<NewsSummary[]>([]);
  const isAutoPlayingRef = useRef(false);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  useEffect(() => {
    if (!isSoundOn && isSpeaking) {
        cancel();
        setCurrentlyPlayingTitle(null);
        isAutoPlayingRef.current = false;
        setIsAutoPlaying(false);
        autoPlayQueue.current = [];
    }
  }, [isSoundOn, isSpeaking, cancel]);

  const togglePlaybackSpeed = () => {
    setPlaybackSpeed(prev => {
        if (prev === 1.0) return 1.2;
        if (prev === 1.2) return 1.5;
        return 1.0;
    });
  };

  const playNextInQueue = useCallback(() => {
    if (!isSoundOn) {
        isAutoPlayingRef.current = false;
        setIsAutoPlaying(false);
        setCurrentlyPlayingTitle(null);
        return;
    }

    if (autoPlayQueue.current.length > 0 && isAutoPlayingRef.current) {
        const summaryToPlay = autoPlayQueue.current.shift();
        if (summaryToPlay) {
            const index = (appData?.summaries.indexOf(summaryToPlay) ?? -1) + 1;
            const numberWords = ["첫 번째", "두 번째", "세 번째", "네 번째", "다섯 번째", "여섯 번째", "일곱 번째"];
            const numberText = index > 0 && index <= numberWords.length ? `${numberWords[index-1]} 이슈입니다.` : '';
            
            setCurrentlyPlayingTitle(summaryToPlay.title);
            speak(`${numberText} ${summaryToPlay.title}. ${summaryToPlay.summary}`, playbackSpeed, playNextInQueue, !isSoundOn);
        }
    } else {
        setCurrentlyPlayingTitle(null);
        isAutoPlayingRef.current = false;
        setIsAutoPlaying(false);
    }
  }, [speak, appData?.summaries, isSoundOn, playbackSpeed]);

  const startAutoPlay = useCallback(() => {
    if (!appData || !appData.summaries.length || !isSoundOn) return;
    
    if (isSpeaking) cancel();
    
    autoPlayQueue.current = [...appData.summaries];
    isAutoPlayingRef.current = true;
    setIsAutoPlaying(true);
    playNextInQueue();
  }, [appData, isSoundOn, isSpeaking, cancel, playNextInQueue]);

  const stopAutoPlay = useCallback(() => {
    cancel();
    autoPlayQueue.current = [];
    isAutoPlayingRef.current = false;
    setIsAutoPlaying(false);
    setCurrentlyPlayingTitle(null);
  }, [cancel]);

  const handleToggleAutoPlay = () => {
      if (isAutoPlaying) {
          stopAutoPlay();
      } else {
          startAutoPlay();
      }
  };

  useEffect(() => {
    if (appData && appData.summaries.length > 0 && isSoundOn) {
        startAutoPlay();
    }
    return () => {
      if (isSpeaking) cancel();
      isAutoPlayingRef.current = false;
      autoPlayQueue.current = [];
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appData]);

  // ========== 실제 검색 로직 (캐싱 포함) ==========
  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) return;

    const normalizedQuery = query.trim().toLowerCase();

    // 1. 캐시 확인
    const cached = searchCache.current.get(normalizedQuery);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log('✅ 캐시에서 결과 로드:', normalizedQuery);
      setAppData(cached.data);
      setIsLoading(false);
      return;
    }

    // 2. 캐시 없으면 API 호출
    stopAutoPlay();
    setIsLoading(true);
    setError(null);
    setAppData(null);

    try {
      console.log('🔄 API 호출 중:', normalizedQuery);
      const data = await fetchNewsSummary(query);
      
      // 캐시에 저장
      searchCache.current.set(normalizedQuery, {
        data,
        timestamp: Date.now()
      });

      // 캐시 크기 제한 (최대 20개)
      if (searchCache.current.size > 20) {
        const firstKey = searchCache.current.keys().next().value;
        searchCache.current.delete(firstKey);
      }

      setAppData(data);
    } catch (err) {
      setError('뉴스 정보를 가져오는 데 실패했습니다. 잠시 후 다시 시도해 주세요.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [stopAutoPlay]);

  // ========== 디바운스된 검색 함수 ==========
  const debouncedSearch = useMemo(
    () => debounce(performSearch, 600),
    [performSearch]
  );

  const handleSearch = useCallback((query: string) => {
    if (!query.trim()) return;
    
    // 로딩 상태는 즉시 표시
    setIsLoading(true);
    
    // 실제 검색은 디바운스
    debouncedSearch(query);
  }, [debouncedSearch]);

  const handleTogglePlay = (summary: NewsSummary) => {
    if (!isSoundOn) return;

    const isCurrentlyPlayingThis = currentlyPlayingTitle === summary.title;

    if (isCurrentlyPlayingThis) {
        cancel();
        setCurrentlyPlayingTitle(null);
        if (isAutoPlayingRef.current) {
            isAutoPlayingRef.current = false;
            autoPlayQueue.current = [];
            setIsAutoPlaying(false);
        }
        return;
    }

    cancel();
    if (isAutoPlayingRef.current) {
        isAutoPlayingRef.current = false;
        autoPlayQueue.current = [];
        setIsAutoPlaying(false);
    }

    const textToRead = `${summary.title}. ${summary.summary}`;
    setCurrentlyPlayingTitle(summary.title);
    
    speak(textToRead, playbackSpeed, () => {
        setCurrentlyPlayingTitle(prev => prev === summary.title ? null : prev);
    }, !isSoundOn);
  };
  
  const handleRecommendationClick = (topic: string) => {
    setSearchQuery(topic);
    handleSearch(topic);
    if(resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 font-sans transition-colors duration-300">
      <Header
        isDarkMode={isDarkMode}
        toggleDarkMode={() => setIsDarkMode(prev => !prev)}
        isSoundOn={isSoundOn}
        toggleSound={() => setIsSoundOn(prev => !prev)}
        playbackSpeed={playbackSpeed}
        togglePlaybackSpeed={togglePlaybackSpeed}
      />
      <main className="container mx-auto p-4 md:p-6 max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-primary dark:text-primary-dark">AI News Brief</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">네이버 뉴스를 분석하여 핵심 이슈를 요약해드립니다.</p>
        </div>

        <SearchBar
          onSearch={handleSearch}
          isLoading={isLoading}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />

        {appData && appData.recommendations.length > 0 && !isLoading && (
            <div className="mt-6 max-w-2xl mx-auto opacity-0 animate-fadeIn" style={{ animationDelay: `150ms` }}>
                <Recommendations
                    topics={appData.recommendations}
                    onTopicClick={handleRecommendationClick}
                />
            </div>
        )}

        <div ref={resultsRef} className="mt-8">
          {isLoading && <LoadingSpinner />}
          {error && <p className="text-center text-red-500 bg-red-100 dark:bg-red-900/50 p-4 rounded-lg">{error}</p>}
          {appData && (
            <ResultsDisplay 
              summaries={appData.summaries}
              onTogglePlay={handleTogglePlay}
              currentlyPlayingTitle={currentlyPlayingTitle}
              isAutoPlaying={isAutoPlaying}
              onToggleAutoPlay={handleToggleAutoPlay}
            />
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
