
import React, { useState, useEffect } from 'react';
import { X, Save, Trash2 } from 'lucide-react';
import { MediaItem, ListEntry, UserStatus, MediaType } from '../types';
import { TRANSLATIONS } from '../constants';

interface TrackingModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: MediaItem;
  existingEntry?: ListEntry;
  onSave: (entry: ListEntry) => void;
  onDelete: (entryId: string) => void;
  lang: 'en' | 'bn';
}

const TrackingModal: React.FC<TrackingModalProps> = ({ 
  isOpen, onClose, item, existingEntry, onSave, onDelete, lang 
}) => {
  const t = TRANSLATIONS;
  const isVideo = item.type === MediaType.ANIME;
  const relevantStatuses = isVideo 
    ? [UserStatus.WATCHING, UserStatus.COMPLETED, UserStatus.PLAN_TO_WATCH, UserStatus.ON_HOLD, UserStatus.DROPPED]
    : [UserStatus.READING, UserStatus.COMPLETED, UserStatus.PLAN_TO_READ, UserStatus.ON_HOLD, UserStatus.DROPPED];

  const defaultStatus = isVideo ? UserStatus.WATCHING : UserStatus.READING;
  const [status, setStatus] = useState<UserStatus>(isVideo ? UserStatus.PLAN_TO_WATCH : UserStatus.PLAN_TO_READ);
  const [progress, setProgress] = useState(0);
  const [score, setScore] = useState(0);

  useEffect(() => {
    if (isOpen) {
      if (existingEntry) {
        setStatus(existingEntry.status);
        setProgress(existingEntry.progress);
        setScore(existingEntry.score);
      } else {
        setStatus(defaultStatus);
        setProgress(0);
        setScore(0);
      }
    }
  }, [isOpen, existingEntry, defaultStatus]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave({
      id: existingEntry ? existingEntry.id : Date.now().toString(),
      mediaId: item.id,
      status, progress, score,
      updatedAt: Date.now()
    });
    onClose();
  };

  const title = lang === 'bn' ? item.title.bengali : item.title.english;
  const maxProgress = item.episodes || item.chapters || 9999;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 dark:bg-black/70 backdrop-blur-sm">
      <div className="bg-white dark:bg-dark-card w-full max-w-sm rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200 border dark:border-dark-border">
        <div className="relative h-24 bg-indigo-900">
          <img src={item.bannerImage || item.coverImage} className="w-full h-full object-cover opacity-50" />
          <div className="absolute inset-0 bg-gradient-to-t from-indigo-900/90 to-transparent p-4 flex items-end">
            <h2 className="text-white font-bold text-lg leading-tight line-clamp-1">{title}</h2>
          </div>
          <button onClick={onClose} className="absolute top-2 right-2 bg-black/20 hover:bg-black/40 text-white rounded-full p-1"><X size={20} /></button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">{t.status[lang]}</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as UserStatus)} className="w-full p-2 bg-paper dark:bg-indigo-950 border border-gray-200 dark:border-dark-border rounded-lg text-indigo-900 dark:text-indigo-100 font-medium focus:outline-none focus:border-sakura-500">
              {relevantStatuses.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">{t.progress[lang]} ({t.total[lang]}: {maxProgress === 9999 ? '?' : maxProgress})</label>
            <div className="flex items-center gap-3">
              <button className="w-8 h-8 rounded-full bg-gray-100 dark:bg-indigo-950/50 flex items-center justify-center font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-indigo-900" onClick={() => setProgress(Math.max(0, progress - 1))}>-</button>
              <input type="number" value={progress} onChange={(e) => setProgress(Number(e.target.value))} className="flex-1 text-center p-2 bg-paper dark:bg-indigo-950 border border-gray-200 dark:border-dark-border rounded-lg font-mono font-bold text-lg dark:text-white" />
              <button className="w-8 h-8 rounded-full bg-sakura-100 dark:bg-sakura-500/20 flex items-center justify-center font-bold text-sakura-700 dark:text-sakura-500 hover:bg-sakura-200 dark:hover:bg-sakura-500/30" onClick={() => setProgress(Math.min(maxProgress, progress + 1))}>+</button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">{t.score[lang]} (0-10)</label>
            <div className="flex gap-1 justify-between">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                 <button key={num} onClick={() => setScore(num)} className={`flex-1 h-8 rounded text-xs font-bold transition-all ${score >= num ? 'bg-jamdani-gold text-white shadow-sm' : 'bg-gray-100 dark:bg-indigo-950/50 text-gray-400'}`}>{num}</button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-gray-100 dark:border-dark-border flex justify-between gap-3 bg-paper dark:bg-dark-card">
          {existingEntry && (
            <button onClick={() => { onDelete(existingEntry.id); onClose(); }} className="p-3 text-red-500 bg-red-50 dark:bg-red-950/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors border dark:border-red-900/50"><Trash2 size={20} /></button>
          )}
          <button onClick={handleSave} className="flex-1 flex items-center justify-center gap-2 bg-indigo-900 dark:bg-sakura-500 text-white font-bold py-3 rounded-lg hover:bg-indigo-800 dark:hover:bg-sakura-600 transition-colors shadow-lg shadow-indigo-200 dark:shadow-none"><Save size={18} />{t.save[lang]}</button>
        </div>
      </div>
    </div>
  );
};

export default TrackingModal;
