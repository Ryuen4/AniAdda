
import React, { useEffect, useState } from 'react';
import { ArrowLeft, Star, Calendar, Clock, Tv, Plus, Check, Link2, Book, FileText, Globe, List } from 'lucide-react';
import { MediaItem, ListEntry, MediaType, RelatedMedia, MediaStatus } from '../types';
import { TRANSLATIONS } from '../constants';
import { getMediaEpisodes } from '../services/apiService';

interface DetailsViewProps {
  item: MediaItem;
  listEntry?: ListEntry;
  onBack: () => void;
  onAdd: (item: MediaItem) => void;
  onRelatedClick: (id: number | string, type: MediaType) => void;
  onGenreClick: (genre: string) => void;
  lang: 'en' | 'bn';
}

const DetailsView: React.FC<DetailsViewProps> = ({ item, listEntry, onBack, onAdd, onRelatedClick, onGenreClick, lang }) => {
  const t = TRANSLATIONS;
  const title = lang === 'bn' ? item.title.bengali : item.title.english;
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  
  const isAnime = item.type === MediaType.ANIME;
  const isOngoing = item.status === MediaStatus.ONGOING;
  const totalCount = isAnime ? item.episodes : item.chapters;
  
  const countDisplay = isOngoing 
    ? `? / ${totalCount || '?'}` 
    : (totalCount || '?');

  useEffect(() => {
    const controller = new AbortController();
    if (isAnime) {
      setIsLoadingContent(true);
      getMediaEpisodes(item.id, controller.signal)
        .then(res => setEpisodes(res))
        .finally(() => setIsLoadingContent(false));
    }
    return () => controller.abort();
  }, [item.id, isAnime]);

  const renderMangaContent = () => {
    if (!item.volumes && !item.chapters) return null;
    const vols = item.volumes || Math.max(1, Math.ceil((item.chapters || 0) / 10));
    const chs = item.chapters || 0;
    const items = [];
    if (chs > 0 && vols > 0) {
        const avgChPerVol = Math.ceil(chs / vols);
        for (let i = 1; i <= vols; i++) {
            const start = ((i - 1) * avgChPerVol) + 1;
            const end = Math.min(chs, i * avgChPerVol);
            items.push(
                <div key={i} className="flex justify-between items-center py-2 px-3 hover:bg-gray-50 dark:hover:bg-indigo-950/40 rounded-lg transition-colors border-b border-gray-50 dark:border-dark-border last:border-0">
                    <span className="font-bold text-gray-700 dark:text-gray-300 text-sm">Volume {i}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-500 font-mono">
                        {start.toString().padStart(2, '0')} - {end.toString().padStart(2, '0')} Chapters
                    </span>
                </div>
            );
        }
    } else if (chs > 0) {
        items.push(
            <div key="all" className="flex justify-between items-center py-2 px-3">
                <span className="font-bold text-gray-700 dark:text-gray-300 text-sm">{chs} Chapters</span>
                <span className="text-xs text-gray-500 font-mono">Released</span>
            </div>
        );
    }
    return items;
  };

  return (
    <div className="animate-in slide-in-from-right duration-300">
      <div className="h-0 md:h-0"></div>

      <button 
        onClick={onBack}
        className="fixed top-4 left-4 z-[60] md:hidden bg-white/20 dark:bg-black/40 backdrop-blur-md p-2 rounded-full text-white shadow-lg border border-white/20"
      >
        <ArrowLeft size={24} />
      </button>

      <div className="relative h-64 md:h-80 w-full overflow-hidden">
         <div className="absolute inset-0 bg-indigo-900 dark:bg-black">
            {item.bannerImage ? (
                <img src={item.bannerImage} className="w-full h-full object-cover opacity-60 blur-sm" />
            ) : (
                <img src={item.coverImage} className="w-full h-full object-cover opacity-30 blur-md" />
            )}
         </div>
         <div className="absolute inset-0 bg-gradient-to-t from-paper dark:from-dark-bg via-paper/50 dark:via-dark-bg/50 to-transparent translate-y-1"></div>
      </div>

      <div className="max-w-6xl mx-auto px-4 -mt-32 md:-mt-40 relative z-10 pb-20">
        <div className="flex flex-col md:flex-row gap-8">
            <div className="flex-shrink-0 mx-auto md:mx-0 w-full md:w-64">
                <img 
                    src={item.coverImage} 
                    alt={title}
                    className="w-48 md:w-full rounded-xl shadow-2xl border-4 border-white dark:border-dark-card mx-auto" 
                />
                
                <button
                    onClick={() => onAdd(item)}
                    className={`mt-4 w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg transition-all ${
                        listEntry 
                        ? 'bg-sakura-100 dark:bg-sakura-500/10 text-sakura-700 dark:text-sakura-500 hover:bg-sakura-200 dark:hover:bg-sakura-500/20' 
                        : 'bg-indigo-900 dark:bg-sakura-500 text-white hover:bg-indigo-800 dark:hover:bg-sakura-600'
                    }`}
                >
                    {listEntry ? <Check size={20} /> : <Plus size={20} />}
                    {listEntry ? t.editEntry[lang] : t.addToCollection[lang]}
                </button>

                <div className="bg-white dark:bg-dark-card p-6 rounded-xl shadow-sm border border-gray-100 dark:border-dark-border h-fit mt-6">
                    <h3 className="text-lg font-bold text-indigo-900 dark:text-indigo-100 mb-4 border-b border-gray-100 dark:border-dark-border pb-2">
                        {t.information[lang]}
                    </h3>
                    <div className="space-y-5 text-sm">
                        <div className="grid grid-cols-2 gap-4 pb-4 border-b border-gray-50 dark:border-dark-border">
                            <div>
                                <span className="block text-gray-400 dark:text-gray-500 text-xs font-bold uppercase mb-1 flex items-center gap-1">
                                    <FileText size={10} /> {t.format[lang]}
                                </span>
                                <span className="text-gray-700 dark:text-gray-300 font-bold block">
                                    {item.format || item.type}
                                </span>
                            </div>
                            <div>
                                <span className="block text-gray-400 dark:text-gray-500 text-xs font-bold uppercase mb-1 flex items-center gap-1">
                                    <Globe size={10} /> {t.source[lang]}
                                </span>
                                <span className="text-gray-700 dark:text-gray-300 font-bold block">
                                    {item.source || 'N/A'}
                                </span>
                            </div>
                        </div>
                        {item.authors && item.authors.length > 0 && (
                            <div>
                                <span className="block text-gray-400 dark:text-gray-500 text-xs font-bold uppercase mb-1">{t.authors[lang]}</span>
                                <span className="text-gray-700 dark:text-gray-300 font-medium">
                                    {item.authors.join(', ')}
                                </span>
                            </div>
                        )}
                        {item.studios && item.studios.length > 0 && (
                            <div>
                                <span className="block text-gray-400 dark:text-gray-500 text-xs font-bold uppercase mb-1">{t.studios[lang]}</span>
                                <span className="text-gray-700 dark:text-gray-300 font-medium">
                                    {item.studios.join(', ')}
                                </span>
                            </div>
                        )}
                        <div className="pt-2">
                            <span className="block text-gray-400 dark:text-gray-500 text-xs font-bold uppercase mb-1">
                                {isAnime ? t.episodes[lang] : t.chapters[lang]}
                            </span>
                            <span className="text-gray-700 dark:text-gray-300 font-medium">
                                {countDisplay}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-dark-card p-6 rounded-xl shadow-sm border border-gray-100 dark:border-dark-border h-fit mt-6 overflow-hidden">
                    <h3 className="text-lg font-bold text-indigo-900 dark:text-indigo-100 mb-4 flex items-center gap-2 border-b border-gray-100 dark:border-dark-border pb-2">
                        <List size={18} className="text-sakura-500" />
                        {isAnime ? (lang === 'bn' ? 'পর্ব তালিকা' : 'Episode List') : (lang === 'bn' ? 'অধ্যায় তালিকা' : 'Chapter List')}
                    </h3>
                    <div className="max-h-[400px] overflow-y-auto no-scrollbar">
                        {isAnime ? (
                            isLoadingContent ? (
                                <div className="py-10 flex justify-center">
                                    <Clock className="animate-spin text-gray-300 dark:text-gray-600" />
                                </div>
                            ) : episodes.length > 0 ? (
                                <div className="space-y-1">
                                    {episodes.map((ep) => (
                                        <div key={ep.mal_id} className="flex gap-3 py-2 px-2 hover:bg-gray-50 dark:hover:bg-indigo-950/40 rounded-lg transition-colors border-b border-gray-50 dark:border-dark-border last:border-0 group">
                                            <span className="font-mono text-xs font-bold text-indigo-900/40 dark:text-indigo-200/40 group-hover:text-sakura-500">
                                                {ep.mal_id.toString().padStart(2, '0')}
                                            </span>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-bold text-gray-700 dark:text-gray-300 truncate" title={ep.title}>
                                                    {ep.title}
                                                </p>
                                                {ep.aired && <p className="text-[10px] text-gray-400 dark:text-gray-500">{new Date(ep.aired).toLocaleDateString()}</p>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-xs text-gray-400 text-center py-4">No data available</p>
                            )
                        ) : renderMangaContent()}
                    </div>
                </div>
            </div>

            <div className="flex-1 pt-4">
                <button onClick={onBack} className="hidden md:flex items-center gap-2 text-gray-500 hover:text-indigo-900 dark:hover:text-sakura-500 mb-4 font-medium transition-colors">
                    <ArrowLeft size={18} />
                    {t.back[lang]}
                </button>
                <h1 className="text-2xl md:text-4xl font-bold text-gray-900 dark:text-indigo-50 mb-2 leading-tight">{title}</h1>
                <h2 className="text-lg text-gray-500 dark:text-gray-400 mb-4 font-medium">{item.title.romaji}</h2>

                <div className="flex flex-wrap gap-4 mb-6">
                    {[
                        { icon: Star, color: 'text-jamdani-gold', value: `${item.averageScore}%` },
                        { icon: isAnime ? Tv : Book, color: 'text-indigo-900 dark:text-sakura-500', value: `${countDisplay} ${isAnime ? t.episodes[lang] : t.chapters[lang]}` },
                        { icon: FileText, color: 'text-indigo-900 dark:text-sakura-500', value: item.format || item.type },
                        { icon: Calendar, color: 'text-indigo-900 dark:text-sakura-500', value: item.year || 'N/A' },
                        { icon: Clock, color: 'text-indigo-900 dark:text-sakura-500', value: item.status?.replace(/_/g, ' ') }
                    ].map((stat, i) => (
                        <div key={i} className="flex items-center gap-1.5 bg-white dark:bg-dark-card px-3 py-1.5 rounded-full shadow-sm border border-gray-100 dark:border-dark-border">
                            <stat.icon className={stat.color} size={16} fill={stat.icon === Star ? 'currentColor' : 'none'} />
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">{stat.value}</span>
                        </div>
                    ))}
                </div>

                <div className="space-y-8">
                    <div>
                        <h3 className="text-lg font-bold text-indigo-900 dark:text-indigo-100 mb-2 flex items-center gap-2">
                            <span className="w-1 h-5 bg-sakura-500 rounded-full"></span>
                            {t.synopsis[lang]}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-sm md:text-base whitespace-pre-wrap">
                            {lang === 'bn' && item.descriptionBn ? item.descriptionBn : item.description}
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2">
                            {item.genres.map(g => (
                                <button key={g} onClick={() => onGenreClick(g)} className="px-3 py-1 bg-sakura-50 dark:bg-sakura-500/10 text-sakura-700 dark:text-sakura-400 hover:bg-sakura-100 dark:hover:bg-sakura-500/20 rounded-lg text-sm font-medium transition-colors cursor-pointer">{g}</button>
                            ))}
                        </div>
                    </div>
                    {item.relations && item.relations.length > 0 && (
                       <div className="bg-white dark:bg-dark-card p-5 rounded-xl border border-gray-100 dark:border-dark-border shadow-sm">
                            <h3 className="text-lg font-bold text-indigo-900 dark:text-indigo-100 mb-4 flex items-center gap-2">
                                <span className="w-1 h-5 bg-jamdani-gold rounded-full"></span>
                                {t.relations[lang]}
                            </h3>
                            <div className="space-y-3">
                                {item.relations.map((rel, idx) => (
                                    <div key={idx} onClick={() => onRelatedClick(rel.mediaId, rel.type)} className="flex items-center justify-between group cursor-pointer hover:bg-gray-50 dark:hover:bg-indigo-950/40 p-2 rounded-lg transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-indigo-50 dark:bg-indigo-950 p-2 rounded-lg text-indigo-900 dark:text-sakura-500"><Link2 size={16} /></div>
                                            <div>
                                                <p className="font-bold text-sm text-gray-800 dark:text-gray-200 group-hover:text-sakura-700 dark:group-hover:text-sakura-400 transition-colors">{rel.title}</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-500">{rel.relationType} • {rel.type}</p>
                                            </div>
                                        </div>
                                        <ArrowLeft size={14} className="rotate-180 text-gray-300 dark:text-gray-700 group-hover:text-sakura-500" />
                                    </div>
                                ))}
                            </div>
                       </div>
                    )}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default DetailsView;
