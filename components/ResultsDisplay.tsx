import React from 'react';
import { type NewsSummary } from '../types';
import ResultCard from './ResultCard';
import { PlayIcon, StopIcon } from '../constants';

interface ResultsDisplayProps {
  summaries: NewsSummary[];
  onTogglePlay: (summary: NewsSummary) => void;
  currentlyPlayingTitle: string | null;
  isAutoPlaying: boolean;
  onToggleAutoPlay: () => void;
}

const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ 
  summaries, 
  onTogglePlay, 
  currentlyPlayingTitle, 
  isAutoPlaying, 
  onToggleAutoPlay 
}) => {
  return (
    <div className="space-y-6">
       {/* Play All / Stop All Button */}
      <div className="flex justify-end opacity-0 animate-fadeIn" style={{ animationDelay: '100ms' }}>
        <button
          onClick={onToggleAutoPlay}
          className={`flex items-center space-x-2 px-4 py-2 rounded-full font-medium shadow-md transition-all transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary dark:focus:ring-offset-gray-900 ${
            isAutoPlaying 
              ? 'bg-red-500 hover:bg-red-600 text-white' 
              : 'bg-primary hover:bg-primary-dark text-white'
          }`}
        >
          {isAutoPlaying ? (
            <>
              <StopIcon className="w-5 h-5" />
              <span>전체 정지</span>
            </>
          ) : (
            <>
              <PlayIcon className="w-5 h-5" />
              <span>전체 듣기</span>
            </>
          )}
        </button>
      </div>

      <div className="space-y-6">
        {summaries.map((summary, index) => (
          <div key={index} style={{ animationDelay: `${(index + 1) * 150}ms` }} className="opacity-0 animate-fadeIn">
            <ResultCard 
              summary={summary} 
              onTogglePlay={onTogglePlay}
              isPlaying={summary.title === currentlyPlayingTitle}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default ResultsDisplay;