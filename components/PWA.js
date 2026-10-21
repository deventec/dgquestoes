'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { sincronizar } from '@/lib/sync';
import { listarFila } from '@/lib/offline';

const uidCache = () => { try { return JSON.parse(localStorage.getItem('dg_cache') || 'null')?.id || null; } catch { return null; } };

// Registra o service worker, avisa quando a internet cai e sincroniza as respostas offline quando ela volta
export default function PWA() {
  const path = usePathname();
  const [online, setOnline] = useState(true);
  const [aviso, setAviso] = useState('');

  const sync = useCallback(async () => {
    const uid = uidCache();
    if (!uid || !navigator.onLine) return;
    try {
      if (!(await listarFila(uid)).length) return;
      const r = await sincronizar(uid);
      if (r.ok || r.ign) { setAviso(`${r.ok} resposta(s) dadas offline foram sincronizadas.`); setTimeout(() => setAviso(''), 6000); }
    } catch {}
  }, []);

  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') navigator.serviceWorker.register('/sw.js').catch(() => {});
    setOnline(navigator.onLine);
    const on = () => { setOnline(true); sync(); };
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    sync();
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, [sync]);

  return (
    <>
      {!online && (
        <div className="offbar" role="status">
          Você está sem internet. {path !== '/offline' && <Link href="/offline">Abrir o modo offline</Link>}
        </div>
      )}
      {aviso && <div className="offbar ok" role="status">{aviso}</div>}
    </>
  );
}
