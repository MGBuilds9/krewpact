import { useDivision } from '@/contexts/DivisionContext';

export function useDivisionName(divisionId: string | null | undefined): {
  name: string;
  isLoading: boolean;
} {
  const { userDivisions, isLoading } = useDivision();

  if (isLoading) return { name: '', isLoading: true };
  if (!divisionId) return { name: 'All Divisions', isLoading: false };

  const found = userDivisions.find((d) => d.id === divisionId);
  return {
    name: found?.name ?? 'Unknown Division',
    isLoading: false,
  };
}
