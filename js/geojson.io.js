window.api.map.addLayer(
    L.imageOverlay(
      "https://ntnlv.ca/faubourg/map/img/plan-fond-transparent-min.png", [
        [45.5155088875666, -73.55432183482827],
        [45.52127103906887, -73.54793549518355]
      ], {
        opacity: 0.5,
        alt: "Plan d'expropriation du Faubourg à M'lasse"
      }
    )
).setView([45.51823567357893, -73.55085910368373], 18)
