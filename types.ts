
export enum MediaType {
  ANIME = 'ANIME',
  MANGA = 'MANGA',
  LN = 'LN'
}

export enum MediaStatus {
  ONGOING = 'ONGOING',
  FINISHED = 'FINISHED',
  NOT_YET_RELEASED = 'NOT_YET_RELEASED'
}

export enum UserStatus {
  WATCHING = 'WATCHING',
  READING = 'READING',
  COMPLETED = 'COMPLETED',
  PLAN_TO_WATCH = 'PLAN_TO_WATCH',
  PLAN_TO_READ = 'PLAN_TO_READ',
  DROPPED = 'DROPPED',
  ON_HOLD = 'ON_HOLD'
}

export interface RelatedMedia {
  relationType: string;
  mediaId: number | string;
  type: MediaType;
  title: string;
}

export interface MediaItem {
  id: number | string;
  title: {
    romaji: string;
    english: string;
    bengali: string;
  };
  coverImage: string;
  bannerImage?: string;
  description: string; // English
  descriptionBn?: string; // Bengali
  type: MediaType;
  status: MediaStatus;
  episodes?: number;
  chapters?: number;
  volumes?: number;
  genres: string[];
  averageScore: number; // 0-100
  season?: string;
  year?: number;
  studios?: string[];
  authors?: string[]; // For Manga/LN
  duration?: string;
  rating?: string;
  source?: string;
  format?: string;
  relations?: RelatedMedia[];
}

export interface ListEntry {
  id: string; // unique entry id
  mediaId: number | string;
  status: UserStatus;
  progress: number; // episode or chapter count
  score: number; // 0-10
  notes?: string;
  updatedAt: number;
  mediaSnapshot?: MediaItem; // Cache the media details so we don't need to refetch
}

export interface UserProfile {
  id: string;
  name: string;
  avatar: string;
  stats: {
    animeCount: number;
    mangaCount: number;
    daysWatched: number;
    meanScore: number;
  };
}

export interface LanguageDictionary {
  [key: string]: {
    en: string;
    bn: string;
  };
}

export interface SearchFilters {
  type: string;
  status: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  includedGenres: string[];
  excludedGenres: string[];
}

export type ViewState = 'HOME' | 'SEARCH' | 'LIST' | 'PROFILE' | 'DETAILS';
