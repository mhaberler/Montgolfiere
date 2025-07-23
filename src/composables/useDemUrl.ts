import { usePersistedRef } from '@/composables/usePersistedRef';

// Shared DEM URL state - persistent across app restarts
export const selectedDemUrl = usePersistedRef<string>(
  'selectedDemUrl', 
  'https://static.mah.priv.at/cors/dem/DTM_Austria_10m_v2_by_Sonny.pmtiles'
);
