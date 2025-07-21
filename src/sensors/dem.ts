
import { ref, watch } from "vue";
import { location } from "./location";
import { DEMLookup } from "../dem/DEMLookup";

const demLookup = ref(null);
const demUrl = ref('https://static.mah.priv.at/cors/DTM_Italy_20m_v2b_by_Sonny.pmtiles');


watch(location, (newlocation) => {
    console.log(`location is ${newlocation}`)
    // lookup elevation here
})

watch(
    demUrl,
    (newdemUrl, olddemUrl) => {
        console.log(`DEM url is ${newdemUrl}, old = ${olddemUrl}`);

        // instantiate DEMlookupp here
    },
    { immediate: true }
)

function startDEMLookup() {
    console.log("startDEMLookup")
}

export {
    demLookup,
    demUrl,
    startDEMLookup
} 