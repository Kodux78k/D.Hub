# Nebula Prime — V3.4.1 ULTRA (Uno–Dual–Trinity Unificado)

## Novidades
- **Animações por rotas internas** (Chat ↔ Apps ↔ Profile) sincronizadas com a persona ativa (iris/flare/warp/fade).
- **HUD expandido**: `cacheSize`, `hotTop`, `seq2Top` (bigram), `seq3Top` (trigram), `lastFetches` (10) e `avgLatencyMs`; **Purge** de cache por persona via postMessage.
- **Prefetch preditivo n-grama=3**: aprende sequências compostas e aquece os próximos alvos.
- **DevDocs** com export/minify em cliente (sem backend).

## Teste rápido
1. Servir via HTTPS (ou `python -m http.server`).
2. Abrir `index.html` (SW registra com `?arch=horus` por padrão).
3. Orbs → aplica **persona** (tema/transição) e troca manifest + SW.
4. DevDocs → HUD ↻ / Purge; Export ⬇ A / ⬇ M; Preview 👁.
