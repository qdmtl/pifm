/**
 * Plan interactif du Faubourg à m’lasse (PIFM)
 * 
 * intégration des données structurées du projet QDMTL
 * intégration des photograpies d’archives
 * intégration du plan d’expropriation du Fabourg à m’lasse
 *
 * @requires module:leaflet
 * @author David Valentine <d@ntnlv.ca>
 * @todo loading messages
 * @todo error handling
 * @todo ordre de chargement optimal des couches
 * @todo english for code review
 * @todo voir https://geojson.org/geojson-ld/
 * @todo voir linked places format
 * @todo protocole de geolocalisation : si geojson.io,, charger buildings.json
 */

(async () => {

  let response;

  /** URLs assignments */
  let tilesUrl = "https://ntnlv.ca/faubourg/tiles/{z}/{x}/{y}.png",
    tripleStoreEndpointUrl = "http://qdmtl.ca/sparql/endpoint.php";

  /**
   * Fetch values for dev env 
   * Store dev env values in session storage
   * ./js/config.json is .gitignored
   */
  if (dev()) {

    response = await fetch("./js/config.json");
    const devConfiguration = await response.json();

    for (const prop in devConfiguration) {
      sessionStorage.setItem(prop, devConfiguration[prop]);
    }

    tilesUrl = devConfiguration.devTilesUrl;

    if (!devConfiguration.onLineTripleStore) {
      tripleStoreEndpointUrl = devConfiguration.devTripleStoreEndpointUrl;
    }
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
    console.log("Dev:", sparqlResults);
  };

  let featuresArray = [];

  /**
   * making of geoJSON object
   */
  sparqlResults.results.bindings.forEach(feature => {

    featuresArray.push({
      "type": "Feature",
      "properties": {
        "URI": feature.a.value
      },
      "geometry": JSON.parse(feature.b.value)
    });
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
    pifm = L.map("map", {
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
    });

  /**
   * Créer un pane pour la fenêtre pop-up
   * @todo lire doc pour la méthode createPane
   * "Panes are DOM elements used to control the ordering of layers on the map."
   * https://leafletjs.com/reference.html#map-pane
   */
  pifm.createPane('fixed', document.querySelector("#map"));

  /** GeoJSON Layer */
  const geoJSON = L.geoJSON(geojsonFeaturesFromTripleStore, {

    onEachFeature: (feature, layer) => {

      const popup = L.popup({
        pane: 'fixed',
        className: 'popup-fixed',
        autoPan: false,
        maxWidth: 2000 // must be larger than 50% of the viewport
      });

      layer.bindPopup(popup);

      layer.on("click", () => {

        let URI = feature.properties.URI;

        if (dev()) {

          console.log("Dev: Message fired when clicking the geoJSON feature (the marker).");

          if (sessionStorage.getItem("onLineTripleStore") !== "true") {
            URI = feature.properties.URI.replace("http://data.qdmtl.ca", sessionStorage.getItem("devTripleStoreUrl"));
          }
        }

        /**
         * Fetching the ressource
         * Thenable since await is not allowed if not at top level
         */
        fetch(URI, {
          method: "GET",
          headers: {
            "Accept": "application/ld+json",
          }
        })
        .then((response) => response.json())
        .then((jsonLD) => {

          if (dev) {
            console.log("Dev: Response from local server:", jsonLD);
          }
          
          const popUpInformation = `
            <h1>${feature.properties.URI}</h1>
            <pre>${JSON.stringify(jsonLD, undefined, 2)}</pre>
          `;

          popup.setContent(popUpInformation);
        },
        (reason) => {
            /* rejection handler */
        });
        
        /**
         * Déplacement et centrage de la punaise
         */
        let targetLatLng = L.latLng(
          /** Coordonnées sont inversées avec GeoJSON */
          feature.geometry.coordinates[1],
          feature.geometry.coordinates[0],
        );
        const targetZoom = 20,
          popUpWidth = document.querySelector(".leaflet-popup").clientWidth,
          targetPoint = pifm.project(targetLatLng, targetZoom).subtract([popUpWidth / 2, 0]);
        targetLatLng = pifm.unproject(targetPoint, targetZoom);
        pifm.setView(targetLatLng, targetZoom);
      });
    }
  }),

    /** Layers control data */
    overlayMaps = {
      "<span class=\"controles\">Plan d'expropriation</span>": faubourgLayer,
      "<span class=\"controles\">Bâtiments</span>": geoJSON,
    };

    L.control.layers(null, overlayMaps).addTo(pifm);
    L.control.zoom({position:"topright"}).addTo(pifm);
    L.control.scale().addTo(pifm);
    geoJSON.addTo(pifm);

  if (dev()) {
    pifm.on("popupopen", () => console.log("Dev: Message fired on pop-up opening"));
    console.log("Dev:", pifm.getPanes());
  };

})();

/**
 * dev env tester
 * @returns boolean
 */
function dev() {
  return (location.host === "localhost" || location.host === "127.0.0.1")
    ? true
    : false;
}