import { useQuery } from '@tanstack/react-query';
import { fetchSpotlightTokens } from '../services/launchMemeApi';

export const useSpotlightTokens = () =>
  useQuery({
    queryKey: ['tokens', 'spotlight'],
    queryFn: () => fetchSpotlightTokens(),
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000
  });

