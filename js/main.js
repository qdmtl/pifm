/**
 * Plan interactif du Faubourg à m’lasse (PIFM)
 * 
 * Plan interactif du Faubourg à m’lasse (secteur Radio-Canada) intégrant des données
 * structurées, des photograpies d’archives, des cartes historiques et d’autres données.
 *
 * @requires module:leaflet
 * @author David Valentine <d@ntnlv.ca>
 */

(async () => {

  /**
   * Télécharger données (requête http)
   * Retourner application/geo+json content type
   * @todo voir https://geojson.org/geojson-ld/
   * @todo voir linked places format
   */
  let response = await fetch("./buildings.json");
  const geojsonFeatures = await response.json();

  /** FAML Tiles */
  let tilesUrl = "https://ntnlv.ca/faubourg/tiles/{z}/{x}/{y}.png";

  /** Localhost tiles for dev */
  if (location.host === "localhost" || location.host === "127.0.0.1") {
    response = await fetch("./js/config.json");
    tilesUrl = await response.json();
    tilesUrl = tilesUrl.devUrl;
  }

  /** Base Layer */
  const baseLayer = L.tileLayer("https://mt0.google.com/vt/lyrs=s&x={x}&y={y}&z={z}", {
  attribution: "Map data &copy; QDMTL, Imagery © Google, Archives de Montréal",
    maxZoom: 20,
    tileSize: 256
  }),

  /** FAML Layer */
  faubourgLayer = L.tileLayer(tilesUrl, {
    maxZoom: 20,
    tileSize: 256,
    opacity: 1
  }),

  /** GeoJSON Layer */
  geoJSON = L.geoJSON(geojsonFeatures, {
    onEachFeature: (feature, layer) => {
      if (feature.properties) {
        const informationsPopUp = `
          <b>${feature.properties["appellation"]}</b>
          <ul>
            <li>${feature.properties["appellation"]}</li>
            <li>${feature.properties["rdfs:label"]}</li>
            <li>${feature.properties["qdmtl:thoroughfare"]}</li>
            <li>${feature.properties["inventoryNumber"]}</li>
          </ul>
        `
        layer.bindPopup(informationsPopUp);
      }
    }
  }),

  /** Controls */
  overlayMaps = {
    "<span class=\"controles\">Plan d'expropriation</span>": faubourgLayer,
    "<span class=\"controles\"></span>": geoJSON,
  },

  /**
   * Overlay Map
   * @deprecated
   */
  imageUrl = "img/plan-fond-transparent-min.png",
  imageBounds = [
    [45.5155088875666, -73.55432183482827],
    [45.52127103906887, -73.54793549518355]
  ],
  plan = L.imageOverlay(imageUrl, imageBounds, {
    opacity: 1,
    alt: "Plan d'expropriation du Faubourg à M'lasse"
  }),

  /** Instantiation du plan */
  planDuFaubourg = L.map("map", {
    center: [45.51823567357893, -73.55085910368373],
    zoom: 17.5,
    minZoom: 15,
    zoomDelta: 0.5,
    layers: [
      baseLayer,
      faubourgLayer
    ]
  });

  L.control.layers(null, overlayMaps).addTo(planDuFaubourg);
  geoJSON.addTo(planDuFaubourg);

})();