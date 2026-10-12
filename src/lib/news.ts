import * as Location from 'expo-location';

import type { Coords } from './types';

export type NewsItem = {
  id: string;
  title: string;
  url: string;
  source: string;
  publishedAt: number;
};

export type Place = { city: string; region?: string; countryCode: string };

const decode = (s: string) =>
  s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .trim();

const tag = (xml: string, name: string) => {
  const m = xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`));
  return m ? decode(m[1]) : '';
};

/** Convierte la ubicación en ciudad/país para buscar noticias de la zona. */
export async function placeFor(coords: Coords): Promise<Place | null> {
  try {
    const [p] = await Location.reverseGeocodeAsync(coords);
    const city = p?.city ?? p?.subregion ?? p?.district ?? p?.region;
    if (!city) return null;
    return { city, region: p.region ?? undefined, countryCode: (p.isoCountryCode ?? 'AR').toUpperCase() };
  } catch {
    return null;
  }
}

function parseRss(xml: string, fallbackSource: string): NewsItem[] {
  return (xml.match(/<item>[\s\S]*?<\/item>/g) ?? []).flatMap((item) => {
    let title = tag(item, 'title');
    const url = tag(item, 'link');
    if (!title || !url) return [];
    // Google News y Bing agregan " - Medio" al final del título.
    let source = tag(item, 'source') || tag(item, 'News:Source') || fallbackSource;
    if (source && title.endsWith(` - ${source}`)) title = title.slice(0, -(source.length + 3));
    const publishedAt = Date.parse(tag(item, 'pubDate')) || Date.now();
    return [{ id: url, title, url, source, publishedAt }];
  });
}

async function fetchFeed(url: string, source: string): Promise<NewsItem[]> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`news ${res.status}`);
  return parseRss(await res.text(), source);
}

/**
 * Noticias locales de la ciudad del usuario, de Google Noticias y Bing Noticias (que reúnen a los
 * medios locales). La búsqueda va acotada a la ciudad y a los últimos días.
 */
export async function fetchLocalNews(place: Place): Promise<NewsItem[]> {
  const query = encodeURIComponent(`"${place.city}"`);
  const cc = place.countryCode;
  const feeds = [
    fetchFeed(
      `https://news.google.com/rss/search?q=${query}%20when:7d&hl=es-419&gl=${cc}&ceid=${cc}:es-419`,
      'Google Noticias',
    ),
    fetchFeed(`https://www.bing.com/news/search?q=${query}&format=rss&setlang=es&cc=${cc}`, 'Bing Noticias'),
  ];
  const results = await Promise.allSettled(feeds);
  if (results.every((r) => r.status === 'rejected')) throw new Error('news unavailable');

  const seen = new Set<string>();
  return results
    .flatMap((r) => (r.status === 'fulfilled' ? r.value : []))
    .filter((n) => {
      const key = n.title.toLowerCase().slice(0, 60);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => b.publishedAt - a.publishedAt)
    .slice(0, 40);
}
