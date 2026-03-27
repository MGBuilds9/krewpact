import type { ApolloSearchParams } from './apollo';

export interface ApolloSearchProfile {
  id: string;
  name: string;
  divisionCode: string;
  vertical: string;
  searchParams: ApolloSearchParams;
  intentTopics?: string[];
  creditBudgetPerWeek: number;
  priority: number; // 1=high, 2=medium, 3=low
  batchSize: number;
  isActive: boolean;
}

export { MDM_SEARCH_PROFILES } from './apollo-profile-data';
import { MDM_SEARCH_PROFILES } from './apollo-profile-data';

export function getProfileById(id: string): ApolloSearchProfile | undefined {
  return MDM_SEARCH_PROFILES.find((p) => p.id === id);
}

export function getActiveProfiles(): ApolloSearchProfile[] {
  return MDM_SEARCH_PROFILES.filter((p) => p.isActive);
}

export function getProfilesByDivision(divisionCode: string): ApolloSearchProfile[] {
  return MDM_SEARCH_PROFILES.filter((p) => p.isActive && p.divisionCode === divisionCode);
}

/**
 * Get profiles scheduled for a given week using weighted round-robin.
 * High-priority (1): 3 runs/month → ~every week
 * Medium-priority (2): 2 runs/month → every other week
 * Low-priority (3): 1 run/month → every 4th week
 */
export function getProfilesForWeek(weekNumber: number): ApolloSearchProfile[] {
  const active = getActiveProfiles().sort((a, b) => a.priority - b.priority);

  return active.filter((profile) => {
    switch (profile.priority) {
      case 1:
        return true; // every week
      case 2:
        return weekNumber % 2 === 0; // every other week
      case 3:
        return weekNumber % 4 === 0; // every 4th week
      default:
        return false;
    }
  });
}

/**
 * Calculate the week number (since epoch) for rotation scheduling.
 */
export function getWeekNumber(date: Date = new Date()): number {
  return Math.floor(date.getTime() / (7 * 24 * 60 * 60 * 1000));
}
