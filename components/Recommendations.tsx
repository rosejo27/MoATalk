
import React from 'react';

interface RecommendationsProps {
  topics: string[];
  onTopicClick: (topic: string) => void;
}

const Recommendations: React.FC<RecommendationsProps> = ({ topics, onTopicClick }) => {
  return (
    <div className="bg-white dark:bg-gray-800/50 p-4 rounded-xl shadow-md">
      <h3 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-200">추천 검색어</h3>
      <div className="flex flex-wrap gap-2">
        {topics.map((topic, index) => (
          <button
            key={index}
            onClick={() => onTopicClick(topic)}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm font-medium hover:bg-primary hover:text-white dark:hover:bg-primary-dark dark:hover:text-white transition-colors duration-200"
          >
            # {topic}
          </button>
        ))}
      </div>
    </div>
  );
};

export default Recommendations;
