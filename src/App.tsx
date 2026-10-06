import React, { useEffect, useMemo, useState } from 'react';
import './styles.css';
import resultsJson from '../data/resultados-missao-rs-2026.json';
import geoJson from '../data/rs-municipios.json';

type TabKey = 'renanPresidente' | 'deputadoFederalMissao' | 'deputadoEstadualMissao';
type ViewMode = 'votes' | 'percent';

type Municipio = {
  codigoTSE: string;
  codigoIBGE: string;
  nome: string;
  nomeTSE: string;
  lat: number | null;
  lng: number | null;
  populacao: number | null;
  renanPresidente: number;
  deputadoFederalMissao: number;
  deputadoEstadualMissao: number;
  totalMissaoLegislativo: number;
  votosValidosPresidente: number;
  votosValidosDeputadoFederal: number;
  votosValidosDeputadoEstadual: number;
};

type Candidate = {
  sqCandidato: string;
  numero: string;
  nome: string;
  urna: string;
  cargo: string;
  situacao: string;
  votos: number;
  topMunicipios: { codigoTSE: string; municipio: string; votos: number }[];
};

type ResultsData = {
  metadata: Record<string, string>;
  renan: Record<string, string | number>;
  totais: Record<string, number>;
  municipios: Municipio[];
  deputadoFederal: Candidate[];
  deputadoEstadual: Candidate[];
};

type GeoFeature = {
  type: 'Feature';
  properties: { codarea?: string; id?: string; name?: string; description?: string };
  geometry: { type: 'Polygon' | 'MultiPolygon'; coordinates: unknown };
};

type GeoData = { type: 'FeatureCollection'; features: GeoFeature[] };

const results = resultsJson as ResultsData;
const geo = geoJson as GeoData;

const tabConfig: Record<TabKey, { title: string; eyebrow: string; description: string; valueLabel: string }> = {
  renanPresidente: {
    title: 'Renan Santos',
    eyebrow: 'Presidente · nº 14',
    description: 'Votação geral de Renan Santos no Rio Grande do Sul conforme o snapshot oficial disponível.',
    valueLabel: 'Votos Renan',
  },
  deputadoFederalMissao: {
    title: 'Deputado Federal',
    eyebrow: 'Candidatos do Missão no RS',
    description: 'Soma dos votos nominais dos candidatos do Partido Missão a deputado federal por município.',
    valueLabel: 'Votos federal',
  },
  deputadoEstadualMissao: {
    title: 'Deputado Estadual',
    eyebrow: 'Candidatos do Missão no RS',
    description: 'Soma dos votos nominais dos candidatos do Partido Missão a deputado estadual por município.',
    valueLabel: 'Votos estadual',
  },
};

const viewModeConfig: Record<ViewMode, { title: string; helper: string; mapScale: string; municipioLabel: string }> = {
  votes: {
    title: 'Votos absolutos',
    helper: 'Quantidade de votos no município',
    mapScale: 'Escala por votos',
    municipioLabel: 'Votos',
  },
  percent: {
    title: '% dos votos válidos',
    helper: 'Votos divididos pelo total de votos válidos do cargo no município',
    mapScale: 'Escala por % dos válidos',
    municipioLabel: '% dos válidos',
  },
};

const validVoteFieldByTab: Record<
  TabKey,
  'votosValidosPresidente' | 'votosValidosDeputadoFederal' | 'votosValidosDeputadoEstadual'
> = {
  renanPresidente: 'votosValidosPresidente',
  deputadoFederalMissao: 'votosValidosDeputadoFederal',
  deputadoEstadualMissao: 'votosValidosDeputadoEstadual',
};

const totalVotesKeyByTab: Record<
  TabKey,
  'renanPresidenteRS' | 'missaoDeputadoFederalRS' | 'missaoDeputadoEstadualRS'
> = {
  renanPresidente: 'renanPresidenteRS',
  deputadoFederalMissao: 'missaoDeputadoFederalRS',
  deputadoEstadualMissao: 'missaoDeputadoEstadualRS',
};

const totalValidVotesKeyByTab: Record<
  TabKey,
  'votosValidosPresidenteRS' | 'votosValidosDeputadoFederalRS' | 'votosValidosDeputadoEstadualRS'
> = {
  renanPresidente: 'votosValidosPresidenteRS',
  deputadoFederalMissao: 'votosValidosDeputadoFederalRS',
  deputadoEstadualMissao: 'votosValidosDeputadoEstadualRS',
};

const numberFormatter = new Intl.NumberFormat('pt-BR');
const percentFormatter = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });

function formatNumber(value: number | null | undefined) {
  return numberFormatter.format(value ?? 0);
}

function formatPercent(value: number | null | undefined) {
  return `${percentFormatter.format(value ?? 0)}%`;
}

function getVotes(municipio: Municipio, tab: TabKey) {
  return municipio[tab] ?? 0;
}

function getValidVotes(municipio: Municipio, tab: TabKey) {
  return municipio[validVoteFieldByTab[tab]] ?? 0;
}

function getVotePercent(municipio: Municipio, tab: TabKey) {
  const validVotes = getValidVotes(municipio, tab);
  return validVotes ? (getVotes(municipio, tab) / validVotes) * 100 : 0;
}

function getDisplayValue(municipio: Municipio, tab: TabKey, viewMode: ViewMode) {
  return viewMode === 'percent' ? getVotePercent(municipio, tab) : getVotes(municipio, tab);
}

function formatDisplayValue(value: number, viewMode: ViewMode) {
  return viewMode === 'percent' ? formatPercent(value) : formatNumber(value);
}

function getTotalVotes(tab: TabKey) {
  return results.totais[totalVotesKeyByTab[tab]] ?? 0;
}

function getTotalValidVotes(tab: TabKey) {
  return results.totais[totalValidVotesKeyByTab[tab]] ?? 0;
}

function describeMunicipioMetric(municipio: Municipio, tab: TabKey, viewMode: ViewMode) {
  const votes = getVotes(municipio, tab);
  const validVotes = getValidVotes(municipio, tab);
  const percent = getVotePercent(municipio, tab);
  if (viewMode === 'percent') {
    return `${formatPercent(percent)} dos votos válidos (${formatNumber(votes)} de ${formatNumber(validVotes)} votos)`;
  }
  return `${formatNumber(votes)} votos (${formatPercent(percent)} dos válidos)`;
}

function normalizeText(text: string) {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function collectCoordinates(input: unknown, points: [number, number][] = []) {
  if (!Array.isArray(input)) return points;
  if (typeof input[0] === 'number' && typeof input[1] === 'number') {
    points.push([input[0] as number, input[1] as number]);
    return points;
  }
  for (const item of input) collectCoordinates(item, points);
  return points;
}

function computeBbox(features: GeoFeature[]) {
  const allPoints = features.flatMap((feature) => collectCoordinates(feature.geometry.coordinates));
  const lons = allPoints.map((point) => point[0]);
  const lats = allPoints.map((point) => point[1]);
  return {
    minLon: Math.min(...lons),
    maxLon: Math.max(...lons),
    minLat: Math.min(...lats),
    maxLat: Math.max(...lats),
  };
}

const bbox = computeBbox(geo.features);
const mapWidth = 720;
const mapHeight = 720;
const mapPad = 24;

function projectPoint([lon, lat]: [number, number]) {
  const x = mapPad + ((lon - bbox.minLon) / (bbox.maxLon - bbox.minLon)) * (mapWidth - mapPad * 2);
  const y = mapPad + ((bbox.maxLat - lat) / (bbox.maxLat - bbox.minLat)) * (mapHeight - mapPad * 2);
  return [x, y] as const;
}

function ringToPath(ring: unknown) {
  const points = collectCoordinates(ring);
  if (!points.length) return '';
  return points
    .map((point, index) => {
      const [x, y] = projectPoint(point);
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ') + ' Z';
}

function geometryToPath(feature: GeoFeature) {
  const coordinates = feature.geometry.coordinates as unknown[];
  if (feature.geometry.type === 'Polygon') {
    return (coordinates as unknown[]).map(ringToPath).join(' ');
  }
  if (feature.geometry.type === 'MultiPolygon') {
    return (coordinates as unknown[][]).flatMap((polygon) => polygon.map(ringToPath)).join(' ');
  }
  return '';
}

function colorForValue(value: number, max: number) {
  if (!max || !value) return '#fff2c8';
  const t = Math.max(0.12, Math.min(1, Math.sqrt(value / max)));
  const start = [255, 237, 166];
  const end = [194, 126, 0];
  const rgb = start.map((channel, index) => Math.round(channel + (end[index] - channel) * t));
  return `rgb(${rgb.join(',')})`;
}

function ResultsMap({
  activeTab,
  viewMode,
  selectedCode,
  onSelect,
}: {
  activeTab: TabKey;
  viewMode: ViewMode;
  selectedCode: string | null;
  onSelect: (codigoTSE: string) => void;
}) {
  const byIbge = useMemo(() => new Map(results.municipios.map((m) => [m.codigoIBGE, m])), []);
  const max = useMemo(() => Math.max(...results.municipios.map((m) => getDisplayValue(m, activeTab, viewMode))), [activeTab, viewMode]);

  return (
    <section className="map-card" aria-label="Mapa interativo do Rio Grande do Sul">
      <div className="map-heading">
        <div>
          <p className="section-kicker">Mapa municipal</p>
          <h2>{tabConfig[activeTab].title}</h2>
        </div>
        <span className="map-scale">{viewModeConfig[viewMode].mapScale}</span>
      </div>
      <svg className="rs-map" viewBox={`0 0 ${mapWidth} ${mapHeight}`} role="img" aria-label="Mapa do RS por município">
        <rect x="0" y="0" width={mapWidth} height={mapHeight} rx="28" fill="#fff9e8" />
        {geo.features.map((feature) => {
          const ibge = feature.properties.codarea ?? feature.properties.id ?? '';
          const municipio = byIbge.get(ibge);
          const value = municipio ? getDisplayValue(municipio, activeTab, viewMode) : 0;
          const isSelected = municipio?.codigoTSE === selectedCode;
          const path = geometryToPath(feature);
          const metricLabel = municipio ? describeMunicipioMetric(municipio, activeTab, viewMode) : 'Município sem dados';
          return (
            <path
              key={ibge}
              d={path}
              className={`municipio-shape${isSelected ? ' selected' : ''}`}
              fill={colorForValue(value, max)}
              stroke={isSelected ? '#111111' : '#ffffff'}
              strokeWidth={isSelected ? 2.6 : 0.65}
              onClick={() => municipio && onSelect(municipio.codigoTSE)}
              onMouseEnter={() => municipio && onSelect(municipio.codigoTSE)}
              tabIndex={municipio ? 0 : -1}
              role="button"
              aria-label={municipio ? `${municipio.nome}: ${metricLabel}` : 'Município sem dados'}
            >
              <title>{municipio ? `${municipio.nome} · ${metricLabel}` : ibge}</title>
            </path>
          );
        })}
      </svg>
      <div className="legend" aria-hidden="true">
        <span>{formatDisplayValue(0, viewMode)}</span>
        <div className="legend-gradient" />
        <span>{formatDisplayValue(max, viewMode)}</span>
      </div>
    </section>
  );
}

function MunicipalityPanel({
  activeTab,
  viewMode,
  selectedCode,
  setSelectedCode,
}: {
  activeTab: TabKey;
  viewMode: ViewMode;
  selectedCode: string | null;
  setSelectedCode: (code: string) => void;
}) {
  const [query, setQuery] = useState('');
  const selected = results.municipios.find((m) => m.codigoTSE === selectedCode) ?? results.municipios[0];
  const filtered = useMemo(() => {
    const q = normalizeText(query.trim());
    return results.municipios
      .filter((m) => !q || normalizeText(m.nome).includes(q))
      .sort((a, b) => getDisplayValue(b, activeTab, viewMode) - getDisplayValue(a, activeTab, viewMode) || a.nome.localeCompare(b.nome, 'pt-BR'));
  }, [query, activeTab, viewMode]);

  const selectedVotes = getVotes(selected, activeTab);
  const selectedValidVotes = getValidVotes(selected, activeTab);
  const total = getTotalVotes(activeTab);
  const share = total ? (selectedVotes / total) * 100 : 0;
  const selectedDisplay = getDisplayValue(selected, activeTab, viewMode);

  return (
    <section className="list-card" aria-label="Lista de municípios e votações">
      <div className="selected-box">
        <p className="section-kicker">Município selecionado</p>
        <h2>{selected.nome}</h2>
        <div className="selected-grid">
          <div>
            <span>{viewMode === 'percent' ? '% dos votos válidos' : tabConfig[activeTab].valueLabel}</span>
            <strong>{formatDisplayValue(selectedDisplay, viewMode)}</strong>
            <small>{formatNumber(selectedVotes)} votos de {formatNumber(selectedValidVotes)} válidos</small>
          </div>
          <div>
            <span>Votos válidos do cargo</span>
            <strong>{formatNumber(selectedValidVotes)}</strong>
            <small>Denominador municipal do percentual</small>
          </div>
          <div>
            <span>Peso no total da aba</span>
            <strong>{formatPercent(share)}</strong>
            <small>Participação do município no total estadual desta visão</small>
          </div>
          <div>
            <span>População</span>
            <strong>{selected.populacao ? formatNumber(selected.populacao) : '—'}</strong>
            <small>Códigos {selected.codigoTSE} · {selected.codigoIBGE}</small>
          </div>
        </div>
      </div>

      <label className="search-label">
        Buscar município
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Ex.: Porto Alegre"
        />
      </label>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Município</th>
              <th>{viewMode === 'percent' ? '% válidos' : tabConfig[activeTab].valueLabel}</th>
              <th>Válidos cargo</th>
              <th>Federal</th>
              <th>Estadual</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((m, index) => (
              <tr
                key={m.codigoTSE}
                className={m.codigoTSE === selectedCode ? 'is-selected' : ''}
                onClick={() => setSelectedCode(m.codigoTSE)}
              >
                <td>{index + 1}</td>
                <td>
                  <button type="button" onClick={() => setSelectedCode(m.codigoTSE)}>
                    {m.nome}
                  </button>
                </td>
                <td title={describeMunicipioMetric(m, activeTab, viewMode)}>{formatDisplayValue(getDisplayValue(m, activeTab, viewMode), viewMode)}</td>
                <td>{formatNumber(getValidVotes(m, activeTab))}</td>
                <td>{formatNumber(m.deputadoFederalMissao)}</td>
                <td>{formatNumber(m.deputadoEstadualMissao)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function CandidateRanking({ activeTab, viewMode }: { activeTab: TabKey; viewMode: ViewMode }) {
  const candidates = activeTab === 'deputadoFederalMissao'
    ? results.deputadoFederal
    : activeTab === 'deputadoEstadualMissao'
      ? results.deputadoEstadual
      : [];
  const municipioByCode = useMemo(() => new Map(results.municipios.map((m) => [m.codigoTSE, m])), []);
  const validTotal = getTotalValidVotes(activeTab);

  if (activeTab === 'renanPresidente') {
    return (
      <section className="note-card">
        <p className="section-kicker">Transparência dos dados</p>
        <h3>Votação presidencial agregada por município a partir do TSE.</h3>
        <p>{results.metadata.notaRenan}</p>
      </section>
    );
  }

  return (
    <section className="ranking-card">
      <div className="ranking-header">
        <p className="section-kicker">Ranking de candidatos</p>
        <h3>{activeTab === 'deputadoFederalMissao' ? 'Deputado Federal' : 'Deputado Estadual'}</h3>
      </div>
      <div className="ranking-grid">
        {candidates.map((candidate, index) => {
          const candidatePercent = validTotal ? (candidate.votos / validTotal) * 100 : 0;
          return (
            <article key={candidate.sqCandidato} className="candidate-card">
              <span className="candidate-rank">#{index + 1}</span>
              <div>
                <h4>{candidate.urna}</h4>
                <p>nº {candidate.numero} · {candidate.situacao}</p>
              </div>
              <strong>{viewMode === 'percent' ? formatPercent(candidatePercent) : formatNumber(candidate.votos)}</strong>
              <span className="metric-subtext">
                {viewMode === 'percent'
                  ? `${formatNumber(candidate.votos)} votos de ${formatNumber(validTotal)} válidos no RS`
                  : `${formatPercent(candidatePercent)} dos votos válidos no RS`}
              </span>
              <details>
                <summary>Top municípios</summary>
                <ol>
                  {candidate.topMunicipios.slice(0, 5).map((city) => {
                    const cityData = municipioByCode.get(city.codigoTSE);
                    const cityValid = cityData ? getValidVotes(cityData, activeTab) : 0;
                    const cityPercent = cityValid ? (city.votos / cityValid) * 100 : 0;
                    return (
                      <li key={`${candidate.sqCandidato}-${city.codigoTSE}`}>
                        <span>{city.municipio}</span>
                        <b>{viewMode === 'percent' ? formatPercent(cityPercent) : formatNumber(city.votos)}</b>
                      </li>
                    );
                  })}
                </ol>
              </details>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function SummaryCards({ viewMode }: { viewMode: ViewMode }) {
  const cards = [
    {
      label: 'Renan Santos no RS',
      votes: results.totais.renanPresidenteRS,
      validVotes: results.totais.votosValidosPresidenteRS,
      helper: 'Presidente · dados por seção agregados por município',
    },
    {
      label: 'Missão · Federal RS',
      votes: results.totais.missaoDeputadoFederalRS,
      validVotes: results.totais.votosValidosDeputadoFederalRS,
      helper: `${results.totais.candidatosFederaisMissaoRS} candidatos`,
    },
    {
      label: 'Missão · Estadual RS',
      votes: results.totais.missaoDeputadoEstadualRS,
      validVotes: results.totais.votosValidosDeputadoEstadualRS,
      helper: `${results.totais.candidatosEstaduaisMissaoRS} candidatos`,
    },
    {
      label: 'Municípios cobertos',
      votes: results.totais.municipios,
      validVotes: null,
      helper: 'Malha municipal IBGE + votação TSE',
    },
  ];

  return (
    <section className="summary-grid" aria-label="Resumo dos resultados">
      {cards.map((card) => {
        const percent = card.validVotes ? (card.votes / card.validVotes) * 100 : 0;
        const value = card.validVotes && viewMode === 'percent' ? formatPercent(percent) : formatNumber(card.votes);
        const helper = card.validVotes
          ? viewMode === 'percent'
            ? `${formatNumber(card.votes)} votos de ${formatNumber(card.validVotes)} válidos`
            : `${card.helper} · ${formatPercent(percent)} dos válidos`
          : card.helper;
        return (
          <article className="summary-card" key={card.label}>
            <span>{card.label}</span>
            <strong>{value}</strong>
            <p>{helper}</p>
          </article>
        );
      })}
    </section>
  );
}

function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('renanPresidente');
  const [viewMode, setViewMode] = useState<ViewMode>('votes');
  const [selectedCode, setSelectedCode] = useState<string | null>(null);

  const sortedByActive = useMemo(
    () => [...results.municipios].sort((a, b) => getDisplayValue(b, activeTab, viewMode) - getDisplayValue(a, activeTab, viewMode) || a.nome.localeCompare(b.nome, 'pt-BR')),
    [activeTab, viewMode]
  );

  useEffect(() => {
    setSelectedCode(sortedByActive[0]?.codigoTSE ?? null);
  }, [sortedByActive]);

  return (
    <main>
      <header className="site-header">
        <nav>
          <div className="brand-lockup">
            <img src={`${import.meta.env.BASE_URL}logo_missao.svg`} alt="Partido Missão" />
            <span>Resultados RS</span>
          </div>
          <a href="#metodologia">Metodologia</a>
        </nav>
        <section className="hero">
          <p className="hero-kicker">Eleições 2026 · Rio Grande do Sul</p>
          <h1>Resultado do Partido Missão no RS, município por município.</h1>
          <p>
            Painel público com mapa interativo, lista completa de municípios e abas para Renan Santos,
            deputado federal e deputado estadual. Dados oficiais TSE/IBGE, sem estimativas inventadas.
          </p>
        </section>
      </header>

      <SummaryCards viewMode={viewMode} />

      <section className="tabs" aria-label="Navegação entre visões de votação">
        {(Object.keys(tabConfig) as TabKey[]).map((tab) => (
          <button
            key={tab}
            className={activeTab === tab ? 'active' : ''}
            onClick={() => setActiveTab(tab)}
            type="button"
          >
            <span>{tabConfig[tab].eyebrow}</span>
            {tabConfig[tab].title}
          </button>
        ))}
      </section>

      <section className="view-mode-card" aria-label="Formato de visualização dos votos">
        <div>
          <p className="section-kicker">Formato de visualização</p>
          <h2>{viewModeConfig[viewMode].title}</h2>
          <p>{viewModeConfig[viewMode].helper}</p>
        </div>
        <div className="view-toggle" role="group" aria-label="Alternar entre votos absolutos e percentual dos votos válidos">
          {(['votes', 'percent'] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              className={viewMode === mode ? 'active' : ''}
              onClick={() => setViewMode(mode)}
            >
              {mode === 'votes' ? 'Votos' : '% dos válidos'}
            </button>
          ))}
        </div>
      </section>

      <section className="active-intro">
        <p className="section-kicker">{tabConfig[activeTab].eyebrow}</p>
        <h2>{tabConfig[activeTab].description}</h2>
      </section>

      <section className="workspace">
        <ResultsMap activeTab={activeTab} viewMode={viewMode} selectedCode={selectedCode} onSelect={setSelectedCode} />
        <MunicipalityPanel activeTab={activeTab} viewMode={viewMode} selectedCode={selectedCode} setSelectedCode={setSelectedCode} />
      </section>

      <CandidateRanking activeTab={activeTab} viewMode={viewMode} />

      <section className="methodology" id="metodologia">
        <p className="section-kicker">Metodologia e fonte</p>
        <h2>Dados oficiais, publicação estática.</h2>
        <div className="methodology-grid">
          <p>
            <strong>Votação:</strong> {results.metadata.fonteVotacao}. Deputados usam votação por município/zona; Presidente usa votação por seção agregada por município.
          </p>
          <p>
            <strong>Percentuais:</strong> {results.metadata.notaPercentuais} Fonte dos denominadores: {results.metadata.fonteVotosValidos}.
          </p>
          <p><strong>Candidaturas:</strong> {results.metadata.fonteCandidaturas}.</p>
          <p><strong>Mapa:</strong> {results.metadata.fonteMalha}.</p>
          <p><strong>Nota Renan:</strong> {results.metadata.notaRenan}</p>
        </div>
      </section>
    </main>
  );
}

export default App;
