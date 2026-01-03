
import { MediaItem, MediaType, MediaStatus, SearchFilters, RelatedMedia } from "../types";

const JIKAN_BASE = "https://api.jikan.moe/v4";
const ANILIST_BASE = "https://graphql.anilist.co";

const JIKAN_GENRE_MAP: { [key: string]: number } = {
  "Action": 1, "Adventure": 2, "Comedy": 4, "Mystery": 7, "Drama": 8, "Ecchi": 9, "Fantasy": 10,
  "Hentai": 12, "Historical": 13, "Horror": 14, "Martial Arts": 17, "Mecha": 18, "Music": 19,
  "Parody": 20, "Romance": 22, "School": 23, "Sci-Fi": 24, "Shoujo": 25, "Shounen": 27,
  "Space": 29, "Sports": 30, "Super Power": 31, "Vampire": 32, "Harem": 35, "Slice of Life": 36,
  "Supernatural": 37, "Military": 38, "Police": 39, "Psychological": 40, "Thriller": 41,
  "Seinen": 42, "Josei": 43, "Mahou Shoujo": 66, "Isekai": 62, "Erotica": 49, "Gore": 58
};

const mapJikanStatus = (status: string): MediaStatus => {
  if (status === "Finished Airing" || status === "Finished") return MediaStatus.FINISHED;
  if (status === "Not yet aired" || status === "Not yet published") return MediaStatus.NOT_YET_RELEASED;
  return MediaStatus.ONGOING;
};

const mapJikanRelations = (relations: any[]): RelatedMedia[] => {
  if (!relations) return [];
  const result: RelatedMedia[] = [];
  relations.forEach((rel: any) => {
    rel.entry.forEach((entry: any) => {
      let type = MediaType.ANIME;
      if (entry.type === 'manga') type = MediaType.MANGA;
      result.push({
        relationType: rel.relation,
        mediaId: entry.mal_id,
        type: type,
        title: entry.name
      });
    });
  });
  return result;
};

const mapJikanItem = (item: any, forceType?: MediaType): MediaItem => {
  let type = forceType || MediaType.ANIME;
  if (!forceType || forceType === MediaType.MANGA) {
      const jType = item.type?.toLowerCase();
      if (['manga', 'manhwa', 'manhua', 'one-shot', 'doujin', 'doujinshi'].includes(jType)) {
        type = MediaType.MANGA;
      } else if (['light novel', 'novel'].includes(jType)) {
        type = MediaType.LN;
      } else if (['tv', 'movie', 'ova', 'special', 'ona'].includes(jType)) {
        type = MediaType.ANIME;
      }
  }
  const allGenres = [
      ...(item.genres?.map((g: any) => g.name) || []),
      ...(item.themes?.map((t: any) => t.name) || []),
      ...(item.demographics?.map((d: any) => d.name) || [])
  ];
  return {
    id: item.mal_id,
    title: {
      romaji: item.title,
      english: item.title_english || item.title,
      bengali: item.title 
    },
    coverImage: item.images.jpg.large_image_url || item.images.jpg.image_url,
    bannerImage: item.trailer?.images?.maximum_image_url || null,
    description: item.synopsis || "No description available.",
    type: type,
    status: mapJikanStatus(item.status),
    episodes: item.episodes || 0,
    chapters: item.chapters || 0,
    volumes: item.volumes || 0,
    genres: [...new Set(allGenres)],
    averageScore: item.score ? Math.round(item.score * 10) : 0, 
    season: item.season,
    year: item.year || (item.published?.from ? new Date(item.published.from).getFullYear() : undefined),
    studios: item.studios?.map((s: any) => s.name) || [],
    authors: item.authors?.map((a: any) => a.name) || [],
    duration: item.duration,
    rating: item.rating,
    source: item.source || "Original",
    format: item.type,
    relations: mapJikanRelations(item.relations)
  };
};

const fetchAniList = async (query: string, variables: any, signal?: AbortSignal) => {
  const response = await fetch(ANILIST_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ query, variables }),
    signal
  });
  if (!response.ok) throw new Error(`AniList API Error: ${response.statusText}`);
  const json = await response.json();
  if (json.errors) throw new Error(json.errors[0].message);
  return json.data;
};

const mapAniListItem = (item: any): MediaItem => {
    const authors = item.staff?.edges
        ?.filter((e: any) => e.role === 'Story' || e.role === 'Art')
        .map((e: any) => e.node.name.full) || [];
    return {
        id: item.id,
        title: {
            romaji: item.title.romaji || 'Unknown',
            english: item.title.english || item.title.romaji || 'Unknown',
            bengali: 'Unknown'
        },
        coverImage: item.coverImage.large,
        bannerImage: item.bannerImage,
        description: item.description || "No description available.",
        type: MediaType.LN,
        status: item.status === 'FINISHED' ? MediaStatus.FINISHED : 
                item.status === 'NOT_YET_RELEASED' ? MediaStatus.NOT_YET_RELEASED : MediaStatus.ONGOING,
        chapters: item.chapters || 0,
        volumes: item.volumes || 0,
        genres: item.genres || [],
        averageScore: item.averageScore || 0,
        year: item.startDate?.year,
        authors: [...new Set(authors)] as string[],
        studios: [], 
        rating: null,
        source: item.source || "Original",
        format: "Light Novel",
        relations: item.relations?.edges?.map((edge: any) => ({
            relationType: edge.relationType,
            mediaId: edge.node.idMal || edge.node.id,
            type: edge.node.type === 'ANIME' ? MediaType.ANIME : MediaType.MANGA,
            title: edge.node.title.english || edge.node.title.romaji
        })).filter((r: any) => r.mediaId) || []
    };
};

const wait = (ms: number, signal?: AbortSignal) => {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new DOMException('Aborted', 'AbortError'));
    
    const timer = setTimeout(resolve, ms);
    
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    }, { once: true });
  });
};

const fetchWithDelay = async (url: string, signal?: AbortSignal, retries = 2, backoff = 1200): Promise<any> => {
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  
  if (url.includes('jikan')) {
    await wait(800, signal);
  }
  
  try {
    const response = await fetch(url, { signal });
    if (response.status === 429 && retries > 0) {
      await wait(backoff, signal);
      return fetchWithDelay(url, signal, retries - 1, backoff * 2);
    }
    if (!response.ok) throw new Error(`API Error ${response.status}`);
    const data = await response.json();
    return data.data; 
  } catch (err: any) {
    if (err.name === 'AbortError') throw err;
    throw err;
  }
};

export type ApiMediaType = 'anime' | 'manga' | 'ln' | 'manhwa' | 'manhua' | 'hentai' | 'doujinshi';

const getJikanParams = (mediaType: ApiMediaType) => {
  const isAnime = ['anime', 'hentai'].includes(mediaType);
  const endpoint = isAnime ? 'anime' : 'manga';
  let params: string[] = [];

  if (mediaType === 'hentai') {
    params.push('rating=rx');
    params.push('sfw=false');
  } else if (mediaType === 'doujinshi') {
    params.push('type=doujin');
    params.push('sfw=false');
  } else if (mediaType === 'manhwa') {
    params.push('type=manhwa');
    params.push('sfw=false');
  } else if (mediaType === 'manhua') {
    params.push('type=manhua');
    params.push('sfw=false'); 
  } else {
    params.push('sfw=true');
    if (mediaType === 'manga') params.push('type=manga');
    else if (mediaType === 'ln') params.push('type=lightnovel');
  }

  return { endpoint, params, isAnime };
};

export const searchMedia = async (
  query: string, 
  filters?: SearchFilters, 
  mediaType: ApiMediaType = 'anime',
  signal?: AbortSignal
): Promise<MediaItem[]> => {
  if (mediaType === 'ln') {
    let aniListSort: string[] = ['POPULARITY_DESC'];
    if (filters) {
        const order = filters.sortOrder === 'asc' ? '' : '_DESC';
        if (filters.sortBy === 'score') aniListSort = [`SCORE${order}`];
        else if (filters.sortBy === 'newest') aniListSort = [`START_DATE${order}`];
        else if (filters.sortBy === 'title') aniListSort = [`TITLE_ENGLISH${order}`];
    }
    const aniQuery = `
      query ($search: String, $sort: [MediaSort], $genres: [String]) {
        Page(perPage: 20) {
          media(search: $search, sort: $sort, type: MANGA, format: NOVEL, genre_in: $genres) {
            id idMal title { romaji english } coverImage { large } bannerImage description status chapters volumes genres averageScore startDate { year } source
            staff { edges { role node { name { full } } } }
            relations { edges { relationType node { id idMal title { romaji english } type } } }
          }
        }
      }
    `;
    const vars: any = { search: query || undefined, sort: aniListSort };
    if (filters?.includedGenres.length) vars.genres = filters.includedGenres;
    const data = await fetchAniList(aniQuery, vars, signal);
    return data.Page.media.map((item: any) => mapAniListItem(item));
  } else {
    const { endpoint, params } = getJikanParams(mediaType);
    let url = `${JIKAN_BASE}/${endpoint}?q=${encodeURIComponent(query)}&${params.join('&')}`;
    if (filters) {
      if (filters.status !== 'all') {
          const statusMap: any = { 'airing': 'airing', 'complete': 'complete', 'upcoming': 'upcoming' };
          if (statusMap[filters.status]) url += `&status=${statusMap[filters.status]}`;
      }
      url += `&order_by=${filters.sortBy === 'newest' ? 'start_date' : filters.sortBy === 'popularity' ? 'popularity' : filters.sortBy === 'score' ? 'score' : 'title'}&sort=${filters.sortOrder}`;
      if (filters.includedGenres.length > 0) {
        const genreIds = filters.includedGenres.map(g => JIKAN_GENRE_MAP[g]).filter(id => id);
        if (genreIds.length) url += `&genres=${genreIds.join(',')}`;
      }
      if (filters.excludedGenres.length > 0) {
        const exGenreIds = filters.excludedGenres.map(g => JIKAN_GENRE_MAP[g]).filter(id => id);
        if (exGenreIds.length) url += `&genres_exclude=${exGenreIds.join(',')}`;
      }
    }
    const data = await fetchWithDelay(url, signal);
    return data.map((item: any) => mapJikanItem(item));
  }
};

export const getTrendingMedia = async (mediaType: ApiMediaType, signal?: AbortSignal): Promise<MediaItem[]> => {
  const { endpoint, params } = getJikanParams(mediaType);
  const filter = endpoint === 'anime' ? 'airing' : 'publishing';
  const url = `${JIKAN_BASE}/top/${endpoint}?${params.join('&')}&filter=${filter}`;
  const data = await fetchWithDelay(url, signal);
  return data.map((item: any) => mapJikanItem(item));
};

export const getTopMedia = async (mediaType: ApiMediaType, signal?: AbortSignal): Promise<MediaItem[]> => {
  const { endpoint, params } = getJikanParams(mediaType);
  const url = `${JIKAN_BASE}/top/${endpoint}?${params.join('&')}`;
  const data = await fetchWithDelay(url, signal);
  return data.map((item: any) => mapJikanItem(item));
};

export const getUpcomingMedia = async (mediaType: ApiMediaType, signal?: AbortSignal): Promise<MediaItem[]> => {
  const { endpoint, params } = getJikanParams(mediaType);
  const url = `${JIKAN_BASE}/top/${endpoint}?${params.join('&')}&filter=upcoming`;
  const data = await fetchWithDelay(url, signal);
  return data.map((item: any) => mapJikanItem(item));
};

export const getAiringSchedule = async (signal?: AbortSignal): Promise<MediaItem[]> => {
  const day = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date()).toLowerCase();
  const url = `${JIKAN_BASE}/schedules?filter=${day}&limit=12&sfw=true`;
  const data = await fetchWithDelay(url, signal);
  return (data || []).map((item: any) => mapJikanItem(item, MediaType.ANIME));
};

export const getMediaDetails = async (id: number | string, type: MediaType, signal?: AbortSignal): Promise<MediaItem | null> => {
    if (type === MediaType.LN) {
        const aniQuery = `
          query ($id: Int) {
            Media(id: $id, type: MANGA, format: NOVEL) {
              id idMal title { romaji english } coverImage { large } bannerImage description status chapters volumes genres averageScore startDate { year } source
              staff { edges { role node { name { full } } } }
              relations { edges { relationType node { id idMal title { romaji english } type } } }
            }
          }
        `;
        try {
            const data = await fetchAniList(aniQuery, { id: Number(id) }, signal);
            return mapAniListItem(data.Media);
        } catch (e: any) {
            if (e.name === 'AbortError') throw e;
            const url = `${JIKAN_BASE}/manga/${id}/full`;
            const data = await fetchWithDelay(url, signal);
            return mapJikanItem(data, MediaType.LN);
        }
    }
    const endpoint = type === MediaType.ANIME ? 'anime' : 'manga';
    const url = `${JIKAN_BASE}/${endpoint}/${id}/full`;
    const data = await fetchWithDelay(url, signal);
    return mapJikanItem(data, type);
};

export const getMediaEpisodes = async (id: number | string, signal?: AbortSignal): Promise<any[]> => {
    const url = `${JIKAN_BASE}/anime/${id}/episodes`;
    return await fetchWithDelay(url, signal);
};
