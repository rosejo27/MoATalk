import React, { useEffect, useMemo } from 'react';
import useSpeechRecognition from '../hooks/useSpeechRecognition';
import { MicIcon } from '../constants';

interface SearchBarProps {
  onSearch: (query: string) => void;
  isLoading: boolean;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

// 디바운스 함수
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

const SearchBar: React.FC<SearchBarProps> = ({ 
  onSearch, 
  isLoading, 
  searchQuery, 
  setSearchQuery 
}) => {
  const {
    isListening,
    transcript,
    startListening,
    stopListening,
    isSupported
  } = useSpeechRecognition();

  // 음성 입력용 디바운스된 검색 (타이핑보다 긴 대기시간)
  const debouncedVoiceSearch = useMemo(
    () => debounce((text: string) => {
      if (text.trim()) {
        onSearch(text);
      }
    }, 1000), // 1초 대기 (음성 입력이 완전히 끝난 후 검색)
    [onSearch]
  );

  useEffect(() => {
    if (transcript) {
      setSearchQuery(transcript);
      debouncedVoiceSearch(transcript);
    }
  }, [transcript, setSearchQuery, debouncedVoiceSearch]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onSearch(searchQuery);
    }
  };

  const handleMicClick = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative max-w-2xl mx-auto">
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        onFocus={() => setSearchQuery('')}
        placeholder="궁금한 뉴스를 검색하세요..."
        className="w-full pl-4 pr-24 py-3 text-lg border-2 border-gray-300 dark:border-gray-600 rounded-full focus:ring-primary focus:border-primary dark:bg-gray-800 transition-all duration-300"
        disabled={isLoading || isListening}
      />
      <div className="absolute inset-y-0 right-2 flex items-center space-x-1">
        {isSupported && (
          <button
            type="button"
            onClick={handleMicClick}
            className={`p-2 rounded-full transition-colors ${
              isListening 
                ? 'bg-red-500 text-white animate-pulse' 
                : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
            disabled={isLoading}
            aria-label="음성으로 검색"
            title={isListening ? '음성 인식 중...' : '음성으로 검색'}
          >
            <MicIcon className="w-6 h-6" />
          </button>
        )}
        <button
          type="submit"
          className="px-6 py-2 bg-primary text-white font-semibold rounded-full hover:bg-primary-dark disabled:bg-gray-400 dark:disabled:bg-gray-600 transition-colors"
          disabled={isLoading || !searchQuery.trim()}
        >
          {isLoading ? '검색중...' : '검색'}
        </button>
      </div>
    </form>
  );
};

export default SearchBar;
