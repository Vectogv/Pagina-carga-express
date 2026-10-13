import { useEffect, useState } from 'react';
import api from '../api/axios';
import { DOCUMENTOS_CONDUCTOR } from '../utils/documentos';

// Lista de documentos exigidos al conductor, la manda el servidor. Caché global por sesión;
// si falla, se usa la lista local de utils/documentos.js (solo respaldo).
const FALLBACK = DOCUMENTOS_CONDUCTOR.map(([clave, etiqueta]) => ({ clave, etiqueta }));
let cache = null;
let promesa = null;

function cargar() {
  if (cache) return Promise.resolve(cache);
  if (!promesa) {
    promesa = api.get('/api/config/documentos-conductor')
      .then(({ data }) => {
        const lista = Array.isArray(data) ? data : data?.documentos;
        cache = Array.isArray(lista) && lista.length ? lista : FALLBACK;
        return cache;
      })
      .catch(() => { promesa = null; return FALLBACK; });
  }
  return promesa;
}

/** @returns {{ documentos: {clave:string, etiqueta:string}[], cargando: boolean }} */
export default function useDocumentosConductor() {
  const [documentos, setDocumentos] = useState(cache || FALLBACK);
  const [cargando, setCargando] = useState(!cache);
  useEffect(() => {
    let vivo = true;
    cargar().then((d) => { if (vivo) { setDocumentos(d); setCargando(false); } });
    return () => { vivo = false; };
  }, []);
  return { documentos, cargando };
}
