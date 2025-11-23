
import React from 'react';
import { SunIcon, MoonIcon, VolumeUpIcon, VolumeOffIcon } from '../constants';

interface HeaderProps {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  isSoundOn: boolean;
  toggleSound: () => void;
  playbackSpeed: number;
  togglePlaybackSpeed: () => void;
}

const Header: React.FC<HeaderProps> = ({ isDarkMode, toggleDarkMode, isSoundOn, toggleSound, playbackSpeed, togglePlaybackSpeed }) => {
  const ToggleButton: React.FC<{onClick: () => void; isEnabled?: boolean; icon?: React.ReactNode; label: string; text?: string}> = 
  ({ onClick, isEnabled, icon, label, text }) => (
    <button
        onClick={onClick}
        className={`p-2 rounded-full flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary dark:focus:ring-offset-gray-900 transition-colors ${text ? 'w-10 h-10 font-bold text-sm' : ''}`}
        aria-label={label}
        title={label}
      >
        {icon}
        {text && <span>{text}</span>}
      </button>
  );

  return (
    <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm sticky top-0 z-10 shadow-md">
      <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
             {/* Changed from AI News to MoATalk as requested */}
             <span className="font-bold text-xl text-primary dark:text-primary-dark">MoATalk</span>
          </div>
          <div className="flex items-center space-x-2">
            <ToggleButton 
              onClick={togglePlaybackSpeed}
              text={`${playbackSpeed}x`}
              label="재생 속도 변경"
            />
            <ToggleButton 
              onClick={toggleSound}
              isEnabled={isSoundOn}
              icon={isSoundOn ? <VolumeUpIcon className="w-6 h-6" /> : <VolumeOffIcon className="w-6 h-6 text-red-500" />}
              label={isSoundOn ? '소리 끄기' : '소리 켜기'}
            />
            <ToggleButton
              onClick={toggleDarkMode}
              isEnabled={isDarkMode}
              icon={isDarkMode ? <SunIcon className="w-6 h-6" /> : <MoonIcon className="w-6 h-6" />}
              label={isDarkMode ? '라이트 모드로 변경' : '다크 모드로 변경'}
            />
          </div>
        </div>
      </nav>
    </header>
  );
};

export default Header;
