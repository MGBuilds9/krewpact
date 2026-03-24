import { useDivision } from '@/contexts/DivisionContext';

export function useDivisionName(divisionId: string | null | undefined): {
  name: string;
  isLoading: boolean;
} {
  const { getDivisionName, isLoading } = useDivision();
  return {
    name: isLoading ? '' : getDivisionName(divisionId),
    isLoading,
  };
}
