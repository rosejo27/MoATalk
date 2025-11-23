
import React from 'react';

const LoadingSpinner: React.FC = () => (
  <div className="flex flex-col items-center justify-center space-y-4 my-10">
    <div className="w-16 h-16 border-4 border-primary border-t-transparent dark:border-primary-dark dark:border-t-transparent rounded-full animate-spin"></div>
    <p className="text-gray-600 dark:text-gray-400">AI가 최신 뉴스를 요약하고 있습니다...</p>
  </div>
);

export default LoadingSpinner;
