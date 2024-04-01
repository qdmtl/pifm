/**
 * Plan interactif du Faubourg à m’lasse (PIFM)
 * 
 * intégration des données structurées du projet QDMTL
 * intégration des photographies d’archives :
 * Archives de montréal, VM094, SY, SS1, SSS3, C196
 * intégration du plan d’expropriation du Fabourg à m’lasse
 *
 * @author David Valentine <d@ntnlv.ca>
 * @license MIT https://spdx.org/licenses/MIT.html
 * @todo rdfa for information header
 * @todo loading messages for body tag (chargement)
 * @todo caching
 * @todo error handling
 * @todo get rid of warnings liens source (map)
 * @todo voir https://geojson.org/geojson-ld/
 */

import {
  sparql
} from "./modules/strings.js";

console.log(
  "%cBienvenue sur le PIFM",
  "font-family:monospace;font-size:14px;color:darkblue;"
);

(async function main() {

  /** URLs assignments */
  let tilesUrl = "https://qdmtl.ca/pifm/tiles/{z}/{x}/{y}.png",
    tripleStoreEndpointUrl = "https://qdmtl.ca/sparql/endpoint.php";

  /**
   * Fetch values for dev environment
   * ./js/config.json is .gitignored
   */
  const devConfiguration = await fetch("./dist/js/config.json")
    .then(response => {
      if (!response.ok) {
        return {
          devEnv: false
        };
      }
      return response.json();
    })
    .catch(error => console.error(error));

  if (devConfiguration.devEnv) {

    console.log(
      "%cDev Environment",
      "font-family:monospace;font-size:14px;color:darkblue;"
    );

    // store dev env values in session storage
    for (const prop in devConfiguration) {
      sessionStorage.setItem(prop, devConfiguration[prop]);
    }

    tilesUrl = devConfiguration.devTilesUrl;

    if (!devConfiguration.onLineTripleStore) {
      tripleStoreEndpointUrl = devConfiguration.devTripleStoreEndpointUrl;
    }
  }

  /**
   * fetching data from RDF store
   * buildings with geographic coordinates
   */
  const sparqlResponse = await fetch(tripleStoreEndpointUrl, {
    method: "POST",
    headers: {
      "Accept": "application/sparql-results+json",
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: sparql.buildings
  })
  .then(response => {
    if(!response.ok) {
      throw new Error(`An error occurred: ${response.status}`)
    };
    return response.json();
  })
  .catch(error => console.error(error));

  console.log(
    "%c%i bâtiments géolocalisés",
    "font-family:monospace;font-size:14px;color:darkblue;",
    sparqlResponse.results.bindings.length
  );

  /**
   * making of geoJSON object
   * function expression to be called
   */
  const geojsonFeatures = (sparqlJson) => {

    let featuresArray = sparqlJson.results.bindings.map(feature => {
      return {
        "type": "Feature",
        "properties": {
          "URI": feature.a.value
        },
        "geometry": JSON.parse(feature.b.value)
      };
    });

    return {
      "type": "FeatureCollection",
      "features": featuresArray
    };
  };

  /**
   * GeoJSON Layer for Leaflet
   * L object is accessible via script tag in the HTML file
   */
  const geoJSON = L.geoJSON(geojsonFeatures(sparqlResponse), {
    
    // cet objet permet de spécifier les options pour la méthode geoJSON()
    // doc: https://leafletjs.com/reference.html#geojson-option
    // la propriété onEachFeature permet de spécifier les opérations à effectuer pour chaque feature
    onEachFeature: (feature, layer) => {

      const popup = L.popup({
        pane: 'fixed',
        className: 'popup-fixed',
        autoPan: false,
        maxWidth: 2000 // must be larger than 50% of the viewport
      });

      layer.bindPopup(popup);

      /**
       * Event passé automatiquement au callback
       * Le callback est exécuté lorsque la visioneuse s'ouvre
       */
      layer.on("popupopen", async (event) => {

        const popupId = `id-${event.popup._leaflet_id}-`;

        let URI = feature.properties.URI;

        if (devConfiguration.devEnv) {
          if (sessionStorage.getItem("onLineTripleStore") !== "true") {
            URI = feature.properties.URI.replace("http://data.qdmtl.ca", sessionStorage.getItem("devTripleStoreUrl"));
            devConsole("Dev triple store");
          }
        } else {
          URI = URI.replace("http", "https");
        }

        /**
         * Fetching the resource
         */
        const jsonLD = await fetch(URI, {
          method: "GET",
          headers: {
            "Accept": "application/ld+json",
          }
        })
        .then((response) => {
          if(!response.ok) {
            throw new Error(`An error occurred: ${response.status}`)
          };
          return response.json();
        })
        .catch(error => console.error(error));
        
        if (devConfiguration.devEnv) {
          console.log("Dev: Response from RDF store: ", jsonLD);
        }

        let popUpInformation, resourceUri;

        try {

          popUpInformation = `

            <div id="${popupId}loader" class="loader">
              <div class="spinner"></div>
              <p>Chargement</p>
              <p id="${popupId}counter"></p>
            </div>

            <div id="${popupId}glide" class="custom-glide">

              <div class="glide__track" data-glide-el="track">
                <ul class="glide__slides" id="${popupId}slides">
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
                <pre>${
                  (() => {
                    if (JSON.stringify(jsonLD, undefined, 2)) {
                      return JSON.stringify(jsonLD, undefined, 2);
                    } else {
                      return `<span style="color: #CB5151;">
                    Une erreur est survenue pour la ressource identifiée par :</span>\n
                    ${feature.properties.URI}\n
                    Pour aider à régler le problème, vous pouvez contacter l'éditeur du PIFM :\n
                    david.valentine@umontreal.ca\n
                    Veuillez s'il vous plait mentionner l'identifiant de la ressource.\n
                    Identifiant de la ressource :\n
                    ${feature.properties.URI}`;
                    }  
                  })()
                }</pre>
              </div>
            </div>
          `;

          /** Récupérer l'URI de la ressource */
          jsonLD["@graph"].forEach((resource)=> {

            if (resource["@id"].search("http://data.qdmtl.ca/Building/") > -1) {
              resourceUri = resource["@id"];
            }
          });

        } catch (error) {
          console.error(error);
        }

        // injecte HTML pour la visionneuse
        popup.setContent(popUpInformation);

        /**
         * Déplacement et centrage de la punaise
         */
        const centering = () => {

          let targetLatLng = L.latLng(// coordonnées sont inversées avec GeoJSON */
            feature.geometry.coordinates[1],
            feature.geometry.coordinates[0],
          );
          const targetZoom = 20,
            popUpWidth = document.querySelector(".leaflet-popup").clientWidth,
            targetPoint = pifm.project(targetLatLng, targetZoom).subtract([popUpWidth / 2, 0]);
          targetLatLng = pifm.unproject(targetPoint, targetZoom);
          pifm.setView(targetLatLng, targetZoom);
        };

        centering();

        /** SPARQL query for images */
        let imagesQuery = `PREFIX rico:<https://www.ica.org/standards/RiC/ontology#>PREFIX schema:<https://schema.org/>SELECT ?f WHERE{[]a rico:Record;rico:hasInstantiation ?i;rico:hasOrHadMainSubject<${resourceUri}>.?i schema:image ?f.}`;
        imagesQuery  = "query=" + encodeURIComponent(imagesQuery);

        /** fetch images URL */
        const sparqlResponse = await fetch(tripleStoreEndpointUrl, {
          method: "POST",
          headers: {
            "Accept": "application/sparql-results+json",
            "Content-Type": "application/x-www-form-urlencoded"
          },
          body: imagesQuery
        })
        .then(response => {
          if(!response.ok) {
            throw new Error(`An error occurred: ${response.status}`)
          };
          return response.json();
        })
        .catch(error => console.error(error));

        /** URLs list */
        let imageUrls = sparqlResponse.results.bindings.map(url => {
          return url.f.value;
        });

        /** loading all resource images */
        /** @todo charger 10 premiers, puis append 10 à la fois */
        const imagesElements = await Promise.all(imageUrls.map(async src => {
          
          /** loads an image, returns a promise */
          return new Promise((resolve, reject) => {
            const img = new Image();
            img.src = src;
            img.onload = () => resolve(img);
            img.onerror = () => reject(`Erreur de téléchargement : ${src}`);
            console.log("Image en cache : ", img.complete);
          })
          .catch(error => console.error(error));
        }))
        .then(imgages => imgages.filter(img => img !== undefined));

        /** printing information in visionneuse */
        console.log(`Nombre d'images téléchargées : ${imagesElements.length}/${imageUrls.length}`);
        const imagesList = imagesElements.map((element) => {
          return {
            src: element.currentSrc
          };
        })
        console.log("URL : ", imagesList);

        /** update the DOM with images for the Leaflet popup */
        imagesElements.forEach((image, index) => {

          let overlay = document.createElement("div");
          overlay.className = "overlay";

          let slide = document.createElement("li");
          slide.className = "glide__slide";
          slide.appendChild(image);
          slide.append(overlay);
          
          let slides = document.querySelector(`#${popupId}slides`);
          slides.appendChild(slide);

          /** the loop blocks the main thread so this does nothing */
          let counter = document.querySelector(`p#${popupId}counter`);
          counter.innerText = `${++index}/${imageUrls.length}`;
        });

        /** initialisation du caroussel */
        const glide = new Glide(`#${popupId}glide`, {
          type: 'carousel',
          perView: 2,
          focusAt: "center",
          gap: 4,
          animationDuration: 200,
          keyboard: true
        });
        glide.mount();

        // aviser user si des images manquent
        if (imageUrls.length !== imagesElements.length) {
          const message = `Certaines images ne peuvent pas être téléchargées pour l'instant :\n${imagesElements.length}/${imageUrls.length} images téléchargées.\n\nPour compléter le téléchargement :\n\n1. cliquez sur OK\n2. fermez la visionneuse (panneau de gauche)\n3. cliquez de nouveau sur la punaise de cette ressource\n4. répétez cette manipulation jusqu'à ce que cet avertissement ne s'affiche plus`
          alert(message);
        }

        /** hide the spinner */
        let loader = document.querySelector(`#${popupId}loader`);
        setTimeout(() => { // wait to make sure it's clean
          loader.style.display = "none";
        }, 300);
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

  /**
   * Utilitaires
   */

  /** récupérer données de géolocalisation */
  pifm.on("click", (event) => {

    console.log(event.latlng);

    let coordinates   = `[ a ecrm:E53_Place ;\n`;
        coordinates  += `  ecrm:P168_place_is_defined_by [\n`;
        coordinates  += `    a geo:Geometry ;\n`;
        coordinates  += `    geo:asGeoJSON "{\\"type\\": \\"Point\\", \\"coordinates\\": [${event.latlng.lng},${event.latlng.lat}]}"^^geo:geoJSONLiteral\n`
        coordinates  += `  ]\n`;
        coordinates  += `]`;

        console.log(coordinates);
  })

  if (devConfiguration.devEnv) {
    pifm.on("popupopen", () => {
      devConsole("Dev: Message fired on POPUP OPENING");
    });
    pifm.on("popupclose", (event) => {
      devConsole("Dev CLOSE: Message fired on pop-up closing", event);
    });
  };

})();

/**
 * dev environment functions
 */
function devConsole(log) {
  console.log(
    `%c${log}: `,
    "font-family:monospace;color:darkblue;",
  );
}