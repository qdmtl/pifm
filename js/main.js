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

  /** 
   * Base Layer
   * Photos aériennes 
   */
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

    /** Instanciation du plan */
    planDuFaubourg = L.map("map", {
      center: [45.51823567357893, -73.55085910368373],
      zoom: 17.5,
      minZoom: 15,
      zoomDelta: 0.5,
      zoomSnap: 0.5,
      zoomControl: false,
      layers: [
        baseLayer,
        faubourgLayer
      ]
    }),

    /**
     * Créer un pane pour la fenêtre pop-up
     * @todo lire doc pour la méthode createPane
     * "Panes are DOM elements used to control the ordering of layers on the map."
     * https://leafletjs.com/reference.html#map-pane
     */
    informationPane = planDuFaubourg.createPane('fixed', document.querySelector("#map")),

    /** GeoJSON Layer */
    geoJSON = L.geoJSON(geojsonFeatures, {
      onEachFeature: (feature, layer) => {
        if (feature.properties) {

          const popUpInformation = `
            <div class="classe-ajoutée-dans-le-but-de-placer-limage-pricipale">
              <h1>${feature.properties["appellation"]}</h1>
              <ul>
                <li>${feature.properties["appellation"]}</li>
                <li>${feature.properties["rdfs:label"]}</li>
                <li>${feature.properties["qdmtl:thoroughfare"]}</li>
                <li>${feature.properties["inventoryNumber"]}</li>
              </ul>
            </div>
          `,

            popup = L.popup({
              pane: 'fixed',
              className: 'popup-fixed',
              autoPan: false
            }).setContent(popUpInformation);

          layer.bindPopup(popup);

          layer.on("click", () => {
            console.log("Message fired when clicking the geoJSON feature (the marker).");
            
            /**
             * Trois prochaines instructions
             * Déplacement et centrage de la punaise
             */
            let targetLatLng = L.latLng(
              /** Coordonnées sont inversées avec GeoJSON */
              feature.geometry.coordinates[1],
              feature.geometry.coordinates[0],
            );
            const targetZoom = 20,
              popUpWidth = document.querySelector(".leaflet-popup").clientWidth,
              targetPoint = planDuFaubourg.project(targetLatLng, targetZoom).subtract([popUpWidth / 2, 0]);
            targetLatLng = planDuFaubourg.unproject(targetPoint, targetZoom);
            planDuFaubourg.setView(targetLatLng, targetZoom);
          })
        }
      }
    }),

    /** Layers control data */
    overlayMaps = {
      "<span class=\"controles\">Plan d'expropriation</span>": faubourgLayer,
      "<span class=\"controles\">Bâtiments</span>": geoJSON,
    },

    addLayerControl = L.control.layers(null, overlayMaps).addTo(planDuFaubourg),
    addZoomControl = L.control.zoom({position:"topright"}).addTo(planDuFaubourg),
    addScale = L.control.scale().addTo(planDuFaubourg),
    addJsonLayer = geoJSON.addTo(planDuFaubourg);

  planDuFaubourg.on("popupopen", () => {
      console.log("Message fired on pop-up opening");
    }
  );

  console.log(planDuFaubourg.getPanes());

})();