'use client';

import { Brain, ExternalLink, Globe, MapPin, Newspaper, User } from 'lucide-react';

import { Badge } from '@/components/ui/badge';

export interface EnrichmentData {
  google_maps?: {
    address?: string;
    google_rating?: number;
    google_reviews_count?: number;
    business_status?: string;
    place_id?: string;
    types?: string[];
  };
  brave?: {
    website?: string;
    description?: string;
    news_snippets?: string[];
    social_profiles?: string[];
  };
  apollo_match?: {
    email?: string;
    phone?: string;
    title?: string;
    linkedin_url?: string;
    first_name?: string;
    last_name?: string;
  };
  tavily?: {
    answer?: string;
    results?: Array<{ title?: string; url?: string; content?: string }>;
  };
  ai_summary?: string;
  deep_research?: {
    research_report?: string;
    sources?: string[];
    researched_at?: string;
  };
}

function StarRating({ rating }: { rating: number }) {
  const fullStars = Math.floor(rating);
  const hasHalf = rating - fullStars >= 0.5;
  const stars = [0, 1, 2, 3, 4];
  return (
    <span className="inline-flex items-center gap-0.5">
      {stars.map((i) => (
        <span
          key={i}
          className={
            i < fullStars
              ? 'text-yellow-500'
              : i === fullStars && hasHalf
                ? 'text-yellow-400'
                : 'text-gray-300'
          }
        >
          {i < fullStars ? '\u2605' : i === fullStars && hasHalf ? '\u2605' : '\u2606'}
        </span>
      ))}
      <span className="ml-1 text-sm font-medium">{rating}</span>
    </span>
  );
}

export function AiSummarySection({ summary }: { summary: string }) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-2">
        <Brain className="h-4 w-4 text-purple-500" />
        <h4 className="text-sm font-semibold">AI Summary</h4>
      </div>
      <p className="text-sm text-muted-foreground italic leading-relaxed">
        &ldquo;{summary}&rdquo;
      </p>
    </section>
  );
}

export function DeepResearchSection({
  deep_research,
}: {
  deep_research: NonNullable<EnrichmentData['deep_research']>;
}) {
  if (!deep_research.research_report) return null;
  return (
    <section>
      <div className="flex items-center gap-2 mb-2">
        <Brain className="h-4 w-4 text-indigo-500" />
        <h4 className="text-sm font-semibold">Deep Research</h4>
        {deep_research.researched_at && (
          <span className="text-xs text-muted-foreground">
            {new Date(deep_research.researched_at).toLocaleDateString('en-CA')}
          </span>
        )}
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
        {deep_research.research_report}
      </p>
      {deep_research.sources && deep_research.sources.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {deep_research.sources.map((src, idx) => (
            <a
              key={src}
              href={src}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-500 hover:underline"
            >
              Source {idx + 1}
            </a>
          ))}
        </div>
      )}
    </section>
  );
}

export function GoogleMapsSection({
  google_maps,
}: {
  google_maps: NonNullable<EnrichmentData['google_maps']>;
}) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-2">
        <MapPin className="h-4 w-4 text-red-500" />
        <h4 className="text-sm font-semibold">Google Maps</h4>
      </div>
      <div className="space-y-1 text-sm">
        {google_maps.address && <p className="text-muted-foreground">{google_maps.address}</p>}
        <div className="flex items-center gap-3 flex-wrap">
          {google_maps.google_rating != null && (
            <span>
              <StarRating rating={google_maps.google_rating} />
              {google_maps.google_reviews_count != null && (
                <span className="text-muted-foreground text-xs ml-1">
                  ({google_maps.google_reviews_count} reviews)
                </span>
              )}
            </span>
          )}
          {google_maps.business_status && (
            <Badge
              variant={google_maps.business_status === 'OPERATIONAL' ? 'default' : 'secondary'}
              className="text-xs"
            >
              {google_maps.business_status}
            </Badge>
          )}
        </div>
      </div>
    </section>
  );
}

export function WebPresenceSection({ brave }: { brave: NonNullable<EnrichmentData['brave']> }) {
  const websiteHref = brave.website
    ? brave.website.startsWith('http')
      ? brave.website
      : `https://${brave.website}`
    : null;
  return (
    <section>
      <div className="flex items-center gap-2 mb-2">
        <Globe className="h-4 w-4 text-blue-500" />
        <h4 className="text-sm font-semibold">Web Presence</h4>
      </div>
      <div className="space-y-1 text-sm">
        {websiteHref && (
          <a
            href={websiteHref}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline inline-flex items-center gap-1"
          >
            {new URL(websiteHref).hostname}
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
        {brave.description && (
          <p className="text-muted-foreground line-clamp-3">{brave.description}</p>
        )}
        {brave.social_profiles && brave.social_profiles.length > 0 && (
          <div className="flex gap-2 mt-1">
            {brave.social_profiles.map((url) => {
              let network = 'Link';
              try {
                network = new URL(url.startsWith('http') ? url : `https://${url}`).hostname
                  .replace('www.', '')
                  .split('.')[0];
              } catch {
                /* use default */
              }
              return (
                <a
                  key={url}
                  href={url.startsWith('http') ? url : `https://${url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-500 hover:underline capitalize"
                >
                  {network}
                </a>
              );
            })}
          </div>
        )}
        {brave.news_snippets && brave.news_snippets.length > 0 && (
          <div className="mt-2">
            <h5 className="text-xs font-medium text-muted-foreground mb-1">Recent News</h5>
            <ul className="space-y-0.5">
              {brave.news_snippets.slice(0, 3).map((snippet) => (
                <li key={snippet} className="text-xs text-muted-foreground">
                  • {snippet}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}

export function PrimaryContactSection({
  apollo_match,
}: {
  apollo_match: NonNullable<EnrichmentData['apollo_match']>;
}) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-2">
        <User className="h-4 w-4 text-green-500" />
        <h4 className="text-sm font-semibold">Primary Contact</h4>
      </div>
      <div className="text-sm space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          {apollo_match.first_name && (
            <span className="font-medium">
              {apollo_match.first_name} {apollo_match.last_name}
            </span>
          )}
          {apollo_match.title && (
            <span className="text-muted-foreground">{apollo_match.title}</span>
          )}
        </div>
        <div className="flex items-center gap-3 flex-wrap text-muted-foreground">
          {apollo_match.email && <span>{apollo_match.email}</span>}
          {apollo_match.phone && <span>{apollo_match.phone}</span>}
          {apollo_match.linkedin_url && (
            <a
              href={apollo_match.linkedin_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline inline-flex items-center gap-1"
            >
              LinkedIn <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </div>
    </section>
  );
}

export function NewsIntelSection({ tavily }: { tavily: NonNullable<EnrichmentData['tavily']> }) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-2">
        <Newspaper className="h-4 w-4 text-orange-500" />
        <h4 className="text-sm font-semibold">News &amp; Intel</h4>
      </div>
      <div className="space-y-2 text-sm">
        {tavily.answer && <p className="text-muted-foreground line-clamp-3">{tavily.answer}</p>}
        {tavily.results && tavily.results.length > 0 && (
          <ul className="space-y-1">
            {tavily.results.slice(0, 3).map((result) => (
              <li key={result.url ?? result.title}>
                <a
                  href={result.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline text-xs inline-flex items-center gap-1"
                >
                  {result.title} <ExternalLink className="h-3 w-3" />
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
