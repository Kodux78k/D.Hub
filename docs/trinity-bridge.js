// trinity-bridge.js — unifica estado entre o Dual‑App e o Monólito
// Este arquivo expõe um objeto global `Trinity` que oferece funções para
// enviar prompts ao Dual‑App, receber respostas, sincronizar tema/ativação
// e ajustar flags de sincronização.  Ele também reflete as principais
// preferências do Dual‑App (tema, ativação, usuário) para chaves legadas
// usadas pelo Monólito, garantindo retrocompatibilidade.

(function(){
  // Impede múltiplas inicializações
  if (window.__TRINITY__) return; window.__TRINITY__ = true;
  const LS = localStorage;
  // Flags de ativação: lidas/persistidas no localStorage
  const Flags = {
    get enabled(){ return (LS.getItem('trinity.enable') ?? '1') === '1'; },
    get syncTheme(){ return (LS.getItem('trinity.sync.theme') ?? '1') === '1'; },
    get syncTTS(){ return (LS.getItem('trinity.sync.tts') ?? '1') === '1'; },
  };
  // Lê o objeto canônico de configurações do Dual‑App
  function getDual(){ try{ return JSON.parse(LS.getItem('dualapp.settings')||'{}'); }catch{ return {}; } }
  // Atualiza parcialmente o objeto canônico
  function setDual(p){ try{ const cur = getDual(); LS.setItem('dualapp.settings', JSON.stringify({...cur, ...(p||{})})); }catch{} }
  // Espelha valores chave (tema, ativação, nome, base de assistente) em chaves legadas
  function mirrorLegacy(){
    const s = getDual();
    // Ativação
    if (s.activation && s.activation.enabled != null) {
      LS.setItem('infodoseEnabled', s.activation.enabled ? '1' : '0');
    }
    // Tema
    if (s.ui && s.ui.theme) {
      LS.setItem('infodoseTheme', s.ui.theme);
    }
    // Nome de usuário
    if (s.user && s.user.name) {
      LS.setItem('userName', s.user.name);
    }
    // Base de assistente/arquétipo
    if (s.arch && s.arch.assistant) {
      LS.setItem('assistantBase', s.arch.assistant);
    }
  }
  // Aplica a classe de tema ao body e atualiza a chave legada do tema
  function applyThemeToBody(theme){
    document.body.classList.remove('light','medium','vibe','dark');
    if (theme && theme !== 'dark') document.body.classList.add(theme);
    LS.setItem('infodoseTheme', theme || 'dark');
  }
  // Sistema de mensagens via postMessage: envia e recebe
  const BUS = {
    send(type, data){
      try{
        // Envia a mensagem ao pai; se não houver, tenta window.parent
        (window.parent || window).postMessage({__TRINITY__:1, type, data}, '*');
      }catch{}
    },
    on(fn){
      window.addEventListener('message', (ev) => {
        const m = ev.data || {};
        if (m && m.__TRINITY__) fn(m);
      });
    }
  };
  // Exponha API global
  window.Trinity = {
    // Envia prompt ao Dual‑App (quando chamado no Monólito)
    pushToDualApp(prompt){ BUS.send('CHAT_PUSH', { prompt }); },
    // Solicita retorno de resposta (chat pull)
    pullFromDualApp(){ BUS.send('CHAT_PULL'); },
    // Sincroniza preferências do Dual‑App para o Monólito
    syncFromDual(){ mirrorLegacy(); if (Flags.syncTheme) {
      const t = (getDual().ui || {}).theme || 'dark'; applyThemeToBody(t);
    } },
    // Ajusta flags de sincronização (tema/tts/ativação geral)
    setFlag(k,v){ LS.setItem('trinity.'+k, v ? '1' : '0'); },
    // Exponha as flags para leitura
    flags: Flags
  };
  // Inicializa espelhos logo na criação
  mirrorLegacy();
})();