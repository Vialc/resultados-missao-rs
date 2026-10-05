# Resultados Partido Missão RS

Site público para documentar a votação do Partido Missão no Rio Grande do Sul nas Eleições 2026.

## O que o site mostra

- Votação geral de Renan Santos no RS, com nota de transparência quando o snapshot oficial não traz linhas presidenciais.
- Mapa interativo municipal do Rio Grande do Sul.
- Lista completa dos 497 municípios com busca e seleção.
- Abas para `Renan Santos`, `Deputado Federal` e `Deputado Estadual`.
- Ranking de candidatos do Partido Missão para federal e estadual.

## Fontes

- TSE `consulta_cand_2026.zip`
- TSE `votacao_candidato_munzona_2026.zip`
- IBGE API de malhas, UF 43, municípios

## Desenvolvimento

```bash
npm install
npm run validate:data
npm run build
npm run dev
```

## Deploy

GitHub Pages via `.github/workflows/pages.yml`.

URL esperada:

```text
https://vialc.github.io/resultados-missao-rs/
```
