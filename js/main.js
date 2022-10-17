/**
 * Le Faubourg à m’lasse en ligne (FML)
 * 
 * Plan interactif du Faubourg à m’lasse (secteur Radio-Canada) intégrant des données
 * structurées, des photograpies d’archives, des cartes historiques et d’autres données.
 *
 * @requires module:leaflet
 * @author David Valentine <d@ntnlv.ca>
 */

/**
 * Mapbox config
 * @todo encode access token
 */ 
const mapBoxURL = "https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}",
mapBoxConfig = {
  attribution: "Map data &copy; <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap</a> contributors, Imagery © <a href=\"https://www.mapbox.com/\">Mapbox</a>, Archives de Montréal",
  id: "mapbox/streets-v11",
  accessToken: "pk.eyJ1IjoiZGF2dmFsZW50IiwiYSI6ImNrdmluZjh6cTBnYjkydXFna3lnOWRwM3oifQ.7qwZCUJ2JW2WFJ8JtDQfUg"
};

(async () => {

  /**
   * Télécharger données (requête http)
   * Retourner application/geo+json content type
   * @todo voir https://geojson.org/geojson-ld/
   * @todo voir linked places format
   */
  const response = await fetch("./buildings.json"),
  geojsonFeatures = await response.json(),

  /** Base Layer */
  baseLayer = L.tileLayer("https://mt0.google.com/vt/lyrs=s&x={x}&y={y}&z={z}", {
  attribution: "Map data &copy; <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap</a> contributors, Imagery © Google, Archives de Montréal",
    maxZoom: 20,
    tileSize: 256
  }),

  /** Faubourg Layer */ 
   faubourgLayer = L.tileLayer("https://ntnlv.ca/faubourg/tiles/{z}/{x}/{y}.png", {
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

