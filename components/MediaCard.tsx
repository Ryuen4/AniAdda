
import React from 'react';
import { Plus, Star, Check } from 'lucide-react';
import { MediaItem, ListEntry, MediaType, MediaStatus } from '../types';
import { TRANSLATIONS } from '../constants';

interface MediaCardProps {
  item: MediaItem;
  listEntry?: ListEntry; // If user has this in their list
  onAdd: (item: MediaItem) => void;
  onEdit: (item: MediaItem) => void;
  onClick: (item: MediaItem) => void;
  lang: 'en' | 'bn';
}

const MediaCard: React.FC<MediaCardProps> = ({ item, listEntry, onAdd, onEdit, onClick, lang }) => {
  const title = lang === 'bn' ? item.title.bengali : item.title.english;
  const isAnime = item.type === MediaType.ANIME;
  
  // Use short labels for card view
  const label = isAnime 
    ? (lang === 'bn' ? 'পর্ব' : 'Eps') 
    : (lang === 'bn' ? 'অধ্যায়' : 'Chs');

  const isOngoing = item.status === MediaStatus.ONGOING;
  const totalCount = isAnime ? item.episodes : item.chapters;
  
  // Format: "x / ? Eps" for ongoing, or just "total Eps" for finished
  const countDisplay = isOngoing 
    ? `? / ${totalCount || '?'}` 
    : (totalCount || '?');

  return (
    <div 
      onClick={() => onClick(item)}
      className="group relative flex flex-col w-full bg-white dark:bg-dark-card rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 border border-sakura-50 dark:border-dark-border cursor-pointer"
    >
      {/* Image Container */}
      <div className="relative aspect-[3/4] overflow-hidden bg-gray-100 dark:bg-indigo-950/20">
        <img 
          src={item.coverImage} 
          alt={item.title.english} 
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-300"></div>
        
        {/* Status Badge */}
        {listEntry && (
          <div className="absolute top-2 right-2 bg-jamdani-gold text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-sm flex items-center gap-1 z-10">
            <Check size={10} />
            {listEntry.status}
          </div>
        )}
        
        {/* Hover Info (Desktop) */}
        <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300 flex flex-col justify-end hidden md:flex">
             <p className="text-white text-xs line-clamp-2 opacity-90">
                {item.genres.slice(0, 3).join(' • ')}
             </p>
        </div>
      </div>

      {/* Content */}
      <div className="p-3 flex-1 flex flex-col">
        <h3 className="font-semibold text-indigo-900 dark:text-indigo-50 text-sm leading-tight line-clamp-2 mb-2 min-h-[2.5em]" title={title}>
          {title}
        </h3>
        
        <div className="mt-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
             <span className="text-xs text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">
                {countDisplay} {label}
             </span>
             
             <div className="flex items-center gap-1 text-jamdani-gold">
                <Star size={10} fill="currentColor" />
                <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{item.averageScore > 0 ? item.averageScore + '%' : 'N/A'}</span>
             </div>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              listEntry ? onEdit(item) : onAdd(item);
            }}
            className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors shadow-sm z-20 ${
              listEntry 
                ? 'bg-sakura-50 dark:bg-sakura-500/10 text-sakura-700 dark:text-sakura-500 hover:bg-sakura-100 dark:hover:bg-sakura-500/20' 
                : 'bg-indigo-900 dark:bg-sakura-500 text-white hover:bg-indigo-800 dark:hover:bg-sakura-600'
            }`}
          >
            {listEntry ? <span className="text-[10px] font-bold">{listEntry.progress}</span> : <Plus size={14} />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MediaCard;
