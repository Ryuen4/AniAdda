
import React, { useMemo, useState } from 'react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { ListEntry, UserStatus, MediaType, MediaItem } from '../types';
import { Download, Share2, Layers, Tv, BookOpen, Book, Ghost, Flame, Calendar, Clock, Palette } from 'lucide-react';

interface StatsChartProps {
  entries: ListEntry[];
  mediaMap: Map<number | string, MediaItem>;
  lang: 'en' | 'bn';
}

const COLORS = ['#e76e95', '#D4A24C', '#1e1b4b', '#94a3b8', '#64748b', '#a855f7'];
const HEATMAP_COLORS = ['bg-gray-100 dark:bg-dark-card', 'bg-sakura-100 dark:bg-sakura-900/20', 'bg-sakura-300 dark:bg-sakura-700/40', 'bg-sakura-500 dark:bg-sakura-500/60', 'bg-sakura-700 dark:bg-sakura-500'];

// --- Helpers ---

const parseDurationToMinutes = (durationStr?: string): number => {
  if (!durationStr) return 24; 
  let total = 0;
  const hrMatch = durationStr.match(/(\d+)\s*hr/);
  if (hrMatch) total += parseInt(hrMatch[1]) * 60;
  const minMatch = durationStr.match(/(\d+)\s*min/);
  if (minMatch) total += parseInt(minMatch[1]);
  return total > 0 ? total : 24;
};

const formatTimeDetailed = (totalMinutes: number) => {
  const days = Math.floor(totalMinutes / (24 * 60));
  const remainingMinsAfterDays = totalMinutes % (24 * 60);
  const hours = Math.floor(remainingMinsAfterDays / 60);
  const minutes = Math.floor(remainingMinsAfterDays % 60);
  return { days, hours, minutes };
};

const detectOrigin = (item: MediaItem): 'Japan' | 'Korea' | 'China' => {
  const src = item.source?.toLowerCase() || '';
  const fmt = item.format?.toLowerCase() || '';
  const title = (item.title.english + item.title.romaji).toLowerCase();
  const studios = item.studios?.map(s => s.toLowerCase()) || [];
  
  const chineseIdentifiers = ['tencent', 'bilibili', 'haoliners', 'animation studio', 'fuhua', 'sparkly key'];
  const isChineseStudio = studios.some(s => chineseIdentifiers.some(id => s.includes(id)));

  if (src.includes('webtoon') || src.includes('manhwa') || fmt.includes('manhwa')) {
    return 'Korea';
  }
  if (src.includes('manhua') || fmt.includes('manhua') || isChineseStudio || (src.includes('novel') && item.format === 'ONA')) {
    return 'China';
  }
  return 'Japan';
};

const getHeatmapData = (entries: ListEntry[]) => {
  const now = new Date();
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(now.getFullYear() - 1);

  const daysMap = new Map<string, number>();
  
  for (let d = new Date(oneYearAgo); d <= now; d.setDate(d.getDate() + 1)) {
    daysMap.set(d.toISOString().split('T')[0], 0);
  }

  entries.forEach(entry => {
    const dateStr = new Date(entry.updatedAt).toISOString().split('T')[0];
    if (daysMap.has(dateStr)) {
      daysMap.set(dateStr, (daysMap.get(dateStr) || 0) + 1);
    }
  });

  return Array.from(daysMap.entries()).map(([date, count]) => ({ date, count }));
};

const StatsChart: React.FC<StatsChartProps> = ({ entries, mediaMap, lang }) => {
  type TabType = 'OVERVIEW' | 'ANIME' | 'MANGA' | 'LN' | 'HENTAI' | 'DOUJINSHI';
  const [activeTab, setActiveTab] = useState<TabType>('OVERVIEW');

  const processData = (filterFn: (item: MediaItem) => boolean) => {
    const subset = entries.filter(e => {
      const item = mediaMap.get(e.mediaId);
      return item && filterFn(item);
    });

    const stats = {
      count: subset.length,
      statusCounts: { [UserStatus.COMPLETED]: 0, [UserStatus.WATCHING]: 0, [UserStatus.READING]: 0, [UserStatus.PLAN_TO_WATCH]: 0, [UserStatus.PLAN_TO_READ]: 0, [UserStatus.DROPPED]: 0, [UserStatus.ON_HOLD]: 0 } as Record<string, number>,
      genres: {} as Record<string, number>,
      years: {} as Record<string, number>,
      scoreSum: 0,
      scoredCount: 0,
      totalMinutes: 0,
      seasons: {} as Record<string, number>,
      formats: {} as Record<string, number>,
      totalChapters: 0,
      totalVolumes: 0,
      isColor: 0, 
      isBW: 0, 
      origins: { Japan: 0, Korea: 0, China: 0 } as Record<string, number>,
      authors: {} as Record<string, number>,
      tags: {} as Record<string, number>,
      isParody: 0,
      isOriginal: 0,
      entries: subset 
    };

    subset.forEach(entry => {
      const item = mediaMap.get(entry.mediaId)!;
      stats.statusCounts[entry.status] = (stats.statusCounts[entry.status] || 0) + 1;
      if (entry.score > 0) {
        stats.scoreSum += entry.score;
        stats.scoredCount++;
      }
      if (item.year) stats.years[item.year] = (stats.years[item.year] || 0) + 1;
      item.genres.forEach(g => {
        stats.genres[g] = (stats.genres[g] || 0) + 1;
        if (activeTab === 'DOUJINSHI') stats.tags[g] = (stats.tags[g] || 0) + 1;
      });
      const origin = detectOrigin(item);
      stats.origins[origin]++;
      if (item.type === MediaType.ANIME) {
        const mins = parseDurationToMinutes(item.duration);
        stats.totalMinutes += (entry.progress * mins);
        if (item.season) stats.seasons[item.season] = (stats.seasons[item.season] || 0) + 1;
        if (item.format) stats.formats[item.format] = (stats.formats[item.format] || 0) + 1;
      } else {
        stats.totalChapters += entry.progress;
        stats.totalVolumes += (item.volumes || 0);
        const fmt = item.format?.toLowerCase() || '';
        if (origin !== 'Japan' || fmt.includes('webtoon')) stats.isColor++;
        else stats.isBW++;
        if (item.type === MediaType.LN) {
             item.authors?.forEach(a => {
                const name = a.split('(')[0].trim();
                stats.authors[name] = (stats.authors[name] || 0) + 1;
             });
        }
        if (activeTab === 'DOUJINSHI') {
            const src = item.source?.toLowerCase() || '';
            if (src === 'original') stats.isOriginal++;
            else stats.isParody++;
        }
      }
    });
    return stats;
  };

  const isHentaiVideo = (i: MediaItem) => i.type === MediaType.ANIME && (i.genres.includes('Hentai') || i.genres.includes('Erotica') || i.rating?.toLowerCase().includes('rx'));
  const isHentaiManga = (i: MediaItem) => i.type === MediaType.MANGA && (i.genres.includes('Hentai') || i.genres.includes('Erotica') || i.format?.toLowerCase() === 'doujinshi');

  const animeData = useMemo(() => processData(i => i.type === MediaType.ANIME && !isHentaiVideo(i)), [entries, mediaMap, activeTab]);
  const mangaData = useMemo(() => processData(i => i.type === MediaType.MANGA && !isHentaiManga(i)), [entries, mediaMap, activeTab]);
  const lnData = useMemo(() => processData(i => i.type === MediaType.LN), [entries, mediaMap, activeTab]);
  const hentaiData = useMemo(() => processData(i => isHentaiVideo(i)), [entries, mediaMap, activeTab]);
  const doujinshiData = useMemo(() => processData(i => isHentaiManga(i)), [entries, mediaMap, activeTab]);

  const totalInvestmentMins = useMemo(() => {
    const animeMins = animeData.totalMinutes + hentaiData.totalMinutes;
    const mangaMins = (mangaData.totalChapters + doujinshiData.totalChapters) * 5;
    const lnMins = (lnData.totalChapters * 15000) / 238;
    return animeMins + mangaMins + lnMins;
  }, [animeData, mangaData, lnData, hentaiData, doujinshiData]);

  const currentData = activeTab === 'ANIME' ? animeData : 
                      activeTab === 'MANGA' ? mangaData : 
                      activeTab === 'LN' ? lnData : 
                      activeTab === 'HENTAI' ? hentaiData :
                      activeTab === 'DOUJINSHI' ? doujinshiData : null;

  const getPieData = (source: Record<string, number>) => Object.entries(source).map(([name, value]) => ({ name: name.replace(/_/g, ' '), value })).filter(d => d.value > 0).sort((a,b) => b.value - a.value);
  const getBarData = (source: Record<string, number>, limit = 5) => Object.entries(source).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value).slice(0, limit);

  const exportData = () => {
    const dataStr = JSON.stringify(entries, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `aniadda_export_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const YearChart = ({ data }: { data: Record<string, number> }) => (
      <div className="bg-white dark:bg-dark-card p-5 rounded-xl border border-gray-100 dark:border-dark-border shadow-sm">
          <h4 className="text-sm font-bold text-gray-500 uppercase mb-4">Release Year Distribution</h4>
          <ResponsiveContainer width="100%" height={200}>
              <BarChart data={getBarData(data, 10)}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                  <XAxis dataKey="name" tick={{fontSize: 10, fill: '#64748b'}} />
                  <YAxis tick={{fontSize: 10, fill: '#64748b'}} />
                  <Tooltip contentStyle={{backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px'}} cursor={{fill: 'rgba(255,255,255,0.05)'}} />
                  <Bar dataKey="value" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
              </BarChart>
          </ResponsiveContainer>
      </div>
  );

  const UniversalSection = ({ data }: { data: ReturnType<typeof processData> }) => (
    <div className="space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-dark-card p-5 rounded-xl border border-gray-100 dark:border-dark-border shadow-sm">
                <h4 className="text-sm font-bold text-gray-500 uppercase mb-4">Status Breakdown</h4>
                <div className="h-64 flex items-center">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={getPieData(data.statusCounts)}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {getPieData(data.statusCounts).map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                                ))}
                            </Pie>
                            <Tooltip contentStyle={{backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px'}} />
                            <Legend wrapperStyle={{paddingTop: '20px', fontSize: '12px'}} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                <div className="text-center mt-2">
                    <p className="text-sm text-gray-500">Avg Rating</p>
                    <p className="text-3xl font-bold text-jamdani-gold">
                        {data.scoredCount ? (data.scoreSum / data.scoredCount).toFixed(1) : '-'}
                    </p>
                </div>
            </div>

            <div className="bg-white dark:bg-dark-card p-5 rounded-xl border border-gray-100 dark:border-dark-border shadow-sm">
                <h4 className="text-sm font-bold text-gray-500 uppercase mb-4">Top 5 Genres</h4>
                <ResponsiveContainer width="100%" height={280}>
                    <BarChart layout="vertical" data={getBarData(data.genres, 5)}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#334155" />
                        <XAxis type="number" allowDecimals={false} hide />
                        <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 12, fill: '#64748b'}} />
                        <Tooltip contentStyle={{backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px'}} cursor={{fill: 'rgba(255,255,255,0.05)'}} />
                        <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} label={{ position: 'right', fill: '#64748b', fontSize: 12 }} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>

        <div className="bg-white dark:bg-dark-card p-5 rounded-xl border border-gray-100 dark:border-dark-border shadow-sm">
            <h4 className="text-sm font-bold text-gray-500 uppercase mb-4 flex items-center gap-2">
                <Calendar size={16} /> Activity Heatmap (Last 12 Months)
            </h4>
            <div className="flex flex-wrap gap-1">
                {getHeatmapData(data.entries).map((day, i) => {
                    const colorIndex = day.count === 0 ? 0 : Math.min(day.count, 4);
                    return (
                        <div 
                            key={i} 
                            className={`w-2.5 h-2.5 rounded-sm ${HEATMAP_COLORS[colorIndex]}`} 
                            title={`${day.date}: ${day.count} updates`}
                        />
                    );
                })}
            </div>
        </div>
    </div>
  );

  const StatBox = ({ label, value, icon: Icon, color, isOverview }: any) => (
    <div className={`p-4 rounded-xl border ${color} bg-opacity-10 dark:bg-opacity-5 flex items-center gap-4 transition-all duration-300`}>
        <div className={`p-3 rounded-lg ${color} bg-opacity-20 dark:bg-opacity-10`}>
            {Icon && <Icon size={24} />}
        </div>
        <div>
            <p className="text-xs font-bold uppercase opacity-60 dark:text-gray-400">{label}</p>
            <p className={`font-bold leading-tight dark:text-gray-100 ${isOverview ? 'text-lg md:text-xl' : 'text-xl md:text-2xl'}`}>{value}</p>
        </div>
    </div>
  );

  const VideoStatsLayout = ({ data, titlePrefix }: { data: ReturnType<typeof processData>, titlePrefix: string }) => (
      <div className="space-y-6 animate-in slide-in-from-right duration-300">
             <div className="grid md:grid-cols-3 gap-4">
                 <div className="col-span-2 bg-gradient-to-r from-indigo-900 to-indigo-800 dark:from-indigo-950 dark:to-indigo-900 rounded-xl p-6 text-white shadow-lg relative overflow-hidden border dark:border-indigo-800/50">
                    <div className="relative z-10 flex items-center gap-6">
                        <div className="p-4 bg-white/10 rounded-full backdrop-blur-sm">
                            <Clock size={32} />
                        </div>
                        <div>
                            <p className="text-indigo-200 text-sm font-bold uppercase tracking-wider mb-1">Time Invested</p>
                            <div className="flex items-baseline gap-2">
                                {(() => {
                                    const t = formatTimeDetailed(data.totalMinutes);
                                    return (
                                        <>
                                            <span className="text-4xl font-bold">{t.days}</span><span className="text-sm opacity-60">days</span>
                                            <span className="text-4xl font-bold">{t.hours}</span><span className="text-sm opacity-60">hrs</span>
                                            <span className="text-4xl font-bold">{t.minutes}</span><span className="text-sm opacity-60">mins</span>
                                        </>
                                    )
                                })()}
                            </div>
                        </div>
                    </div>
                 </div>
                 <StatBox 
                    label="Episodes Watched" 
                    value={data.entries.reduce((acc, e) => acc + e.progress, 0)} 
                    icon={Tv} 
                    color="bg-sakura-50 border-sakura-100 dark:border-sakura-900 text-sakura-700 dark:text-sakura-500" 
                 />
             </div>
             
             <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-dark-card p-5 rounded-xl border border-gray-100 dark:border-dark-border shadow-sm">
                    <h4 className="text-sm font-bold text-gray-500 uppercase mb-4">Seasonal Distribution</h4>
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={getBarData(data.seasons, 4)}>
                             <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                             <XAxis dataKey="name" tick={{fontSize: 10, fill: '#64748b'}} />
                             <Tooltip contentStyle={{backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px'}} cursor={{fill: 'rgba(255,255,255,0.05)'}} />
                             <Bar dataKey="value" fill="#e76e95" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                <YearChart data={data.years} />
             </div>

             <div className="grid md:grid-cols-2 gap-6">
                 <div className="bg-white dark:bg-dark-card p-5 rounded-xl border border-gray-100 dark:border-dark-border shadow-sm">
                    <h4 className="text-sm font-bold text-gray-500 uppercase mb-4">Format Split</h4>
                    <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                            <Pie data={getPieData(data.formats)} cx="50%" cy="50%" innerRadius={40} outerRadius={60} dataKey="value">
                                {getPieData(data.formats).map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />)}
                            </Pie>
                            <Tooltip contentStyle={{backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px'}} />
                            <Legend wrapperStyle={{fontSize: '10px'}} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                <div className="bg-white dark:bg-dark-card p-5 rounded-xl border border-gray-100 dark:border-dark-border shadow-sm">
                    <h4 className="text-sm font-bold text-gray-500 uppercase mb-4">Origin Heatmap ({titlePrefix})</h4>
                    <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                            <Pie data={getPieData(data.origins)} cx="50%" cy="50%" outerRadius={60} dataKey="value" label={{fill: '#64748b', fontSize: 10}}>
                                {getPieData(data.origins).map((entry) => (
                                  <Cell key={`cell-${entry.name}`} fill={entry.name === 'Japan' ? '#e76e95' : entry.name === 'Korea' ? '#3b82f6' : '#eab308'} stroke="none" />
                                ))}
                            </Pie>
                            <Tooltip contentStyle={{backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px'}} />
                            <Legend wrapperStyle={{fontSize: '10px'}} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
             </div>
             <UniversalSection data={data} />
      </div>
  );

  const PrintStatsLayout = ({ data, titlePrefix, showTags }: { data: ReturnType<typeof processData>, titlePrefix: string, showTags?: boolean }) => (
      <div className="space-y-6 animate-in slide-in-from-right duration-300">
             <div className="grid md:grid-cols-3 gap-4">
                 <div className="col-span-2 bg-gradient-to-r from-teal-800 to-teal-900 dark:from-teal-950 dark:to-teal-900 rounded-xl p-6 text-white shadow-lg relative overflow-hidden border dark:border-teal-800/50">
                    <div className="relative z-10 flex items-center gap-6">
                        <div className="p-4 bg-white/10 rounded-full backdrop-blur-sm">
                            <Clock size={32} />
                        </div>
                        <div>
                            <p className="text-teal-200 text-sm font-bold uppercase tracking-wider mb-1">Time Invested (Est)</p>
                            <div className="flex items-baseline gap-2">
                                {(() => {
                                    const t = formatTimeDetailed(data.totalChapters * 5);
                                    return (
                                        <>
                                            <span className="text-4xl font-bold">{t.days}</span><span className="text-sm opacity-60">days</span>
                                            <span className="text-4xl font-bold">{t.hours}</span><span className="text-sm opacity-60">hrs</span>
                                            <span className="text-4xl font-bold">{t.minutes}</span><span className="text-sm opacity-60">mins</span>
                                        </>
                                    )
                                })()}
                            </div>
                            <p className="text-[10px] text-teal-300 mt-1 opacity-70">Based on 5 mins / chapter average</p>
                        </div>
                    </div>
                 </div>
                 <StatBox label="Chapters Read" value={data.totalChapters} icon={BookOpen} color="bg-indigo-50 border-indigo-100 dark:border-indigo-900 text-indigo-900 dark:text-indigo-400" />
             </div>

             <div className="grid md:grid-cols-3 gap-4">
                 <StatBox label="Volumes (Est)" value={Math.floor(data.totalChapters / 9)} icon={Book} color="bg-blue-50 border-blue-100 dark:border-blue-900 text-blue-900 dark:text-blue-400" />
                 <StatBox label="Color / Webtoon" value={data.isColor} icon={Palette} color="bg-purple-50 border-purple-100 dark:border-purple-900 text-purple-900 dark:text-purple-400" />
                 <StatBox label="B&W (Manga)" value={data.isBW} icon={Palette} color="bg-gray-50 border-gray-100 dark:border-slate-800 text-gray-700 dark:text-gray-400" />
             </div>

             <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-dark-card p-5 rounded-xl border border-gray-100 dark:border-dark-border shadow-sm">
                    <h4 className="text-sm font-bold text-gray-500 uppercase mb-4">Origin Heatmap</h4>
                    <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                            <Pie data={getPieData(data.origins)} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={{fill: '#64748b', fontSize: 10}}>
                                {getPieData(data.origins).map((entry) => (
                                  <Cell key={`cell-${entry.name}`} fill={entry.name === 'Japan' ? '#e76e95' : entry.name === 'Korea' ? '#3b82f6' : '#eab308'} stroke="none" />
                                ))}
                            </Pie>
                            <Tooltip contentStyle={{backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px'}} />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                <div className="bg-white dark:bg-dark-card p-5 rounded-xl border border-gray-100 dark:border-dark-border shadow-sm flex flex-col justify-center items-center text-center">
                    <h4 className="text-sm font-bold text-gray-500 uppercase mb-4">Reading Preference</h4>
                    <div className="w-full flex justify-center gap-8">
                        <div>
                            <div className="w-20 h-20 rounded-full border-4 border-gray-800 dark:border-gray-700 flex items-center justify-center text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">
                                {Math.round((data.isBW / (data.count || 1)) * 100)}%
                            </div>
                            <span className="text-sm font-bold text-gray-500">B&W</span>
                        </div>
                        <div>
                            <div className="w-20 h-20 rounded-full border-4 border-purple-500 flex items-center justify-center text-xl font-bold text-purple-900 dark:text-purple-400 mb-2">
                                {Math.round((data.isColor / (data.count || 1)) * 100)}%
                            </div>
                            <span className="text-sm font-bold text-gray-500">Color</span>
                        </div>
                    </div>
                </div>
             </div>
             
             <YearChart data={data.years} />

             {showTags && (
                <div className="bg-white dark:bg-dark-card p-5 rounded-xl border border-gray-100 dark:border-dark-border shadow-sm">
                    <h4 className="text-sm font-bold text-gray-500 uppercase mb-4">Tag Cloud</h4>
                    <div className="flex flex-wrap gap-2">
                        {getBarData(data.tags, 20).map(tag => (
                            <span 
                                key={tag.name} 
                                className="px-3 py-1.5 bg-gray-50 dark:bg-indigo-950/40 text-gray-600 dark:text-gray-400 rounded-lg text-sm font-medium border border-gray-200 dark:border-dark-border"
                                style={{ fontSize: Math.max(0.8, Math.min(1.5, 0.8 + (tag.value / 5))) + 'rem' }}
                            >
                                {tag.name} <span className="opacity-40 text-xs ml-1">{tag.value}</span>
                            </span>
                        ))}
                    </div>
                </div>
             )}
             <UniversalSection data={data} />
      </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white dark:bg-dark-card p-4 rounded-xl border border-sakura-50 dark:border-dark-border shadow-sm">
        <h3 className="text-xl font-bold text-indigo-900 dark:text-indigo-100">
          {lang === 'bn' ? 'পরিসংখ্যান' : 'Statistics'}
        </h3>
        <button 
            onClick={exportData}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-950 text-indigo-900 dark:text-indigo-100 rounded-lg text-sm font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900 transition-colors border dark:border-indigo-800"
        >
            <Download size={16} /> {lang === 'bn' ? 'এক্সপোর্ট' : 'Export'}
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {[
              { id: 'OVERVIEW', label: 'Overview', icon: Layers },
              { id: 'ANIME', label: 'Anime', icon: Tv },
              { id: 'MANGA', label: 'Manga', icon: BookOpen },
              { id: 'LN', label: 'Light Novel', icon: Book },
              { id: 'HENTAI', label: 'Hentai', icon: Ghost },
              { id: 'DOUJINSHI', label: 'Doujinshi', icon: Flame },
          ].map(tab => (
              <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap border ${
                      activeTab === tab.id 
                      ? 'bg-indigo-900 dark:bg-sakura-500 text-white border-indigo-900 dark:border-sakura-500 shadow-md' 
                      : 'bg-white dark:bg-dark-card text-gray-500 dark:text-gray-400 border-gray-200 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-indigo-950'
                  }`}
              >
                  <tab.icon size={16} />
                  {tab.label}
              </button>
          ))}
      </div>

      {activeTab === 'OVERVIEW' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
             <StatBox label="Total Entries" value={entries.length} icon={Layers} color="bg-gray-100 border-gray-200 dark:border-slate-800 text-gray-700 dark:text-gray-400" isOverview={true} />
             <StatBox label="Anime Watched" value={animeData.count} icon={Tv} color="bg-sakura-50 border-sakura-100 dark:border-sakura-900 text-sakura-700 dark:text-sakura-500" isOverview={true} />
             <StatBox label="Manga (Japan)" value={mangaData.origins.Japan} icon={BookOpen} color="bg-indigo-50 border-indigo-100 dark:border-indigo-900 text-indigo-900 dark:text-indigo-400" isOverview={true} />
             <StatBox label="Manhwa (Korea)" value={mangaData.origins.Korea} icon={BookOpen} color="bg-blue-50 border-blue-100 dark:border-blue-900 text-blue-900 dark:text-blue-400" isOverview={true} />
             <StatBox label="Manhua (China)" value={mangaData.origins.China} icon={BookOpen} color="bg-cyan-50 border-cyan-100 dark:border-cyan-900 text-cyan-900 dark:text-cyan-400" isOverview={true} />
             <StatBox label="Light Novel" value={lnData.count} icon={Book} color="bg-amber-50 border-amber-100 dark:border-amber-900 text-amber-700 dark:text-amber-400" isOverview={true} />
             <StatBox label="Hentai" value={hentaiData.count} icon={Ghost} color="bg-pink-50 border-pink-100 dark:border-pink-900 text-pink-700 dark:text-pink-400" isOverview={true} />
             <StatBox label="Doujinshi" value={doujinshiData.count} icon={Flame} color="bg-red-50 border-red-100 dark:border-red-900 text-red-700 dark:text-red-400" isOverview={true} />
             <StatBox 
                label="Mean Score" 
                value={(entries.reduce((acc, c) => acc + (c.score > 0 ? 1 : 0), 0) > 0 
                    ? (entries.reduce((acc, c) => acc + c.score, 0) / entries.reduce((acc, c) => acc + (c.score > 0 ? 1 : 0), 0)).toFixed(2) 
                    : 0)} 
                icon={Share2} 
                color="bg-green-50 border-green-100 dark:border-green-900 text-green-700 dark:text-green-400" 
                isOverview={true}
             />
             <StatBox 
                label={lang === 'bn' ? 'মোট ব্যয়িত সময়' : 'Total Time Invested'} 
                value={(() => {
                    const t = formatTimeDetailed(totalInvestmentMins);
                    return `${t.days}d ${t.hours}h ${t.minutes}m`;
                })()} 
                icon={Clock} 
                color="bg-violet-50 border-violet-100 dark:border-violet-900 text-violet-700 dark:text-violet-400" 
                isOverview={true}
             />
        </div>
      )}

      {activeTab === 'ANIME' && currentData && <VideoStatsLayout data={currentData} titlePrefix="Anime" />}
      {activeTab === 'MANGA' && currentData && <PrintStatsLayout data={currentData} titlePrefix="Manga" />}
      {activeTab === 'LN' && currentData && (
          <div className="space-y-6 animate-in slide-in-from-right duration-300">
             <div className="grid md:grid-cols-2 gap-4">
                 <div className="bg-amber-50 dark:bg-amber-950/20 rounded-xl p-6 border border-amber-100 dark:border-amber-900 flex items-center gap-4">
                    <Book className="text-amber-600 dark:text-amber-500" size={32} />
                    <div>
                        <p className="text-xs font-bold text-amber-600 dark:text-amber-500 uppercase">Est. Word Count</p>
                        <p className="text-3xl font-bold text-amber-900 dark:text-amber-100">{(currentData.totalChapters * 15000).toLocaleString()}+</p>
                    </div>
                 </div>
                 <div className="bg-gradient-to-r from-amber-600 to-amber-700 dark:from-amber-950 dark:to-amber-900 rounded-xl p-6 text-white shadow-lg border dark:border-amber-800/50">
                    <div className="flex items-center gap-6">
                        <div className="p-4 bg-white/10 rounded-full backdrop-blur-sm"><Clock size={32} /></div>
                        <div>
                            <p className="text-amber-100 text-sm font-bold uppercase tracking-wider mb-1">Time Invested (Est)</p>
                            <div className="flex items-baseline gap-2">
                                {(() => {
                                    const totalWords = currentData.totalChapters * 15000;
                                    const t = formatTimeDetailed(totalWords / 238);
                                    return <><span className="text-4xl font-bold">{t.days}</span><span className="text-sm opacity-60">days</span><span className="text-4xl font-bold">{t.hours}</span><span className="text-sm opacity-60">hrs</span></>
                                })()}
                            </div>
                        </div>
                    </div>
                 </div>
             </div>
             <div className="grid md:grid-cols-2 gap-4">
                 <StatBox label="Chapters Read" value={currentData.totalChapters} icon={BookOpen} color="bg-indigo-50 border-indigo-100 dark:border-indigo-900 text-indigo-900 dark:text-indigo-400" />
                 <StatBox label="Volumes (Est)" value={Math.floor(currentData.totalChapters / 10) || currentData.totalVolumes} icon={Book} color="bg-amber-50 border-amber-100 dark:border-amber-900 text-amber-700 dark:text-amber-400" />
             </div>
             <div className="bg-white dark:bg-dark-card p-5 rounded-xl border border-gray-100 dark:border-dark-border shadow-sm">
                <h4 className="text-sm font-bold text-gray-500 uppercase mb-4">Top Authors</h4>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={getBarData(currentData.authors, 8)}>
                             <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                             <XAxis dataKey="name" interval={0} height={50} tick={{fontSize: 10, fill: '#64748b'}} />
                             <Tooltip contentStyle={{backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px'}} cursor={{fill: 'rgba(255,255,255,0.05)'}} />
                             <Bar dataKey="value" fill="#D4A24C" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
             </div>
             <YearChart data={currentData.years} />
             <UniversalSection data={currentData} />
          </div>
      )}
      {activeTab === 'HENTAI' && currentData && <VideoStatsLayout data={currentData} titlePrefix="Hentai" />}
      {activeTab === 'DOUJINSHI' && currentData && <PrintStatsLayout data={currentData} titlePrefix="Doujinshi" showTags={true} />}
    </div>
  );
};

export default StatsChart;
