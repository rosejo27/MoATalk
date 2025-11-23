
import React, { useEffect } from 'react';
import useSpeechRecognition from '../hooks/useSpeechRecognition';
import { MicIcon } from '../constants';

interface SearchBarProps {
  onSearch: (query: string) => void;
  isLoading: boolean;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ onSearch, isLoading, searchQuery, setSearchQuery }) => {
  const {
    isListening,
    transcript,
    startListening,
    stopListening,
    isSupported
  } = useSpeechRecognition();

  useEffect(() => {
    if (transcript) {
      setSearchQuery(transcript);
      onSearch(transcript);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transcript]);
  
  useEffect(() => {
    if(!isListening && searchQuery){
        // Do nothing, let user trigger search manually after editing
    }
  }, [isListening, onSearch, searchQuery]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchQuery);
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
        onFocus={() => setSearchQuery('')} // Search bar clears on click/focus
        placeholder="궁금한 뉴스를 검색하세요..."
        className="w-full pl-4 pr-24 py-3 text-lg border-2 border-gray-300 dark:border-gray-600 rounded-full focus:ring-primary focus:border-primary dark:bg-gray-800 transition-all duration-300"
        disabled={isLoading || isListening}
      />
      <div className="absolute inset-y-0 right-2 flex items-center space-x-1">
        {isSupported && (
          <button
            type="button"
            onClick={handleMicClick}
            className={`p-2 rounded-full transition-colors ${isListening ? 'bg-red-500 text-white animate-pulse' : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
            disabled={isLoading}
            aria-label="Search with voice"
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
