const {
  cotizacionesRequest,
  parseUltimoCierre,
  parseCotizaciones,
  restarDias,
  fetchCotizaciones,
} = require('../scripts/cotizaciones');

const dato = (moneda, fecha, tcv) => `
  <datoscotizaciones.dato>
    <Fecha>${fecha}</Fecha><Moneda>${moneda}</Moneda><Nombre>X</Nombre>
    <TCC>${tcv}</TCC><TCV>${tcv}</TCV>
  </datoscotizaciones.dato>`;

const cotizacionesXml = (datos, status = 1, mensaje = '') => `<?xml version="1.0"?>
<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/">
  <SOAP-ENV:Body><wsbcucotizaciones.ExecuteResponse xmlns="Cotiza"><Salida>
    <respuestastatus><status>${status}</status><codigoerror>${status === 1 ? 0 : 101}</codigoerror><mensaje>${mensaje}</mensaje></respuestastatus>
    <datoscotizaciones>${datos.join('')}</datoscotizaciones>
  </Salida></wsbcucotizaciones.ExecuteResponse></SOAP-ENV:Body>
</SOAP-ENV:Envelope>`;

const cierreXml = fecha => `<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/">
  <SOAP-ENV:Body><wsultimocierre.ExecuteResponse xmlns="Cotiza"><Salida><Fecha>${fecha}</Fecha></Salida></wsultimocierre.ExecuteResponse></SOAP-ENV:Body>
</SOAP-ENV:Envelope>`;

describe('cotizacionesRequest', () => {
  test('pide dólar y UI en el rango de fechas', () => {
    const xml = cotizacionesRequest('2026-10-01', '2026-10-15');
    expect(xml).toContain('<cot:item>2225</cot:item><cot:item>9800</cot:item>');
    expect(xml).toContain('<cot:FechaDesde>2026-10-01</cot:FechaDesde>');
    expect(xml).toContain('<cot:FechaHasta>2026-10-15</cot:FechaHasta>');
  });
});

describe('parseUltimoCierre', () => {
  test('lee la fecha', () => {
    expect(parseUltimoCierre(cierreXml('2026-10-19'))).toBe('2026-10-19');
  });
  test('falla si no hay fecha', () => {
    expect(() => parseUltimoCierre('<Salida></Salida>')).toThrow(/último cierre/);
  });
});

describe('parseCotizaciones', () => {
  test('se queda con el valor más reciente de cada moneda', () => {
    const xml = cotizacionesXml([
      dato(2225, '2026-10-16', 40.1),
      dato(2225, '2026-10-19', 40.35),
      dato(9800, '2026-10-19', 6.4123),
      dato(9800, '2026-10-17', 6.41),
    ]);
    expect(parseCotizaciones(xml)).toEqual({
      usd: { valor: 40.35, fecha: '2026-10-19' },
      ui: { valor: 6.4123, fecha: '2026-10-19' },
    });
  });
  test('ignora otras monedas y valores inválidos', () => {
    const xml = cotizacionesXml([dato(1111, '2026-10-19', 45), dato(9800, '2026-10-19', 0)]);
    expect(parseCotizaciones(xml)).toEqual({});
  });
  test('acepta etiquetas con prefijo de namespace', () => {
    const xml = '<ns:datoscotizaciones.dato><ns:Fecha>2026-10-19</ns:Fecha><ns:Moneda>9800</ns:Moneda><ns:TCV>6.4</ns:TCV></ns:datoscotizaciones.dato>';
    expect(parseCotizaciones(xml)).toEqual({ ui: { valor: 6.4, fecha: '2026-10-19' } });
  });
  test('lanza el mensaje del BCU si el status no es 1', () => {
    expect(() => parseCotizaciones(cotizacionesXml([], 0, 'Fecha inválida'))).toThrow(/Fecha inválida/);
  });
});

test('restarDias cruza meses', () => {
  expect(restarDias('2026-10-05', 14)).toBe('2026-09-21');
});

describe('fetchCotizaciones', () => {
  const respond = body => ({ ok: true, status: 200, text: async () => body });

  test('pide el último cierre y después las cotizaciones hasta esa fecha', async () => {
    const calls = [];
    const fetchImpl = async (url, opts) => {
      calls.push({ url, body: opts.body });
      return url.endsWith('awsultimocierre')
        ? respond(cierreXml('2026-10-19'))
        : respond(cotizacionesXml([dato(2225, '2026-10-19', 40.35), dato(9800, '2026-10-19', 6.41)]));
    };
    const data = await fetchCotizaciones({ fetchImpl });
    expect(calls[1].body).toContain('<cot:FechaDesde>2026-10-05</cot:FechaDesde>');
    expect(calls[1].body).toContain('<cot:FechaHasta>2026-10-19</cot:FechaHasta>');
    expect(data).toMatchObject({ fuente: 'BCU', usd: { valor: 40.35 }, ui: { valor: 6.41 } });
  });

  test('falla si el BCU no responde bien', async () => {
    const fetchImpl = async () => ({ ok: false, status: 503, text: async () => '' });
    await expect(fetchCotizaciones({ fetchImpl })).rejects.toThrow(/HTTP 503/);
  });

  test('falla si no vino ninguna cotización', async () => {
    const fetchImpl = async url => respond(url.endsWith('awsultimocierre') ? cierreXml('2026-10-19') : cotizacionesXml([]));
    await expect(fetchCotizaciones({ fetchImpl })).rejects.toThrow(/ni UI/);
  });
});
