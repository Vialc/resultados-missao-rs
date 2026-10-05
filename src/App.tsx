import React, { useEffect, useMemo, useState } from 'react';
import './styles.css';
import resultsJson from '../data/resultados-missao-rs-2026.json';
import geoJson from '../data/rs-municipios.json';

type TabKey = 'renanPresidente' | 'deputadoFederalMissao' | 'deputadoEstadualMissao';

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

const numberFormatter = new Intl.NumberFormat('pt-BR');
const percentFormatter = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });

function formatNumber(value: number | null | undefined) {
  return numberFormatter.format(value ?? 0);
}

function getVotes(municipio: Municipio, tab: TabKey) {
  return municipio[tab] ?? 0;
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
  selectedCode,
  onSelect,
}: {
  activeTab: TabKey;
  selectedCode: string | null;
  onSelect: (codigoTSE: string) => void;
}) {
  const byIbge = useMemo(() => new Map(results.municipios.map((m) => [m.codigoIBGE, m])), []);
  const max = useMemo(() => Math.max(...results.municipios.map((m) => getVotes(m, activeTab))), [activeTab]);

  return (
    <section className="map-card" aria-label="Mapa interativo do Rio Grande do Sul">
      <div className="map-heading">
        <div>
          <p className="section-kicker">Mapa municipal</p>
          <h2>{tabConfig[activeTab].title}</h2>
        </div>
        <span className="map-scale">Escala por votos</span>
      </div>
      <svg className="rs-map" viewBox={`0 0 ${mapWidth} ${mapHeight}`} role="img" aria-label="Mapa do RS por município">
        <rect x="0" y="0" width={mapWidth} height={mapHeight} rx="28" fill="#fff9e8" />
        {geo.features.map((feature) => {
          const ibge = feature.properties.codarea ?? feature.properties.id ?? '';
          const municipio = byIbge.get(ibge);
          const votes = municipio ? getVotes(municipio, activeTab) : 0;
          const isSelected = municipio?.codigoTSE === selectedCode;
          const path = geometryToPath(feature);
          return (
            <path
              key={ibge}
              d={path}
              className={`municipio-shape${isSelected ? ' selected' : ''}`}
              fill={colorForValue(votes, max)}
              stroke={isSelected ? '#111111' : '#ffffff'}
              strokeWidth={isSelected ? 2.6 : 0.65}
              onClick={() => municipio && onSelect(municipio.codigoTSE)}
              onMouseEnter={() => municipio && onSelect(municipio.codigoTSE)}
              tabIndex={municipio ? 0 : -1}
              role="button"
              aria-label={municipio ? `${municipio.nome}: ${formatNumber(votes)} votos` : 'Município sem dados'}
            >
              <title>{municipio ? `${municipio.nome} · ${formatNumber(votes)} votos` : ibge}</title>
            </path>
          );
        })}
      </svg>
      <div className="legend" aria-hidden="true">
        <span>0</span>
        <div className="legend-gradient" />
        <span>{formatNumber(max)}</span>
      </div>
    </section>
  );
}

function MunicipalityPanel({
  activeTab,
  selectedCode,
  setSelectedCode,
}: {
  activeTab: TabKey;
  selectedCode: string | null;
  setSelectedCode: (code: string) => void;
}) {
  const [query, setQuery] = useState('');
  const selected = results.municipios.find((m) => m.codigoTSE === selectedCode) ?? results.municipios[0];
  const filtered = useMemo(() => {
    const q = normalizeText(query.trim());
    return results.municipios
      .filter((m) => !q || normalizeText(m.nome).includes(q))
      .sort((a, b) => getVotes(b, activeTab) - getVotes(a, activeTab) || a.nome.localeCompare(b.nome, 'pt-BR'));
  }, [query, activeTab]);

  const selectedVotes = getVotes(selected, activeTab);
  const total = results.municipios.reduce((sum, m) => sum + getVotes(m, activeTab), 0);
  const share = total ? (selectedVotes / total) * 100 : 0;

  return (
    <section className="list-card" aria-label="Lista de municípios e votações">
      <div className="selected-box">
        <p className="section-kicker">Município selecionado</p>
        <h2>{selected.nome}</h2>
        <div className="selected-grid">
          <div>
            <span>{tabConfig[activeTab].valueLabel}</span>
            <strong>{formatNumber(selectedVotes)}</strong>
          </div>
          <div>
            <span>Participação no total</span>
            <strong>{percentFormatter.format(share)}%</strong>
          </div>
          <div>
            <span>População</span>
            <strong>{selected.populacao ? formatNumber(selected.populacao) : '—'}</strong>
          </div>
          <div>
            <span>Códigos</span>
            <strong>{selected.codigoTSE} · {selected.codigoIBGE}</strong>
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
              <th>{tabConfig[activeTab].valueLabel}</th>
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
                <td>{formatNumber(getVotes(m, activeTab))}</td>
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

function CandidateRanking({ activeTab }: { activeTab: TabKey }) {
  const candidates = activeTab === 'deputadoFederalMissao'
    ? results.deputadoFederal
    : activeTab === 'deputadoEstadualMissao'
      ? results.deputadoEstadual
      : [];

  if (activeTab === 'renanPresidente') {
    return (
      <section className="note-card">
        <p className="section-kicker">Transparência dos dados</p>
        <h3>Renan Santos consta no cadastro, mas sem linhas de votação no snapshot consultado.</h3>
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
        {candidates.map((candidate, index) => (
          <article key={candidate.sqCandidato} className="candidate-card">
            <span className="candidate-rank">#{index + 1}</span>
            <div>
              <h4>{candidate.urna}</h4>
              <p>nº {candidate.numero} · {candidate.situacao}</p>
            </div>
            <strong>{formatNumber(candidate.votos)}</strong>
            <details>
              <summary>Top municípios</summary>
              <ol>
                {candidate.topMunicipios.slice(0, 5).map((city) => (
                  <li key={`${candidate.sqCandidato}-${city.codigoTSE}`}>
                    <span>{city.municipio}</span>
                    <b>{formatNumber(city.votos)}</b>
                  </li>
                ))}
              </ol>
            </details>
          </article>
        ))}
      </div>
    </section>
  );
}

function SummaryCards() {
  const cards = [
    {
      label: 'Renan Santos no RS',
      value: results.totais.renanPresidenteRS,
      helper: 'Sem linhas presidenciais no snapshot TSE atual',
    },
    {
      label: 'Missão · Federal RS',
      value: results.totais.missaoDeputadoFederalRS,
      helper: `${results.totais.candidatosFederaisMissaoRS} candidatos`,
    },
    {
      label: 'Missão · Estadual RS',
      value: results.totais.missaoDeputadoEstadualRS,
      helper: `${results.totais.candidatosEstaduaisMissaoRS} candidatos`,
    },
    {
      label: 'Municípios cobertos',
      value: results.totais.municipios,
      helper: 'Malha municipal IBGE + votação TSE',
    },
  ];

  return (
    <section className="summary-grid" aria-label="Resumo dos resultados">
      {cards.map((card) => (
        <article className="summary-card" key={card.label}>
          <span>{card.label}</span>
          <strong>{formatNumber(card.value)}</strong>
          <p>{card.helper}</p>
        </article>
      ))}
    </section>
  );
}

function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('renanPresidente');
  const [selectedCode, setSelectedCode] = useState<string | null>(null);

  const sortedByActive = useMemo(
    () => [...results.municipios].sort((a, b) => getVotes(b, activeTab) - getVotes(a, activeTab) || a.nome.localeCompare(b.nome, 'pt-BR')),
    [activeTab]
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

      <SummaryCards />

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

      <section className="active-intro">
        <p className="section-kicker">{tabConfig[activeTab].eyebrow}</p>
        <h2>{tabConfig[activeTab].description}</h2>
      </section>

      <section className="workspace">
        <ResultsMap activeTab={activeTab} selectedCode={selectedCode} onSelect={setSelectedCode} />
        <MunicipalityPanel activeTab={activeTab} selectedCode={selectedCode} setSelectedCode={setSelectedCode} />
      </section>

      <CandidateRanking activeTab={activeTab} />

      <section className="methodology" id="metodologia">
        <p className="section-kicker">Metodologia e fonte</p>
        <h2>Dados oficiais, publicação estática.</h2>
        <div className="methodology-grid">
          <p>
            <strong>Votação:</strong> {results.metadata.fonteVotacao}. Arquivo gerado pelo TSE em{' '}
            {results.metadata.DT_GERACAO} às {results.metadata.HH_GERACAO}, turno {results.metadata.NR_TURNO}.
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
