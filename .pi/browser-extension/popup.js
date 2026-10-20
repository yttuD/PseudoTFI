const status = document.querySelector('#status');
async function refresh() {
  const state = await chrome.runtime.sendMessage({ type: 'status' });
  const settings = await chrome.storage.local.get(['connection', 'selectors', 'lastError']);
  status.textContent = state.connected ? 'Conectado con Pi · Rendo' : settings.lastError || 'Sin conexión con el puente local';
  if (settings.connection) { document.querySelector('#port').value = settings.connection.port; document.querySelector('#token').value = settings.connection.token; }
  document.querySelector('#selectors').value = JSON.stringify(settings.selectors ?? {}, null, 2);
}
document.querySelector('#connection').addEventListener('submit', async event => {
  event.preventDefault();
  await chrome.storage.local.set({ connection: { port: Number(document.querySelector('#port').value), token: document.querySelector('#token').value.trim() }, lastError: '' });
  await chrome.runtime.sendMessage({ type: 'connect' }); status.textContent = 'Vinculando…';
  setTimeout(refresh, 800);
});
document.querySelector('#save-selectors').addEventListener('click', async () => {
  try {
    const selectors = JSON.parse(document.querySelector('#selectors').value || '{}');
    if (!selectors || Array.isArray(selectors) || Object.keys(selectors).some(key => !['chatgpt', 'gemini'].includes(key))) throw new Error('Usá chatgpt y/o gemini.');
    for (const values of Object.values(selectors)) if (!values || Array.isArray(values) || Object.entries(values).some(([key, value]) => !['composer', 'send', 'response', 'stop', 'model', 'effort', 'file', 'attachment', 'modelOption', 'effortOption'].includes(key) || typeof value !== 'string' || !value.trim())) throw new Error('Selector CSS inválido.');
    await chrome.storage.local.set({ selectors }); status.textContent = 'Controles guardados';
  } catch (error) { status.textContent = error.message; }
});
refresh().catch(error => { status.textContent = error.message; });
