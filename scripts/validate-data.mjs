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
assert(results.totais.renanPresidenteRS === 167558, `total Renan RS inesperado: ${results.totais.renanPresidenteRS}`);
const sumMunicipalRenan = results.municipios.reduce((sum, m) => sum + Number(m.renanPresidente || 0), 0);
assert(sumMunicipalRenan === results.totais.renanPresidenteRS, `total Renan municipal ${sumMunicipalRenan} diverge do total ${results.totais.renanPresidenteRS}`);
assert(results.renan.municipiosComVotos === 497, `Renan deveria ter votos nos 497 municípios; obtido ${results.renan.municipiosComVotos}`);
assert(results.metadata?.fonteVotacaoPresidente === 'TSE - votacao_secao_2026_BR.zip', 'fonte presidencial precisa apontar para votacao_secao_2026_BR.zip');
assert(typeof results.metadata?.notaRenan === 'string' && results.metadata.notaRenan.includes('167.558'), 'notaRenan precisa documentar total e fonte presidencial');

for (const field of ['votosValidosPresidente', 'votosValidosDeputadoFederal', 'votosValidosDeputadoEstadual']) {
  const missing = results.municipios.filter((m) => !Number.isFinite(Number(m[field])) || Number(m[field]) <= 0);
  assert(missing.length === 0, `${field} precisa existir e ser maior que zero em todos os municípios; faltando: ${missing.slice(0, 8).map((m) => m.nome).join(', ')}`);
}

const sumValidosPresidente = results.municipios.reduce((sum, m) => sum + Number(m.votosValidosPresidente || 0), 0);
const sumValidosFederal = results.municipios.reduce((sum, m) => sum + Number(m.votosValidosDeputadoFederal || 0), 0);
const sumValidosEstadual = results.municipios.reduce((sum, m) => sum + Number(m.votosValidosDeputadoEstadual || 0), 0);
assert(sumValidosPresidente === results.totais.votosValidosPresidenteRS, `total votos válidos Presidente ${sumValidosPresidente} diverge de ${results.totais.votosValidosPresidenteRS}`);
assert(sumValidosFederal === results.totais.votosValidosDeputadoFederalRS, `total votos válidos Federal ${sumValidosFederal} diverge de ${results.totais.votosValidosDeputadoFederalRS}`);
assert(sumValidosEstadual === results.totais.votosValidosDeputadoEstadualRS, `total votos válidos Estadual ${sumValidosEstadual} diverge de ${results.totais.votosValidosDeputadoEstadualRS}`);
assert(results.totais.votosValidosPresidenteRS > results.totais.renanPresidenteRS, 'votos válidos Presidente precisam ser maiores que votos de Renan');
assert(results.totais.votosValidosDeputadoFederalRS > results.totais.missaoDeputadoFederalRS, 'votos válidos Federal precisam ser maiores que votos do Missão');
assert(results.totais.votosValidosDeputadoEstadualRS > results.totais.missaoDeputadoEstadualRS, 'votos válidos Estadual precisam ser maiores que votos do Missão');
assert(typeof results.metadata?.notaPercentuais === 'string' && results.metadata.notaPercentuais.includes('votos válidos'), 'metadata.notaPercentuais precisa explicar o denominador percentual');

console.log(JSON.stringify({
  ok: true,
  municipios: results.municipios.length,
  geoFeatures: geo.features.length,
  federal: results.totais.missaoDeputadoFederalRS,
  estadual: results.totais.missaoDeputadoEstadualRS,
  renan: results.totais.renanPresidenteRS,
  validosPresidente: results.totais.votosValidosPresidenteRS,
  validosFederal: results.totais.votosValidosDeputadoFederalRS,
  validosEstadual: results.totais.votosValidosDeputadoEstadualRS,
}, null, 2));
