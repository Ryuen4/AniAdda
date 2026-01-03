
import React, { useState, useEffect, useMemo } from 'react';
import Navbar from './components/Navbar';
import MediaCard from './components/MediaCard';
import TrackingModal from './components/TrackingModal';
import StatsChart from './components/StatsChart';
import DetailsView from './components/DetailsView';
import { ViewState, MediaItem, ListEntry, UserStatus, SearchFilters, MediaType } from './types';
import { TRANSLATIONS, GENRES_LIST } from './constants';
import { Search, Loader2, X, SlidersHorizontal, ArrowUpNarrowWide, ArrowDownWideNarrow, AlertCircle, Zap } from 'lucide-react';
import { getTrendingMedia, getTopMedia, getUpcomingMedia, searchMedia, getMediaDetails, getAiringSchedule } from './services/apiService';
import type { ApiMediaType } from './services/apiService';

const PersistenceManager = {
  saveList: (list: ListEntry[]) => {
    try {
      localStorage.setItem('aniadda_list_v2', JSON.stringify(list));
    } catch (e) {
      console.error('Storage full or restricted:', e);
    }
  },
  loadList: (): ListEntry[] => {
    try {
      const data = localStorage.getItem('aniadda_list_v2');
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  },
  saveTheme: (isDark: boolean) => localStorage.setItem('aniadda_theme', isDark ? 'dark' : 'light'),
  loadTheme: () => {
    const saved = localStorage.getItem('aniadda_theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
};

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>('HOME');
  const [lang, setLang] = useState<'en' | 'bn'>('en');
  const [isDark, setIsDark] = useState(PersistenceManager.loadTheme());
  const [userList, setUserList] = useState<ListEntry[]>(PersistenceManager.loadList());
  const [error, setError] = useState<string | null>(null);
  
  const [showWelcome, setShowWelcome] = useState(() => !localStorage.getItem('aniadda_welcome_closed'));
  const [selectedMediaId, setSelectedMediaId] = useState<number | string | null>(null);
  const [selectedMediaType, setSelectedMediaType] = useState<MediaType>(MediaType.ANIME);
  const [activeMediaType, setActiveMediaType] = useState<ApiMediaType>('anime');
  const [homeTab, setHomeTab] = useState<'TRENDING' | 'TOP' | 'UPCOMING'>('TRENDING');
  const [homeData, setHomeData] = useState<MediaItem[]>([]);
  const [airingToday, setAiringToday] = useState<MediaItem[]>([]);
  const [searchData, setSearchData] = useState<MediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingAiring, setIsLoadingAiring] = useState(false);
  const [detailItem, setDetailItem] = useState<MediaItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({ type: 'all', status: 'all', sortBy: 'popularity', sortOrder: 'desc', includedGenres: [], excludedGenres: [] });
  const [showFilters, setShowFilters] = useState(false);
  const [listFilter, setListFilter] = useState<UserStatus | 'ALL'>('ALL');
  const [modalItem, setModalItem] = useState<MediaItem | null>(null);

  const t = TRANSLATIONS;

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    PersistenceManager.saveTheme(isDark);
  }, [isDark]);

  useEffect(() => {
    PersistenceManager.saveList(userList);
  }, [userList]);

  // Real-time airing schedule fetch
  useEffect(() => {
    const controller = new AbortController();
    const loadAiring = async () => {
      setIsLoadingAiring(true);
      try {
        const data = await getAiringSchedule(controller.signal);
        setAiringToday(data);
      } catch (e: any) {
        if (e.name !== 'AbortError') console.error("Airing fetch error:", e);
      } finally {
        if (!controller.signal.aborted) setIsLoadingAiring(false);
      }
    };
    loadAiring();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const loadHomeData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        let data: MediaItem[] = [];
        if (homeTab === 'TRENDING') data = await getTrendingMedia(activeMediaType, controller.signal);
        else if (homeTab === 'TOP') data = await getTopMedia(activeMediaType, controller.signal);
        else if (homeTab === 'UPCOMING') data = await getUpcomingMedia(activeMediaType, controller.signal);
        setHomeData(data);
      } catch (e: any) {
        if (e.name !== 'AbortError') setError('Failed to load home data. API might be busy.');
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    };
    loadHomeData();
    return () => controller.abort();
  }, [homeTab, activeMediaType]);

  useEffect(() => {
    const controller = new AbortController();
    const delayDebounceFn = setTimeout(async () => {
      if (currentView === 'SEARCH') {
        setIsLoading(true);
        try {
          const results = await searchMedia(searchQuery, searchFilters, activeMediaType, controller.signal);
          setSearchData(results);
        } catch (e: any) {
          if (e.name !== 'AbortError') console.error(e);
        } finally {
          if (!controller.signal.aborted) setIsLoading(false);
        }
      }
    }, 600);
    return () => {
      clearTimeout(delayDebounceFn);
      controller.abort();
    };
  }, [searchQuery, searchFilters, currentView, activeMediaType]);

  useEffect(() => {
    const controller = new AbortController();
    if (currentView === 'DETAILS' && selectedMediaId) {
      const loadDetails = async () => {
        try {
          const fullData = await getMediaDetails(selectedMediaId, selectedMediaType, controller.signal);
          if (fullData) setDetailItem(fullData);
        } catch (e: any) {
          if (e.name !== 'AbortError') console.error(e);
        }
      };
      loadDetails();
    }
    return () => controller.abort();
  }, [currentView, selectedMediaId, selectedMediaType]);

  const handleSaveEntry = (entry: ListEntry) => {
    setUserList(prev => {
      const entryWithSnapshot = { ...entry, mediaSnapshot: modalItem || entry.mediaSnapshot };
      const idx = prev.findIndex(e => e.mediaId === entry.mediaId);
      if (idx >= 0) {
        const newList = [...prev];
        newList[idx] = entryWithSnapshot;
        return newList;
      }
      return [...prev, entryWithSnapshot];
    });
  };

  const setViewAndReset = (view: ViewState) => {
    if (view === 'HOME') { setSearchQuery(''); setError(null); }
    setCurrentView(view);
    window.scrollTo(0,0);
  };

  const handleCardClick = (item: MediaItem) => {
    setSelectedMediaId(item.id);
    setSelectedMediaType(item.type);
    setCurrentView('DETAILS');
    window.scrollTo(0, 0);
  };

  const toggleGenre = (genre: string, type: 'include' | 'exclude') => {
    setSearchFilters(prev => {
      const field = type === 'include' ? 'includedGenres' : 'excludedGenres';
      const otherField = type === 'include' ? 'excludedGenres' : 'includedGenres';
      const newValues = prev[field].includes(genre) 
        ? prev[field].filter(g => g !== genre) 
        : [...prev[field], genre];
      return { ...prev, [field]: newValues, [otherField]: prev[otherField].filter(g => g !== genre) };
    });
  };

  const renderHome = () => (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      {showWelcome && (
        <div className="relative rounded-2xl bg-indigo-900 overflow-hidden shadow-lg border border-jamdani-gold/30 mt-4 md:mt-0">
          <div className="absolute inset-0 bg-nakshi-pattern opacity-10 pointer-events-none"></div>
          <button onClick={() => { setShowWelcome(false); localStorage.setItem('aniadda_welcome_closed', 'true'); }} className="absolute top-4 right-4 text-white/50 hover:text-white bg-black/10 rounded-full p-1.5 z-20 transition-all"><X size={16} /></button>
          <div className="relative p-6 md:p-8 text-white z-10">
            <h1 className="text-2xl md:text-3xl font-bold mb-1">{lang === 'bn' ? 'অ্যানিআড্ডায় স্বাগতম' : 'Welcome to AniAdda'}</h1>
            <p className="text-indigo-100 opacity-90 text-sm">{lang === 'bn' ? 'আপনার ব্যক্তিগত এনিমে ট্র্যাকার।' : 'Your personal anime tracker.'}</p>
          </div>
        </div>
      )}

      {/* Real-time Airing Row */}
      {airingToday.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-indigo-900 dark:text-indigo-100 flex items-center gap-2">
              <Zap size={20} className="text-jamdani-gold fill-jamdani-gold" />
              {lang === 'bn' ? 'আজ সম্প্রচারিত হচ্ছে' : 'Airing Today'}
              <span className="flex h-2 w-2 rounded-full bg-red-500 animate-pulse ml-1"></span>
            </h2>
            <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Live from Japan</span>
          </div>
          <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2 px-1">
             {airingToday.map(item => (
                <div key={item.id} className="flex-shrink-0 w-32 md:w-40">
                   <MediaCard 
                      item={item} 
                      listEntry={userList.find(e => e.mediaId === item.id)} 
                      onAdd={setModalItem} 
                      onEdit={setModalItem} 
                      onClick={handleCardClick} 
                      lang={lang} 
                   />
                </div>
             ))}
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 p-4 rounded-xl flex items-center gap-3">
          <AlertCircle size={20} /> <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 border-b border-gray-100 dark:border-dark-border pb-2">
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar w-full md:w-auto">
              {['TRENDING', 'TOP', 'UPCOMING'].map(tab => (
                  <button key={tab} onClick={() => setHomeTab(tab as any)} className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${homeTab === tab ? 'bg-indigo-900 dark:bg-sakura-500 text-white shadow-md' : 'bg-white dark:bg-dark-card text-gray-500 border border-gray-100 dark:border-dark-border'}`}>{t[tab.toLowerCase()][lang]}</button>
              ))}
            </div>
            <div className="flex bg-gray-100 dark:bg-dark-card p-1 rounded-lg overflow-x-auto no-scrollbar max-w-full border dark:border-dark-border">
                {['anime', 'manga', 'manhwa', 'manhua', 'ln', 'hentai', 'doujinshi'].map(type => (
                  <button key={type} onClick={() => setActiveMediaType(type as any)} className={`px-3 py-1.5 rounded-md text-sm font-bold transition-all whitespace-nowrap ${activeMediaType === type ? 'bg-white dark:bg-indigo-950 text-indigo-900 dark:text-sakura-500 shadow-sm' : 'text-gray-500'}`}>{t[type][lang]}</button>
                ))}
            </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin text-sakura-500" size={32} /></div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {homeData.map(item => (
              <MediaCard 
                key={`${item.id}-${item.type}`} 
                item={item} 
                listEntry={userList.find(e => e.mediaId === item.id)} 
                onAdd={setModalItem} 
                onEdit={setModalItem} 
                onClick={handleCardClick} 
                lang={lang} 
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const mediaMap = useMemo(() => {
    const map = new Map<number | string, MediaItem>();
    userList.forEach(entry => { if (entry.mediaSnapshot) map.set(entry.mediaId, entry.mediaSnapshot); });
    return map;
  }, [userList]);

  return (
    <div className="min-h-screen bg-paper dark:bg-dark-bg text-gray-800 dark:text-gray-200 font-sans pb-24 md:pb-0 pt-16 md:pt-20 transition-colors duration-300">
      <Navbar 
        currentView={currentView} 
        setView={setViewAndReset} 
        lang={lang} 
        toggleLang={() => setLang(l => l === 'en' ? 'bn' : 'en')} 
        isDark={isDark}
        toggleTheme={() => setIsDark(!isDark)}
      />
      <main className={`${currentView !== 'DETAILS' ? 'max-w-6xl mx-auto px-4 pt-6' : ''}`}>
        {currentView === 'HOME' && renderHome()}
        {currentView === 'SEARCH' && (
           <div className="space-y-6 animate-in fade-in duration-500">
              <div className="flex flex-col gap-4">
                <div className="relative group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 group-focus-within:text-indigo-600 dark:group-focus-within:text-sakura-500 transition-colors" size={20} />
                  <input 
                    type="text" 
                    placeholder={lang === 'bn' ? 'খুঁজুন...' : 'Search for anime, manga, novels...'} 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border rounded-2xl shadow-sm focus:outline-none focus:border-indigo-600 dark:focus:border-sakura-500 focus:ring-4 focus:ring-indigo-50 dark:focus:ring-sakura-500/10 transition-all text-lg"
                  />
                </div>
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                  <button 
                    onClick={() => setShowFilters(!showFilters)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all border ${showFilters ? 'bg-indigo-900 dark:bg-sakura-500 text-white border-indigo-900 dark:border-sakura-500' : 'bg-white dark:bg-dark-card text-gray-600 dark:text-gray-300 border-gray-200 dark:border-dark-border'}`}
                  >
                    <SlidersHorizontal size={18} />
                    {t.filters[lang]}
                    {(searchFilters.includedGenres.length > 0 || searchFilters.excludedGenres.length > 0 || searchFilters.status !== 'all' || searchFilters.sortBy !== 'popularity' || searchFilters.sortOrder !== 'desc') && (
                       <span className="w-2 h-2 rounded-full bg-sakura-500"></span>
                    )}
                  </button>
                  <div className="flex bg-gray-100 dark:bg-dark-card p-1 rounded-xl overflow-x-auto no-scrollbar whitespace-nowrap border dark:border-dark-border">
                    {['anime', 'manga', 'manhwa', 'manhua', 'ln', 'hentai', 'doujinshi'].map(type => (
                      <button key={type} onClick={() => {setActiveMediaType(type as any); setSearchFilters(f => ({...f, includedGenres: [], excludedGenres: []}));}} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeMediaType === type ? 'bg-white dark:bg-indigo-950 text-indigo-900 dark:text-sakura-500 shadow-sm' : 'text-gray-500'}`}>{t[type][lang]}</button>
                    ))}
                  </div>
                </div>
                {showFilters && (
                  <div className="bg-white dark:bg-dark-card p-6 rounded-2xl border border-gray-100 dark:border-dark-border shadow-xl space-y-6 animate-in slide-in-from-top duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      <div>
                        <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">{t.status[lang]}</label>
                        <select value={searchFilters.status} onChange={(e) => setSearchFilters(f => ({...f, status: e.target.value}))} className="w-full p-3 bg-gray-50 dark:bg-indigo-950 border border-gray-200 dark:border-dark-border rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-sakura-500/20 transition-all">
                          <option value="all">{lang === 'bn' ? 'সব' : 'All'}</option>
                          <option value="airing">{lang === 'bn' ? 'চলমান' : 'Airing/Publishing'}</option>
                          <option value="complete">{lang === 'bn' ? 'সম্পন্ন' : 'Completed'}</option>
                          <option value="upcoming">{lang === 'bn' ? 'আসছে' : 'Upcoming'}</option>
                        </select>
                      </div>
                      <div className="flex flex-col">
                        <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">{t.sortBy[lang]}</label>
                        <div className="flex gap-2">
                           <select value={searchFilters.sortBy} onChange={(e) => setSearchFilters(f => ({...f, sortBy: e.target.value}))} className="flex-1 p-3 bg-gray-50 dark:bg-indigo-950 border border-gray-200 dark:border-dark-border rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-sakura-500/20 transition-all">
                            <option value="popularity">{lang === 'bn' ? 'জনপ্রিয়তা' : 'Popularity'}</option>
                            <option value="score">{lang === 'bn' ? 'স্কোর' : 'Score'}</option>
                            <option value="newest">{lang === 'bn' ? 'নতুন' : 'Newest'}</option>
                            <option value="title">{t.alphabetical[lang]}</option>
                          </select>
                          <button onClick={() => setSearchFilters(f => ({...f, sortOrder: f.sortOrder === 'asc' ? 'desc' : 'asc'}))} className="p-3 bg-gray-50 dark:bg-indigo-950 border border-gray-200 dark:border-dark-border rounded-xl text-indigo-900 dark:text-sakura-500 hover:bg-gray-100 dark:hover:bg-indigo-900 transition-all" title={searchFilters.sortOrder === 'asc' ? t.asc[lang] : t.desc[lang]}>
                            {searchFilters.sortOrder === 'asc' ? <ArrowUpNarrowWide size={20} /> : <ArrowDownWideNarrow size={20} />}
                          </button>
                        </div>
                      </div>
                      <div className="flex items-end">
                         <button onClick={() => setSearchFilters({ type: 'all', status: 'all', sortBy: 'popularity', sortOrder: 'desc', includedGenres: [], excludedGenres: [] })} className="w-full py-3 px-4 border border-gray-200 dark:border-dark-border text-gray-500 dark:text-gray-400 rounded-xl hover:bg-gray-50 dark:hover:bg-indigo-950 font-bold transition-all text-sm">{lang === 'bn' ? 'ফিল্টার মুছুন' : 'Clear Filters'}</button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">{t.genres[lang]}</label>
                      <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto pr-2 no-scrollbar">
                        {GENRES_LIST.map(genre => (
                          <div key={genre} className="flex overflow-hidden rounded-lg border border-gray-200 dark:border-dark-border">
                             <button onClick={() => toggleGenre(genre, 'include')} className={`px-3 py-1.5 text-xs font-bold transition-all ${searchFilters.includedGenres.includes(genre) ? 'bg-indigo-900 dark:bg-sakura-500 text-white' : 'bg-white dark:bg-indigo-950 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-indigo-900'}`}>{genre}</button>
                             <button onClick={() => toggleGenre(genre, 'exclude')} title="Exclude" className={`px-2 py-1.5 text-xs font-bold transition-all border-l border-gray-100 dark:border-dark-border ${searchFilters.excludedGenres.includes(genre) ? 'bg-red-500 text-white' : 'bg-white dark:bg-indigo-950 text-red-400 dark:text-red-400 hover:bg-red-50 dark:hover:bg-indigo-900'}`}><X size={12} /></button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              {isLoading ? <div className="flex justify-center py-20"><Loader2 className="animate-spin text-sakura-500" size={40} /></div> : (
                <>
                  {searchData.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-400 dark:text-gray-600 opacity-60">
                       <Search size={64} className="mb-4" strokeWidth={1} />
                       <p className="text-xl font-medium">{t.noResults[lang]}</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                      {searchData.map(item => <MediaCard key={`${item.id}-${item.type}`} item={item} listEntry={userList.find(e => e.mediaId === item.id)} onAdd={setModalItem} onEdit={setModalItem} onClick={handleCardClick} lang={lang} />)}
                    </div>
                  )}
                </>
              )}
           </div>
        )}
        {currentView === 'LIST' && (
          <div className="space-y-6 animate-in fade-in duration-500">
             <h1 className="text-2xl font-bold text-indigo-900 dark:text-indigo-100">{t.lists[lang]}</h1>
             <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                {['ALL', UserStatus.WATCHING, UserStatus.READING, UserStatus.COMPLETED, UserStatus.PLAN_TO_WATCH, UserStatus.PLAN_TO_READ, UserStatus.ON_HOLD, UserStatus.DROPPED].map(status => (
                  <button key={status} onClick={() => setListFilter(status as any)} className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${listFilter === status ? 'bg-indigo-900 dark:bg-sakura-500 text-white shadow-md' : 'bg-white dark:bg-dark-card text-gray-500 dark:text-gray-400 border border-gray-100 dark:border-dark-border'}`}>{status === 'ALL' ? t.all[lang] : status.replace(/_/g, ' ')}</button>
                ))}
             </div>
             <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {userList.filter(e => listFilter === 'ALL' || e.status === listFilter).map(entry => entry.mediaSnapshot && (
                   <MediaCard key={entry.id} item={entry.mediaSnapshot} listEntry={entry} onAdd={setModalItem} onEdit={setModalItem} onClick={handleCardClick} lang={lang} />
                ))}
             </div>
          </div>
        )}
        {currentView === 'PROFILE' && (
          <div className="space-y-8 animate-in fade-in duration-500">
             <div className="bg-white dark:bg-dark-card rounded-3xl p-8 shadow-sm border border-gray-100 dark:border-dark-border flex flex-col md:flex-row items-center gap-8">
                <div className="w-32 h-32 rounded-full bg-sakura-500 border-4 border-white dark:border-indigo-950 shadow-xl flex items-center justify-center text-white text-5xl font-bold">U</div>
                <div className="text-center md:text-left">
                   <h2 className="text-3xl font-bold text-indigo-900 dark:text-indigo-50">User</h2>
                   <p className="text-gray-500 dark:text-gray-400 font-medium">{userList.length} {t.total[lang]} {t.home[lang]}</p>
                </div>
             </div>
             <StatsChart entries={userList} mediaMap={mediaMap} lang={lang} />
          </div>
        )}
        {currentView === 'DETAILS' && detailItem && <DetailsView item={detailItem} listEntry={userList.find(e => e.mediaId === detailItem.id)} onBack={() => setViewAndReset('HOME')} onAdd={() => setModalItem(detailItem)} onRelatedClick={(id, type) => { setSelectedMediaId(id); setSelectedMediaType(type); }} onGenreClick={(g) => { setSearchFilters(f => ({...f, includedGenres: [g]})); setViewAndReset('SEARCH'); }} lang={lang} />}
      </main>
      {modalItem && <TrackingModal isOpen={!!modalItem} onClose={() => setModalItem(null)} item={modalItem} existingEntry={userList.find(e => e.mediaId === modalItem.id)} onSave={handleSaveEntry} onDelete={(id) => setUserList(l => l.filter(e => e.id !== id))} lang={lang} />}
    </div>
  );
};

export default App;
