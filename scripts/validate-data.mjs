import fs from 'node:fs';

const results = JSON.parse(fs.readFileSync('data/resultados-missao-rs-2026.json', 'utf8'));
const geo = JSON.parse(fs.readFileSync('data/rs-municipios.geojson', 'utf8'));

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

assert(Array.isArray(results.municipios), 'results.municipios precisa ser array');
assert(results.municipios.length === 497, `esperado 497 municípios; obtido ${results.municipios.length}`);
assert(Array.isArray(geo.features), 'geo.features precisa ser array');
assert(geo.features.length === 497, `esperado GeoJSON com 497 features; obtido ${geo.features.length}`);

const missingIbge = results.municipios.filter((m) => !m.codigoIBGE);
assert(missingIbge.length === 0, `municípios sem codigoIBGE: ${missingIbge.map((m) => m.nome).join(', ')}`);

const geoIds = new Set(geo.features.map((feature) => feature.properties?.codarea ?? feature.properties?.id));
const missingGeo = results.municipios.filter((m) => !geoIds.has(m.codigoIBGE));
assert(missingGeo.length === 0, `municípios ausentes na malha: ${missingGeo.map((m) => m.nome).join(', ')}`);

const sumMunicipalFederal = results.municipios.reduce((sum, m) => sum + Number(m.deputadoFederalMissao || 0), 0);
const sumCandidateFederal = results.deputadoFederal.reduce((sum, c) => sum + Number(c.votos || 0), 0);
assert(sumMunicipalFederal === results.totais.missaoDeputadoFederalRS, `total federal municipal ${sumMunicipalFederal} diverge do total ${results.totais.missaoDeputadoFederalRS}`);
assert(sumCandidateFederal === results.totais.missaoDeputadoFederalRS, `total federal candidatos ${sumCandidateFederal} diverge do total ${results.totais.missaoDeputadoFederalRS}`);

const sumMunicipalEstadual = results.municipios.reduce((sum, m) => sum + Number(m.deputadoEstadualMissao || 0), 0);
const sumCandidateEstadual = results.deputadoEstadual.reduce((sum, c) => sum + Number(c.votos || 0), 0);
assert(sumMunicipalEstadual === results.totais.missaoDeputadoEstadualRS, `total estadual municipal ${sumMunicipalEstadual} diverge do total ${results.totais.missaoDeputadoEstadualRS}`);
assert(sumCandidateEstadual === results.totais.missaoDeputadoEstadualRS, `total estadual candidatos ${sumCandidateEstadual} diverge do total ${results.totais.missaoDeputadoEstadualRS}`);

assert(results.renan?.SQ_CANDIDATO === '280002540694', 'Renan Santos precisa manter SQ_CANDIDATO 280002540694');
assert(typeof results.metadata?.notaRenan === 'string' && results.metadata.notaRenan.length > 30, 'notaRenan precisa documentar a ausência de linhas presidenciais');

console.log(JSON.stringify({
  ok: true,
  municipios: results.municipios.length,
  geoFeatures: geo.features.length,
  federal: results.totais.missaoDeputadoFederalRS,
  estadual: results.totais.missaoDeputadoEstadualRS,
  renan: results.totais.renanPresidenteRS,
}, null, 2));
