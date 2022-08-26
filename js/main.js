/**
 * Plan d'expropriation et photographies du Faubourg à m'lasse
 */

(async () => {

  /**
   * Télécharger données (requête http)
   * Retourner application/geo+json content type
   * @todo voir https://geojson.org/geojson-ld/
   */
  const response = await fetch("./buildings.json"),
  geojsonFeatures = await response.json(),

  /**
   * Mapbox tiles
   * @todo encode access token
   */ 
  mapbox = L.tileLayer("https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}", {
    attribution: "Map data &copy; <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap</a> contributors, Imagery © <a href=\"https://www.mapbox.com/\">Mapbox</a>, Archives de Montréal",
    maxZoom: 20,
    id: "mapbox/streets-v11",
    tileSize: 512,
    zoomOffset: -1,
    accessToken: "pk.eyJ1IjoiZGF2dmFsZW50IiwiYSI6ImNrdmluZjh6cTBnYjkydXFna3lnOWRwM3oifQ.7qwZCUJ2JW2WFJ8JtDQfUg"
  }),

  /**
   * Données de la couche du plan d'expropriation
   * @todo Tuiles
   */ 
  imageUrl = "img/plan-fond-transparent-min.png",
  imageBounds = [
    [45.5155088875666, -73.55432183482827],
    [45.52127103906887, -73.54793549518355]
  ],

  // Couche du plan
  plan = L.imageOverlay(imageUrl, imageBounds, {
    opacity: 0.7,
    alt: "Plan d'expropriation du Faubourg à M'lasse"
  }),

  // Instantiation de la carte
  mlasse = L.map("map", {
    layers: [mapbox, plan]
  }).setView([45.51823567357893, -73.55085910368373], 18),

  // Couche GeoJSON
  geoJSON = L.geoJSON(geojsonFeatures, {
    onEachFeature: (feature, layer) => {
      if (feature.properties) {
        const informationsPopUp = `
          <b>Informations</b>
          <ul>
            <li>${feature.properties["rdfs:label"]}</li>
            <li>${feature.properties["qdmtl:thoroughfare"]}</li>
            <li>${feature.properties["inventoryNumber"]}</li>
          </ul>
        `
        layer.bindPopup(informationsPopUp);
      }
    }
  }),

  // Contrôles
  overlayMaps = {
    "<span class=\"controles\">Plan d'expropriation</span>": plan,
    "<span class=\"controles\">Institutions</span>": geoJSON/*,
    "<span class=\"controles\">Utilisation du sol</span>": foo,
    "<span class=\"controles\">Photographies aériennes des archives</span>": foo,
    "<span class=\"controles\">Plan d'assurance</span>": foo,*/
  };

  L.control.layers(null, overlayMaps).addTo(mlasse);
  geoJSON.addTo(mlasse);

})();

