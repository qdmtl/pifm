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

  let response;

  /** URLs assignments */
  let tilesUrl = "https://ntnlv.ca/faubourg/tiles/{z}/{x}/{y}.png",
    tripleStoreEndpointUrl = "http://qdmtl.ca/sparql/endpoint.php";

  /** Fetch values for dev env */
  if (dev()) { // develop
    response = await fetch("./js/config.json"); // config.json is .gitignored
    const dev = await response.json();
    tilesUrl = dev.devUrl;
    tripleStoreEndpointUrl = dev.tripleStoreEndpointUrl;
  }

  /** SPARQL query */
  const buildingsQuery = "query=" + encodeURIComponent(
    "PREFIX ecrm:<http://erlangen-crm.org/current/>PREFIX geo:<http://www.opengis.net/ont/geosparql#>SELECT ?a ?b WHERE{?a a <http://onto.qdmtl.ca/E24_Building>;ecrm:P53_has_former_or_current_location ?c.?c ecrm:P168_place_is_defined_by ?d.?d geo:asGeoJSON ?b.}"
    );

  /**
   * fetching data from triple store
   * buildings and geographic coordinates
   */
  response = await fetch(tripleStoreEndpointUrl, {
    method: "POST",
    headers: {
      "Accept": "application/sparql-results+json",
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: buildingsQuery
  });
  const sparqlResults = await response.json();
  if (dev()) { // develop
    console.log(sparqlResults);
  };

  /**
   * making of geoJSON object
   */
  let featuresArray = [];
  sparqlResults.results.bindings.forEach(feature => {
    featuresArray.push(
      {
        "type": "Feature",
        "properties": {
          "URI": feature.a.value
        },
        "geometry": JSON.parse(feature.b.value)
  }
    )
  });
  const geojsonFeaturesFromTripleStore = {
    "type": "FeatureCollection",
    "features": featuresArray
  };
  if (dev()) { // develop
    console.log(geojsonFeaturesFromTripleStore);
  };

  /** 
   * Base Layer
   * Photos aériennes 
   */
  const baseLayer = L.tileLayer("https://mt0.google.com/vt/lyrs=s&x={x}&y={y}&z={z}", {
  attribution: "🇺🇦 Map data &copy; QDMTL, Imagery © Google, Archives de Montréal",
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