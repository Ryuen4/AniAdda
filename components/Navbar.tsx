
import React from 'react';
import { Home, Search, List, User, BookOpen, Languages, Sun, Moon } from 'lucide-react';
import { ViewState, LanguageDictionary } from '../types';
import { TRANSLATIONS } from '../constants';

interface NavbarProps {
  currentView: ViewState;
  setView: (view: ViewState) => void;
  lang: 'en' | 'bn';
  toggleLang: () => void;
  isDark: boolean;
  toggleTheme: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ currentView, setView, lang, toggleLang, isDark, toggleTheme }) => {
  const t = TRANSLATIONS;
  
  const navItems = [
    { id: 'HOME', icon: Home, label: t.home },
    { id: 'SEARCH', icon: Search, label: t.search },
    { id: 'LIST', icon: BookOpen, label: t.lists },
    { id: 'PROFILE', icon: User, label: t.profile },
  ];

  return (
    <>
      {/* Mobile Top Nav (Logo + Lang + Theme) */}
      <div className="md:hidden fixed top-0 w-full bg-paper/95 dark:bg-dark-bg/95 backdrop-blur z-50 px-4 py-3 border-b border-sakura-100 dark:border-dark-border flex justify-between items-center shadow-sm transition-colors duration-300">
        <div className="flex items-center gap-2" onClick={() => setView('HOME')}>
              <div className="w-8 h-8 rounded-full bg-sakura-500 flex items-center justify-center text-white font-bold text-sm">
                A
              </div>
              <span className="text-lg font-bold text-indigo-900 dark:text-indigo-100 tracking-tight">AniAdda</span>
        </div>
        <div className="flex items-center gap-1">
            <button onClick={toggleTheme} className="text-gray-600 dark:text-gray-300 hover:text-indigo-900 dark:hover:text-sakura-500 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-dark-card transition-colors">
                {isDark ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button onClick={toggleLang} className="text-gray-600 dark:text-gray-300 hover:text-indigo-900 dark:hover:text-sakura-500 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-dark-card transition-colors">
                <Languages size={20} />
            </button>
        </div>
      </div>

      {/* Desktop Top Nav */}
      <nav className="hidden md:flex fixed top-0 w-full bg-paper dark:bg-dark-bg bg-opacity-90 dark:bg-opacity-90 backdrop-blur-md border-b border-sakura-100 dark:border-dark-border z-50 px-6 py-4 justify-between items-center shadow-sm transition-colors duration-300">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('HOME')}>
          <div className="w-8 h-8 rounded-full bg-sakura-500 flex items-center justify-center text-white font-bold text-lg">
            A
          </div>
          <span className="text-xl font-bold text-indigo-900 dark:text-indigo-100 tracking-tight">AniAdda</span>
        </div>
        <div className="flex gap-6 items-center">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setView(item.id as ViewState)}
              className={`flex items-center gap-2 font-medium transition-colors ${
                currentView === item.id 
                  ? 'text-sakura-700 dark:text-sakura-500' 
                  : 'text-gray-500 dark:text-gray-400 hover:text-indigo-900 dark:hover:text-white'
              }`}
            >
              <item.icon size={20} />
              <span>{item.label[lang]}</span>
            </button>
          ))}
          <div className="h-5 w-px bg-gray-300 dark:bg-dark-border mx-2"></div>
          <div className="flex items-center gap-2">
              <button 
                  onClick={toggleTheme}
                  className="flex items-center gap-1 text-gray-500 dark:text-gray-400 hover:text-indigo-900 dark:hover:text-white font-medium text-sm transition-colors p-2 rounded-full hover:bg-gray-100 dark:hover:bg-dark-card"
                  title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
              >
                  {isDark ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <button 
                    onClick={toggleLang}
                    className="flex items-center gap-1 text-gray-500 dark:text-gray-400 hover:text-indigo-900 dark:hover:text-white font-medium text-sm transition-colors"
                >
                  <Languages size={18} />
                  {lang === 'en' ? 'বাংলা' : 'English'}
              </button>
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 w-full bg-paper dark:bg-dark-card border-t border-sakura-100 dark:border-dark-border pb-safe z-50 flex justify-around items-center py-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] transition-colors duration-300">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setView(item.id as ViewState)}
            className={`flex flex-col items-center gap-1 transition-colors ${
              currentView === item.id 
                ? 'text-sakura-700 dark:text-sakura-500' 
                : 'text-gray-400 dark:text-gray-500'
            }`}
          >
            <item.icon size={24} strokeWidth={currentView === item.id ? 2.5 : 2} />
            <span className="text-[10px] font-medium">{item.label[lang]}</span>
          </button>
        ))}
      </nav>
    </>
  );
};

export default Navbar;
