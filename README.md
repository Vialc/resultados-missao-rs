# Resultados Partido Missão RS

Site público para documentar a votação do Partido Missão no Rio Grande do Sul nas Eleições 2026.

## O que o site mostra

- Votação geral de Renan Santos no RS, agregada por município a partir do arquivo presidencial por seção.
- Mapa interativo municipal do Rio Grande do Sul.
- Lista completa dos 497 municípios com busca e seleção.
- Abas para `Renan Santos`, `Deputado Federal` e `Deputado Estadual`.
- Ranking de candidatos do Partido Missão para federal e estadual.

## Fontes

- TSE `consulta_cand_2026.zip`
- TSE `votacao_candidato_munzona_2026.zip`
- TSE `votacao_secao_2026_BR.zip` para Presidente, agregado por municípios do RS
- IBGE API de malhas, UF 43, municípios

## Desenvolvimento

```bash
npm install
npm run validate:data
npm run build
npm run dev
```

## Deploy

Dokploy, no VPS da campanha, via `.github/workflows/ci-cd.yml`.

URL pública atual:

```text
https://app-index-back-end-sensor-9s36f7-0acc0f-31-97-84-234.sslip.io/
```

O workflow sincroniza o repositório para `/opt/cicd/resultados-missao-rs`, builda a imagem `127.0.0.1:5000/resultados-missao-rs:latest` no VPS, envia para o registry local e aciona o app Dokploy `Resultados Missão RS`.
