'use client';
import { useEffect, useState } from 'react';

// Alternativas "riscadas" pelo aluno em cada questão (ficam salvas no aparelho até a questão ser respondida)
const chave = id => `dg_e_${id}`;

export function limparEliminadas(ids) {
  try { ids.forEach(id => localStorage.removeItem(chave(id))); } catch {}
}

export function useEliminadas(id) {
  const [lista, setLista] = useState([]);
  useEffect(() => {
    try { setLista(JSON.parse(localStorage.getItem(chave(id)) || '[]')); } catch { setLista([]); }
  }, [id]);
  const salvar = l => {
    setLista(l);
    try { l.length ? localStorage.setItem(chave(id), JSON.stringify(l)) : localStorage.removeItem(chave(id)); } catch {}
  };
  const alternar = i => salvar(lista.includes(i) ? lista.filter(x => x !== i) : [...lista, i]);
  const limpar = () => salvar([]);
  return [lista, alternar, limpar];
}
