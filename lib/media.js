import { supabase } from './supabase';

// Caminho salvo no banco → URL pública da imagem
export const foto = path => (path ? supabase.storage.from('perfis').getPublicUrl(path).data.publicUrl : null);

// Recorta ao centro e reduz a imagem no navegador antes de enviar (leve e padronizada)
export async function redimensionar(file, w, h, qualidade = 0.85) {
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const escala = Math.max(w / bmp.width, h / bmp.height);
  const sw = w / escala, sh = h / escala;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  c.getContext('2d').drawImage(bmp, (bmp.width - sw) / 2, (bmp.height - sh) / 2, sw, sh, 0, 0, w, h);
  return new Promise((res, rej) => c.toBlob(b => (b ? res(b) : rej(new Error('Falha ao processar a imagem.'))), 'image/jpeg', qualidade));
}

// Reduz uma imagem mantendo a proporção (para prints de tela) e converte para JPEG
export async function reduzir(file, maxLado = 1600, qualidade = 0.82) {
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const e = Math.min(1, maxLado / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * e); c.height = Math.round(bmp.height * e);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise((res, rej) => c.toBlob(b => (b ? res(b) : rej(new Error('Falha ao processar a imagem.'))), 'image/jpeg', qualidade));
}
