import { usePersistedRef } from '@/composables/usePersistedRef';

// Shared DEM URL state - persistent across app restarts
export const selectedDemUrl = usePersistedRef<string>(
  'selectedDemUrl', 
  'https://static.mah.priv.at/cors/dem/eudem_dem_4258_europe.pmtiles'
);

