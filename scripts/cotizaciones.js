/**
 * Baja del Banco Central del Uruguay (BCU) la cotización del dólar y el valor de
 * la Unidad Indexada, y los guarda en un JSON que la página lee sin depender de
 * otra API. Lo corre el workflow de publicación todos los días.
 *
 *   node scripts/cotizaciones.js data/cotizaciones.json
 *
 * El servicio web del BCU es SOAP: primero se pide la fecha del último cierre y
 * después las cotizaciones de los días anteriores, quedándose con la más reciente.
 */
const BCU_URL = 'https://cotizaciones.bcu.gub.uy/wscotizaciones/servlet/';
const MONEDAS = { usd: 2225, ui: 9800 }; // Dólar USA billete, Unidad Indexada
const DIAS_ATRAS = 14;
const TIMEOUT_MS = 20000;

function envelope(body) {
  return '<?xml version="1.0" encoding="utf-8"?>'
    + '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:cot="Cotiza">'
    + `<soapenv:Header/><soapenv:Body>${body}</soapenv:Body></soapenv:Envelope>`;
}

function ultimoCierreRequest() {
  return envelope('<cot:wsultimocierre.Execute/>');
}

function cotizacionesRequest(desde, hasta, monedas = Object.values(MONEDAS)) {
  const items = monedas.map(m => `<cot:item>${m}</cot:item>`).join('');
  return envelope(
    '<cot:wsbcucotizaciones.Execute><cot:Entrada>'
    + `<cot:Moneda>${items}</cot:Moneda>`
    + `<cot:FechaDesde>${desde}</cot:FechaDesde><cot:FechaHasta>${hasta}</cot:FechaHasta>`
    + '<cot:Grupo>0</cot:Grupo>'
    + '</cot:Entrada></cot:wsbcucotizaciones.Execute>'
  );
}

/** Contenido de cada etiqueta con ese nombre, sin importar el prefijo de namespace. */
function tags(xml, name) {
  const re = new RegExp(`<(?:[\\w-]+:)?${name.replace('.', '\\.')}(?:\\s[^>]*)?>([\\s\\S]*?)</(?:[\\w-]+:)?${name.replace('.', '\\.')}>`, 'g');
  return [...xml.matchAll(re)].map(m => m[1].trim());
}

function tag(xml, name) {
  return tags(xml, name)[0];
}

function checkStatus(xml) {
  const status = tag(xml, 'respuestastatus');
  if (status && tag(status, 'status') !== '1') {
    throw new Error(`BCU: ${tag(status, 'mensaje') || 'error'} (código ${tag(status, 'codigoerror')})`);
  }
}

function parseUltimoCierre(xml) {
  const fecha = tag(xml, 'Fecha');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha || '')) throw new Error('BCU: no vino la fecha del último cierre');
  return fecha;
}

/** { usd: { valor, fecha }, ui: { valor, fecha } } con la cotización más reciente de cada una. */
function parseCotizaciones(xml) {
  checkStatus(xml);
  const result = {};
  for (const dato of tags(xml, 'datoscotizaciones.dato')) {
    const codigo = Number(tag(dato, 'Moneda'));
    const clave = Object.keys(MONEDAS).find(k => MONEDAS[k] === codigo);
    const valor = Number(tag(dato, 'TCV'));
    const fecha = tag(dato, 'Fecha');
    if (!clave || !(valor > 0) || !fecha) continue;
    if (!result[clave] || fecha > result[clave].fecha) result[clave] = { valor, fecha };
  }
  return result;
}

function restarDias(fecha, dias) {
  const d = new Date(`${fecha}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - dias);
  return d.toISOString().slice(0, 10);
}

async function soap(servicio, body, fetchImpl) {
  const res = await fetchImpl(BCU_URL + servicio, {
    method: 'POST',
    headers: { 'Content-Type': 'text/xml; charset=utf-8', SOAPAction: '' },
    body,
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`BCU: HTTP ${res.status} en ${servicio}`);
  return text;
}

async function fetchCotizaciones({ fetchImpl = fetch } = {}) {
  const cierre = parseUltimoCierre(await soap('awsultimocierre', ultimoCierreRequest(), fetchImpl));
  const xml = await soap('awsbcucotizaciones', cotizacionesRequest(restarDias(cierre, DIAS_ATRAS), cierre), fetchImpl);
  const cot = parseCotizaciones(xml);
  if (!cot.usd && !cot.ui) throw new Error('BCU: la respuesta no trae dólar ni UI');
  return { fuente: 'BCU', actualizado: new Date().toISOString(), ...cot };
}

if (require.main === module) {
  const out = process.argv[2];
  fetchCotizaciones()
    .then(data => {
      const json = JSON.stringify(data, null, 2);
      if (out) {
        const fs = require('fs');
        const path = require('path');
        fs.mkdirSync(path.dirname(out), { recursive: true });
        fs.writeFileSync(out, json + '\n');
      }
      console.log(json);
    })
    .catch(err => {
      console.error(err.message);
      process.exit(1);
    });
}

module.exports = {
  MONEDAS,
  ultimoCierreRequest,
  cotizacionesRequest,
  parseUltimoCierre,
  parseCotizaciones,
  restarDias,
  fetchCotizaciones,
};
