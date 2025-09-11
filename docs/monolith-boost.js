// monolith-boost.js — integra o Dual‑App no Monólito Nebula Pro
// Este script injeta um cartão "Dual‑App (Trinity)" na página de Apps,
// adiciona um botão "Trinity" para enviar prompts a partir de qualquer
// resposta do chat, cria um botão "Sync DualStore" na Brain view e
// adiciona toggles de sincronização no Perfil.  É carregado no final
// do arquivo HTML principal do Monólito.

(function(){
  // 1. Card Dual‑App na view Apps. Usa o grid já existente (#view-apps .grid).
  const appsGrid = document.querySelector('#view-apps .grid');
  if (appsGrid) {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML =
      '<div class="icon">🧿</div>' +
      '<div style="flex:1"><div class="title-txt">Dual‑App (Trinity)</div>' +
      '<div class="muted">Rodar integrado</div>' +
      '<div class="row"><button class="btn">Abrir</button></div></div>';
    // Ação: abrir overlay com Dual‑App
    card.querySelector('.btn').addEventListener('click', () => {
      openDualAppOverlay('./Dual_App_io100_0_base_improved_cleaned_Updated_noSplashPLAYER-0_FIX_TOGGLE_FETCH_0.html');
    });
    appsGrid.prepend(card);
  }
  // Cria overlay e retorna se a estrutura já estiver pronta
  function openDualAppOverlay(url) {
    const v = document.createElement('div');
    v.className = 'viewer';
    v.innerHTML = `
      <iframe src="${url}" allow="autoplay; clipboard-read; clipboard-write"></iframe>
      <div class="viewer-footer"><button class="btn" id="backHub">⬅ Hub</button></div>`;
    document.body.appendChild(v);
    v.querySelector('#backHub').addEventListener('click', () => v.remove());
    // Escuta mensagens para respostas via Trinity
    window.addEventListener('message', (e) => {
      const m = e.data || {};
      if (!m) return;
      if (m.type === 'DUAL_RESPONSE' && typeof window.chatBubble === 'function') {
        const text = m.text || '(vazio)';
        window.chatBubble(text, 'ai', { arch: 'Nova' });
      }
    });
  }
  // 2. Injeta chip "Trinity" na refinebar de cada resposta do chat
  (function addTrinityChipToChat(){
    const chatView = document.getElementById('view-chat');
    if (!chatView) return;
    // Observa cliques e adiciona refinebar conforme necessário
    document.addEventListener('click', (ev) => {
      const bubble = ev.target.closest('#view-chat .bubble.ai');
      if (!bubble) return;
      const row = bubble.parentElement;
      let bar = row.querySelector('.refinebar');
      if (!bar) {
        bar = document.createElement('div');
        bar.className = 'refinebar';
        bar.style.display = 'flex';
        bar.style.gap = '8px';
        bar.innerHTML = '<span class="chip" data-refine="trinity">Trinity</span>';
        row.appendChild(bar);
      }
    });
    // Captura clique no chip e envia prompt via Trinity
    document.addEventListener('click', (ev) => {
      const chip = ev.target.closest('.chip[data-refine="trinity"]');
      if (!chip) return;
      const row = chip.closest('.row');
      const bubble = row ? row.querySelector('.bubble') : null;
      const text = bubble && bubble.childNodes && bubble.childNodes[0] ? bubble.childNodes[0].textContent : '';
      try {
        Trinity.pushToDualApp(text);
        if (typeof window.chatBubble === 'function') {
          window.chatBubble('▶ Dual‑App acionado', 'ai');
        }
      } catch {
        if (typeof window.chatBubble === 'function') {
          window.chatBubble('Falha Trinity', 'ai');
        }
      }
    });
  })();
  // 3. Brain: adiciona botão "Sync DualStore"
  (function addBrainSync(){
    const brainGrid = document.querySelector('#view-brain .grid');
    if (!brainGrid) return;
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div class="label">Trinity • Sync</div>
      <div class="sublabel">Sincronizar tema/ativação/usuário do Dual‑App</div>
      <div class="hr"></div>
      <button class="btn-pill" id="btnTriSync">Sync DualStore</button>
      <div class="status" id="triSyncStatus" style="margin-top:8px">—</div>`;
    brainGrid.appendChild(card);
    card.querySelector('#btnTriSync').addEventListener('click', () => {
      try {
        Trinity.syncFromDual();
        card.querySelector('#triSyncStatus').textContent = 'OK';
      } catch {
        card.querySelector('#triSyncStatus').textContent = 'Falhou';
      }
    });
  })();
  // 4. Perfil: toggles para sincronização de tema e TTS
  (function addProfileToggles(){
    const profileView = document.getElementById('view-profile');
    if (!profileView) return;
    const wrap = document.createElement('div');
    wrap.className = 'card';
    wrap.innerHTML = `
      <div style="font-size:12px;opacity:.7">Trinity</div>
      <label><input type="checkbox" id="triTheme" checked> Sincronizar Tema</label><br>
      <label><input type="checkbox" id="triTTS" checked> Sincronizar TTS</label>`;
    profileView.appendChild(wrap);
    wrap.querySelector('#triTheme').addEventListener('change', (e) => {
      Trinity.setFlag('sync.theme', e.target.checked);
    });
    wrap.querySelector('#triTTS').addEventListener('change', (e) => {
      Trinity.setFlag('sync.tts', e.target.checked);
    });
  })();
})();