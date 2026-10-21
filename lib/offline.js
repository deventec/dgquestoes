// Armazenamento offline no aparelho (IndexedDB): pacote de questões baixadas e fila de respostas a sincronizar.
const DB = 'dg_offline';

function abrir() {
  return new Promise((res, rej) => {
    if (typeof indexedDB === 'undefined') return rej(new Error('Este navegador não permite armazenamento offline.'));
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => {
      const db = r.result;
      if (!db.objectStoreNames.contains('pacote')) db.createObjectStore('pacote', { keyPath: 'k' });
      if (!db.objectStoreNames.contains('fila')) db.createObjectStore('fila', { keyPath: 'id', autoIncrement: true });
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

async function exec(store, modo, fn) {
  const db = await abrir();
  return new Promise((res, rej) => {
    const t = db.transaction(store, modo);
    let req;
    try { req = fn(t.objectStore(store)); } catch (e) { db.close(); return rej(e); }
    t.oncomplete = () => { db.close(); res(req && 'result' in req ? req.result : undefined); };
    t.onerror = () => { db.close(); rej(t.error); };
    t.onabort = () => { db.close(); rej(t.error || new Error('Operação cancelada.')); };
  });
}

export const listarPacote = async uid => ((await exec('pacote', 'readonly', s => s.getAll())) || []).filter(x => x.uid === uid);

// Guarda só as questões que ainda não estão no pacote (não sobrescreve respostas já dadas offline)
export async function salvarPacote(uid, qs) {
  const ja = new Set((await listarPacote(uid)).map(x => x.id));
  const novos = qs.filter(q => !ja.has(q.id));
  if (novos.length) await exec('pacote', 'readwrite', s => { novos.forEach(q => s.put({ ...q, k: `${uid}:${q.id}`, uid, respondida: null })); });
  return novos.length;
}

export const marcarRespondida = (uid, qid, escolha) => exec('pacote', 'readwrite', s => {
  const r = s.get(`${uid}:${qid}`);
  r.onsuccess = () => { if (r.result) s.put({ ...r.result, respondida: escolha }); };
});

export const removerDoPacote = (uid, qids) => exec('pacote', 'readwrite', s => { qids.forEach(id => s.delete(`${uid}:${id}`)); });

export async function limparNaoRespondidas(uid) {
  const l = (await listarPacote(uid)).filter(x => x.respondida === null || x.respondida === undefined);
  await removerDoPacote(uid, l.map(x => x.id));
  return l.length;
}

export const enfileirar = (uid, item) => exec('fila', 'readwrite', s => s.add({ ...item, uid }));
export const listarFila = async uid => ((await exec('fila', 'readonly', s => s.getAll())) || []).filter(x => x.uid === uid);
export const removerFila = ids => exec('fila', 'readwrite', s => { ids.forEach(id => s.delete(id)); });
