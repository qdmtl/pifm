export const sparql = queryBuilder();

/**
 * internal functions
 */

function queryBuilder() {

  // @todo : direct import in main:
  // import myJson from './example.json' with {type: 'json'};
  // as soon as firefox implements it
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import#browser_compatibility
  let queries = {
    buildings: "PREFIX ecrm:<http://erlangen-crm.org/current/>PREFIX geo:<http://www.opengis.net/ont/geosparql#>SELECT ?a ?b WHERE{?a a <http://onto.qdmtl.ca/E24_Building>;ecrm:P53_has_former_or_current_location ?c.?c ecrm:P168_place_is_defined_by ?d.?d geo:asGeoJSON ?b.}",
  }

  for (const [key, value] of Object.entries(queries)) {
    queries[key] = encodeQuery(value);
  }

  return queries;
};

function encodeQuery (query) {
  return "query=" + encodeURIComponent(query);
};