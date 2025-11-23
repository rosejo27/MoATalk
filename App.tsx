
import React, { useState, useEffect, useCallback, useRef } from 'react';
import Header from './components/Header';
import SearchBar from './components/SearchBar';
import ResultsDisplay from './components/ResultsDisplay';
import LoadingSpinner from './components/LoadingSpinner';
import Recommendations from './components/Recommendations';
import { fetchNewsSummary } from './services/geminiService';
import { type NewsSummary, type AppData } from './types';
import useSpeechSynthesis from './hooks/useSpeechSynthesis';

const App: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });
  // Acts as Master Sound Switch
  const [isSoundOn, setIsSoundOn] = useState<boolean>(true); 
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [appData, setAppData] = useState<AppData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [currentlyPlayingTitle, setCurrentlyPlayingTitle] = useState<string | null>(null);
  
  // State to track if we are in "Play All" mode for UI
  const [isAutoPlaying, setIsAutoPlaying] = useState<boolean>(false);

  const { speak, cancel, isSpeaking } = useSpeechSynthesis();
  const resultsRef = useRef<HTMLDivElement>(null);
  const autoPlayQueue = useRef<NewsSummary[]>([]);
  
  // Using a Ref for logic, but syncing with State for UI
  const isAutoPlayingRef = useRef(false);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Effect: If Sound is turned OFF while speaking, stop immediately.
  useEffect(() => {
    if (!isSoundOn && isSpeaking) {
        cancel();
        setCurrentlyPlayingTitle(null);
        isAutoPlayingRef.current = false;
        setIsAutoPlaying(false);
        autoPlayQueue.current = [];
    }
  }, [isSoundOn, isSpeaking, cancel]);

  // REMOVED: The useEffect that synced !isSpeaking with currentlyPlayingTitle.
  // It caused a race condition where state was reset before onstart fired.
  // We now rely on the onEnd callback of speak() to reset the state safely.

  const togglePlaybackSpeed = () => {
    setPlaybackSpeed(prev => {
        if (prev === 1.0) return 1.2;
        if (prev === 1.2) return 1.5;
        return 1.0;
    });
  };

  const playNextInQueue = useCallback(() => {
    // If sound is off, stop the queue
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
            // If speak fails immediately (e.g. error), the callback runs immediately.
            speak(`${numberText} ${summaryToPlay.title}. ${summaryToPlay.summary}`, playbackSpeed, playNextInQueue, !isSoundOn);
        }
    } else {
        // Queue finished
        setCurrentlyPlayingTitle(null);
        isAutoPlayingRef.current = false;
        setIsAutoPlaying(false);
    }
  }, [speak, appData?.summaries, isSoundOn, playbackSpeed]);

  // Trigger "Play All"
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

  // Initial Search Auto-play trigger (Only on first load of data)
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
  }, [appData]); // Run when appData changes (new search results)

  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) return;

    stopAutoPlay();
    setIsLoading(true);
    setError(null);
    setAppData(null);

    try {
      const data = await fetchNewsSummary(query);
      setAppData(data);
    } catch (err) {
      setError('뉴스 정보를 가져오는 데 실패했습니다. 잠시 후 다시 시도해 주세요.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [stopAutoPlay]);

  const handleTogglePlay = (summary: NewsSummary) => {
    if (!isSoundOn) return; // Do nothing if sound is muted

    const isCurrentlyPlayingThis = currentlyPlayingTitle === summary.title;

    // If we are currently playing THIS summary in the UI, treat it as a STOP command.
    if (isCurrentlyPlayingThis) {
        cancel();
        setCurrentlyPlayingTitle(null);
        // Also kill autoplay if it was active
        if (isAutoPlayingRef.current) {
            isAutoPlayingRef.current = false;
            autoPlayQueue.current = [];
            setIsAutoPlaying(false);
        }
        return;
    }

    // Otherwise, START playing this summary manually
    // First, stop anything else (including autoplay)
    cancel();
    if (isAutoPlayingRef.current) {
        isAutoPlayingRef.current = false;
        autoPlayQueue.current = [];
        setIsAutoPlaying(false);
    }

    const textToRead = `${summary.title}. ${summary.summary}`;
    setCurrentlyPlayingTitle(summary.title);
    
    speak(textToRead, playbackSpeed, () => {
        // Only reset if we are still the one playing (avoids race conditions)
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
