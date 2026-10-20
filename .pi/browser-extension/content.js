(() => {
  const provider = location.hostname === 'chatgpt.com' ? 'chatgpt' : 'gemini';
  const defaults = {
    chatgpt: { composer: '#prompt-textarea', send: 'button[data-testid="send-button"], button[aria-label="Enviar mensaje"], button[aria-label="Send prompt"]', response: '[data-message-author-role="assistant"]', stop: 'button[data-testid="stop-button"], button[aria-label="Stop generating"], button[aria-label="Detener generación"]', model: 'button[data-testid="model-switcher-dropdown-button"]', effort: 'button', file: 'input[type="file"]' },
    gemini: { composer: 'rich-textarea [contenteditable="true"], [contenteditable="true"][role="textbox"]', send: 'button[aria-label="Enviar mensaje"], button[aria-label="Send message"]', response: 'model-response', stop: 'button[aria-label="Stop response"], button[aria-label="Detener respuesta"]', model: 'button[aria-haspopup="menu"], button[aria-haspopup="listbox"]', effort: 'button[aria-haspopup="menu"], button[aria-haspopup="listbox"]', file: 'input[type="file"]' },
  };
  let active = false, busy = false, cancelled = false, model, effort, selectors;
  const normalize = text => String(text).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const text = element => element.innerText || element.getAttribute('aria-label') || element.textContent || '';
  const visible = element => !!element.getClientRects().length && getComputedStyle(element).visibility !== 'hidden';
  const elements = selector => [...document.querySelectorAll(selector)].filter(visible);
  function single(selector, label) {
    const found = elements(selector);
    if (found.length !== 1) throw new Error(`${label}: se esperaba un control visible y se encontraron ${found.length}. Ajustá los selectores en la extensión.`);
    return found[0];
  }
  function selection(selector, expected, label) {
    const words = normalize(expected).split(' ');
    const found = elements(selector).filter(element => {
      if (!element.matches('button,select,[role="button"],[role="combobox"]')) return false;
      const actual = normalize(text(element)); return words.every(word => actual.split(' ').includes(word));
    });
    if (found.length !== 1) throw new Error(`${label} no confirmado: seleccioná «${expected}» en el chat y comprobá el selector configurado. No se sustituye automáticamente.`);
    return text(found[0]).trim();
  }
  function verifySelection() { return { model: selection(selectors.model, model, 'Modelo'), effort: selection(selectors.effort, effort, 'Nivel') }; }
  async function choose(control, option, expected, label) {
    try { return selection(control, expected, label); } catch { /* Selection may need changing before the first message. */ }
    single(control, label).click();
    const deadline = Date.now() + 5000;
    while (Date.now() < deadline) {
      const words = normalize(expected).split(' ');
      const options = elements(option || '[role="menuitemradio"],[role="menuitem"],[role="option"]').filter(element => words.every(word => normalize(text(element)).split(' ').includes(word)));
      if (options.length === 1) { options[0].click(); await delay(300); return selection(control, expected, label); }
      await delay(200);
    }
    throw new Error(`${label}: no se encontró una opción única «${expected}». Configurar los controles; no se sustituyen modelos.`);
  }
  async function open(message) {
    const settings = await chrome.storage.local.get('selectors');
    selectors = { ...defaults[provider], ...settings.selectors?.[provider] };
    model = message.model; effort = message.effort;
    const deadline = Date.now() + 15000;
    while (Date.now() < deadline && !elements(selectors.composer).length) await delay(250);
    single(selectors.composer, 'Campo de mensaje');
    if (elements(selectors.response).length) throw new Error('El chat contiene respuestas anteriores. Se requiere una conversación nueva.');
    await choose(selectors.model, selectors.modelOption, model, 'Modelo');
    await choose(selectors.effort, selectors.effortOption, effort, 'Nivel');
    const selected = verifySelection();
    active = true; cancelled = false;
    return { selected };
  }
  async function attach(images) {
    if (!images.length) return;
    const inputs = [...document.querySelectorAll(selectors.file)].filter(element => element instanceof HTMLInputElement && element.type === 'file');
    if (inputs.length !== 1) throw new Error('No se encontró un único control de adjuntos; configurar file en la extensión. La revisión visual no se aceptará.');
    const transfer = new DataTransfer();
    images.forEach((image, index) => {
      const bytes = Uint8Array.from(atob(image.data), char => char.charCodeAt(0));
      transfer.items.add(new File([bytes], `rendo-evidence-${index}.${image.mimeType.split('/')[1]}`, { type: image.mimeType }));
    });
    inputs[0].files = transfer.files;
    inputs[0].dispatchEvent(new Event('change', { bubbles: true }));
    if (inputs[0].files.length !== images.length) throw new Error('El chat no recibió los adjuntos; no se puede aceptar evidencia visual.');
    const preview = selectors.attachment || '[data-testid="file-upload-preview"],[data-testid="file-thumbnail"],[aria-label*="rendo-evidence-"],img[alt*="rendo-evidence-"]';
    const deadline = Date.now() + 30000;
    while (Date.now() < deadline) {
      const descriptions = elements(preview).map(element => `${text(element)} ${element.getAttribute('aria-label') ?? ''} ${element.getAttribute('alt') ?? ''}`).join('\n');
      if ([...transfer.files].every(file => descriptions.includes(file.name))) return;
      await delay(300);
    }
    throw new Error('No se confirmaron las vistas previas de las capturas. Ajustar attachment; la revisión visual queda bloqueada.');
  }
  function fill(element, value) {
    element.focus();
    if (element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement) {
      const prototype = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(prototype, 'value').set.call(element, value);
    } else {
      const selection = getSelection(), range = document.createRange();
      range.selectNodeContents(element); selection.removeAllRanges(); selection.addRange(range);
      if (!document.execCommand('insertText', false, value)) { element.textContent = value; }
    }
    element.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: value }));
  }
  async function exchange(message) {
    if (!active || busy) throw new Error('Chat sin sesión de Rendo o intervención ya activa.');
    verifySelection();
    busy = true; cancelled = false;
    try {
      const previous = elements(selectors.response).length;
      await attach(message.images);
      fill(single(selectors.composer, 'Campo de mensaje'), message.prompt);
      const send = single(selectors.send, 'Enviar');
      if (send.disabled || send.getAttribute('aria-disabled') === 'true') throw new Error('El chat aún no permite enviar: comprobar adjuntos, login o cuota.');
      send.click();
      return { text: await waitForReply(previous, message.requestId) };
    } finally { busy = false; }
  }
  const delay = ms => new Promise(done => setTimeout(done, ms));
  async function waitForReply(previous, requestId) {
    const deadline = Date.now() + 1800000;
    let last = '', changedAt = Date.now(), reportedAt = 0;
    while (Date.now() < deadline) {
      if (cancelled) throw new Error('Intervención cancelada; revisar el chat antes de retomar.');
      const replies = elements(selectors.response), reply = replies.length > previous ? replies.at(-1) : null;
      if (!reply && !elements(selectors.stop).length && Date.now() - changedAt > 45000) throw new Error('El chat no inició una respuesta. Comprobar cuota, login y controles de envío; no se reenviará el mensaje.');
      const current = reply?.querySelector('pre code')?.textContent || (reply ? text(reply) : '');
      if (current !== last) { last = current; changedAt = Date.now(); }
      if (Date.now() - reportedAt >= 10000) { chrome.runtime.sendMessage({ type: 'rendo-progress', requestId, message: reply || elements(selectors.stop).length ? 'El chat está generando la respuesta.' : 'Esperando el inicio de la respuesta del chat.' }).catch(() => {}); reportedAt = Date.now(); }
      if (last.trim() && !elements(selectors.stop).length && Date.now() - changedAt >= 2500) {
        try { const clean = last.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, ''); JSON.parse(clean); return last; }
        catch { if (Date.now() - changedAt > 15000) return last; }
      }
      await delay(300);
    }
    throw new Error('El chat no terminó su respuesta; no se reenvía automáticamente.');
  }
  chrome.runtime.onMessage.addListener((message, _sender, respond) => {
    if (message.type === 'rendo-cancel') { if (active && busy && selectors) { const stops = elements(selectors.stop); if (stops.length === 1) stops[0].click(); } cancelled = true; active = false; respond({ cancelled: true }); return; }
    if (!['rendo-open', 'rendo-exchange'].includes(message.type)) return;
    (message.type === 'rendo-open' ? open(message) : exchange(message)).then(respond).catch(error => respond({ error: error.message }));
    return true;
  });
})();
