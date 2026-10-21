import { supabase } from './supabase';
import { listarFila, removerFila, removerDoPacote } from './offline';

// Envia as respostas dadas offline. O servidor refaz a correção; o que ele recusa (já respondida, etc.) sai da fila.
export async function sincronizar(uid) {
  let ok = 0, ign = 0;
  for (;;) {
    const fila = await listarFila(uid);
    if (!fila.length) break;
    const lote = fila.slice(0, 200);
    const { data, error } = await supabase.rpc('sincronizar_respostas', {
      p: lote.map(x => ({ question_id: x.question_id, escolha: x.escolha, quando: x.quando }))
    });
    if (error) return { ok, ign, erro: error.message };
    await removerFila(lote.map(x => x.id));
    await removerDoPacote(uid, lote.map(x => x.question_id));
    ok += data?.[0]?.r_ok ?? 0;
    ign += data?.[0]?.r_ignoradas ?? 0;
  }
  return { ok, ign };
}
