'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const CACHE = 'dg_cache';
export const lerCache = () => { try { return JSON.parse(localStorage.getItem(CACHE) || 'null'); } catch { return null; } };
const guardarCache = (id, profile) => { try { localStorage.setItem(CACHE, JSON.stringify({ id, profile })); } catch {} };
export const limparCache = () => { try { localStorage.removeItem(CACHE); } catch {} };

// roles: lista de perfis permitidos na página (ex.: ['admin','editor']).
// reload() recarrega o perfil. Sem internet, usa o último perfil salvo no aparelho (modo offline).
export function useAuth({ roles = null } = {}) {
  const router = useRouter();
  const [state, setState] = useState({ loading: true, user: null, profile: null, offline: false });

  const load = useCallback(async () => {
    let session = null;
    try { ({ data: { session } } = await supabase.auth.getSession()); } catch {}
    const cache = lerCache();
    const semRede = typeof navigator !== 'undefined' && !navigator.onLine;

    if (!session) {
      if (semRede && cache?.profile) {
        if (roles && !roles.includes(cache.profile.role)) { router.replace('/questoes'); return; }
        setState({ loading: false, user: { id: cache.id }, profile: cache.profile, offline: true });
        return;
      }
      router.replace('/login');
      return;
    }

    let profile = null;
    try { ({ data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()); } catch {}
    if (profile) guardarCache(session.user.id, profile);
    else if (cache?.id === session.user.id) profile = cache.profile;

    if (roles && !roles.includes(profile?.role)) { router.replace('/questoes'); return; }
    setState({ loading: false, user: session.user, profile, offline: false });
  }, []); // eslint-disable-line

  useEffect(() => {
    load();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') { limparCache(); router.replace('/login'); }
    });
    return () => sub.subscription.unsubscribe();
  }, [load]); // eslint-disable-line

  return { ...state, reload: load };
}
