/**
 * Plan interactif du Faubourg à m’lasse (PIFM)
 * 
 * intégration des données structurées du projet QDMTL
 * intégration des photograpies d’archives
 * intégration du plan d’expropriation du Fabourg à m’lasse
 *
 * @author David Valentine <d@ntnlv.ca>
 * @todo rdfa
 * @todo loading messages for body tag (chargement)
 * @todo cache
 * @todo error handling
 * @todo build process and cp in dist folder for deployment
 * @todo get rid of warnings liens source (map)
 * @todo voir https://geojson.org/geojson-ld/
 * @todo voir linked places format
 * @todo geolocalisation : si geojson.io, charger buildings.json
 * @todo geolocalisation : voir placemark @placemarkio
 */

(async function main() {

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
  const sparqlResponse = await response.json();

  if (dev()) { // develop
    console.log("Dev: sparqlResponse", sparqlResponse);
  };

  /**
   * making of geoJSON object
   * function expression to be called
   */
  const geojsonFeatures = (sparqlJson) => {

    let featuresArray = [];

    sparqlJson.results.bindings.forEach(feature => {

      featuresArray.push({
        "type": "Feature",
        "properties": {
          "URI": feature.a.value
        },
        "geometry": JSON.parse(feature.b.value)
      });
    });

    const geojsonFeatures = {
      "type": "FeatureCollection",
      "features": featuresArray
    };

    if (dev()) { // develop
      console.log("Dev geojsonFeatures:", geojsonFeatures);
    };

    return geojsonFeatures;
    
  };

  /** GeoJSON Layer */
  const geoJSON = L.geoJSON(geojsonFeatures(sparqlResponse), {

    onEachFeature: (feature, layer) => {

      const popup = L.popup({
        pane: 'fixed',
        className: 'popup-fixed',
        autoPan: false,
        maxWidth: 2000 // must be larger than 50% of the viewport
      });

      layer.bindPopup(popup);

      /** Event passé automatiquement au callback */
      layer.on("click", (e) => {

        let URI = feature.properties.URI;

        if (dev()) {
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
            console.log("Dev: Response from RDF store: ", jsonLD);
          }
          
          const popUpInformation = `

          <div id="loader">
              <div class="spinner"></div>
              <p>Chargement</p>
            </div>

            <div class="glide">

              <div class="glide__track" data-glide-el="track">
                <ul class="glide__slides">
                  <li class="glide__slide">
                    <img
                      src="https://archivesdemontreal.ica-atom.org/uploads/r/ville-de-montreal-section-des-archives/1/7/178126/VM94C196-0132.jpg"
                      alt="foo"
                      title="bar">
                    <div class="overlay"></div>
                  </li>
                  <li class="glide__slide">
                    <img src="https://archivesdemontreal.ica-atom.org/uploads/r/ville-de-montreal-section-des-archives/1/8/184246/VM94C196-0839.jpg">
                    <div class="overlay"></div>
                  </li>
                  <li class="glide__slide">
                    <img src="https://archivesdemontreal.ica-atom.org/uploads/r/ville-de-montreal-section-des-archives/1/7/177798/VM94C196-0038.jpg">
                    <div class="overlay"></div>
                  </li>
                </ul>
              </div>

              <div class="glide__arrows" data-glide-el="controls">
                <button class="slider__arrow slider__arrow--left glide__arrow glide__arrow--left" data-glide-dir="<">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24">
                    <path fill="#fff" d="M15.293 3.293 6.586 12l8.707 8.707 1.414-1.414L9.414 12l7.293-7.293-1.414-1.414z"/>
                  </svg>
                </button>
                <button class="slider__arrow slider__arrow--right glide__arrow glide__arrow--right" data-glide-dir=">">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24">
                    <path fill="#fff" d="M7.293 4.707 14.586 12l-7.293 7.293 1.414 1.414L17.414 12 8.707 3.293 7.293 4.707z"/>
                  </svg>
                </button>
              </div>
            </div>
          
            <div class="rdf-data">
              <h1>${feature.properties.URI}</h1>
              <div>
                <pre>${JSON.stringify(jsonLD, undefined, 2)}</pre>
              </div>
            </div>
          `;

          popup.setContent(popUpInformation);

          if (dev()) {
            console.log("Dev popup:", popup);
          }  

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

          setTimeout(() => {

            const glide = new Glide(".glide", {
              type: 'carousel',
              perView: 2,
              focusAt: "center",
              gap: 4,
              animationDuration: 200,
              keyboard: true
            });

            glide.mount();

            let loader = document.querySelector("#loader");

            loader.style.display = "none";

          }, 1000);
        },
        (reason) => {
            /* rejection handler */
        }).catch(err => console.log(err));
      });
    }
  }),

    /** 
     * Base Layer
     * Photos aériennes
     */
    baseLayer = L.tileLayer("https://mt0.google.com/vt/lyrs=s&x={x}&y={y}&z={z}", {
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
      zoom: 18, // https://github.com/Leaflet/Leaflet/issues/3575
      minZoom: 15,
      zoomDelta: 0.5,
      zoomSnap: 0.5,
      zoomControl: false,

      layers: [
        baseLayer,
        faubourgLayer,
        geoJSON
      ]
    });

  /**
   * Créer un pane pour la fenêtre pop-up
   * "Panes are DOM elements used to control the ordering of layers on the map."
   * https://leafletjs.com/reference.html#map-pane
   */
  pifm.createPane('fixed', document.querySelector("#map"));

  const addControls = (() => {

    /** Layers control data */
    const overlays = {
      "<span class=\"controles\">Plan d'expropriation</span>": faubourgLayer,
      "<span class=\"controles\">Bâtiments</span>": geoJSON,
    };

    L.control.layers(null, overlays).addTo(pifm),
    L.control.zoom({position:"topright"}).addTo(pifm),
    L.control.scale({
      position:"bottomright",
      maxWidth: 150
    }).addTo(pifm);

  })();

  if (dev()) {
    pifm.on("popupopen", () => {
      console.log("Dev: Message fired on POPUP OPENING");
    });
    pifm.on("popupclose", (e) => {
      console.log("Dev CLOSE: Message fired on pop-up closing", e);
    });
    pifm.on('click', (e) => console.log("EVENT: click on map", e));
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