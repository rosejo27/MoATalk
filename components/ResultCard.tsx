
import React, { useState } from 'react';
import { type NewsSummary } from '../types';
import { PlayIcon, StopIcon, ExternalLinkIcon } from '../constants';

interface ResultCardProps {
  summary: NewsSummary;
  onTogglePlay: (summary: NewsSummary) => void;
  isPlaying: boolean;
}

const ResultCard: React.FC<ResultCardProps> = ({ summary, onTogglePlay, isPlaying }) => {
  const [isImageLoaded, setIsImageLoaded] = useState(false);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-2xl hover:scale-[1.02]">
      <div className="p-4 md:flex items-start">
        {/* Image Container: Added background color and skeleton loader */}
        <div className="md:flex-shrink-0 relative mt-3 md:mt-4 rounded-xl overflow-hidden w-full md:w-48 h-48 bg-gray-200 dark:bg-gray-700">
          {!isImageLoaded && (
            <div className="absolute inset-0 animate-pulse bg-gray-300 dark:bg-gray-600" />
          )}
          <img 
            className={`h-full w-full object-cover transition-opacity duration-500 ${isImageLoaded ? 'opacity-100' : 'opacity-0'}`}
            src={summary.imageUrl} 
            alt="뉴스 썸네일" 
            loading="lazy"
            onLoad={() => setIsImageLoaded(true)}
          />
        </div>
        <div className="mt-4 md:mt-0 md:ml-6 flex-grow">
          <div className="flex justify-between items-start">
            <h3 className="text-xl leading-tight font-bold text-black dark:text-white mr-4">{summary.title}</h3>
            <button
              onClick={() => onTogglePlay(summary)}
              className={`flex-shrink-0 p-2 rounded-full text-white ${isPlaying ? 'bg-gray-500 hover:bg-gray-600' : 'bg-primary hover:bg-primary-dark'} transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary dark:focus:ring-offset-gray-800`}
              aria-label={isPlaying ? `${summary.title} 요약 읽기 중지` : `${summary.title} 요약 읽기`}
            >
              {isPlaying ? <StopIcon className="w-5 h-5" /> : <PlayIcon className="w-5 h-5" />}
            </button>
          </div>
          <p className="mt-3 text-gray-600 dark:text-gray-300 leading-relaxed">{summary.summary}</p>
        </div>
      </div>
      <div className="px-6 pb-5 pt-0 md:pl-[calc(12rem+2.5rem)]"> {/* Align links with text content on desktop */}
        {summary.links.length > 0 && (
            <>
                <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">관련 기사</h4>
                <div className="space-y-2">
                {summary.links.map((link, index) => (
                    <a
                    key={index}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center text-sm text-primary dark:text-primary-dark hover:underline group"
                    >
                    <ExternalLinkIcon className="w-4 h-4 mr-2 flex-shrink-0 group-hover:scale-110 transition-transform" />
                    <span className="truncate">{link.title}</span>
                    </a>
                ))}
                </div>
            </>
        )}
      </div>
    </div>
  );
};

export default ResultCard;
