# Simulador hipotecario Uruguay

Página web que simula un crédito hipotecario en Uruguay. A partir del precio de la propiedad, el aporte inicial, la tasa, el rango de plazos y el rango de cuota que podés pagar en pesos, muestra tres escenarios y una gráfica de cuota según plazo.

- **Cuota mínima:** el plazo más largo cuya cuota no supera tu cuota mínima.
- **Cuota máxima:** el plazo más corto cuya cuota no supera tu cuota máxima. Es el que menos intereses paga.
- **Óptimo (equilibrio):** el plazo más corto con una cuota hasta la mitad de tu rango.

El préstamo puede calcularse en dólares, en Unidades Indexadas (UI) o en pesos. Las cuotas usan el sistema francés (cuota fija, tasa mensual = TNA / 12).

## Uso

No necesita instalación: abrí `index.html` en el navegador, o servilo localmente:

```bash
npx serve .
```

La cotización del dólar se obtiene de [open.er-api.com](https://open.er-api.com) como referencia de mercado (no es la oficial del BCU) y se puede editar. El valor de la UI se ingresa a mano; lo publica el [INE](https://www.ine.gub.uy/unidad-indexada).

## Financiamiento

`financiamiento.html` (botón **Financiamiento** en la barra) reúne las ofertas hipotecarias de BHU, BBVA, Santander, Itaú, Scotiabank y BTG Pactual (ex HSBC): tasas por moneda, plazo, financiación, relación cuota/ingreso, puntos fuertes de cada banco, programas públicos (FGCH, Yo Ahorro, subsidio MVOT), consejos y fuentes con fecha de consulta.

Tiene un comparador: con el monto, el plazo y la moneda calcula la cuota y los intereses en cada banco con su TEA publicada (tasa mensual = (1 + TEA)^(1/12) − 1). **Simular** abre el simulador con ese banco elegido (`index.html?banco=bbva&moneda=UI`).

En el simulador se puede elegir el **banco**. Al elegirlo se cargan su rango de plazos y su tasa (la TEA del tramo que corresponde al plazo máximo y al monto, convertida a TNA), y el formulario valida que el banco acepte el préstamo: moneda, plazos, monto y aporte mínimo según el % que financia. Después de calcular, **¿Qué banco te conviene?** compara la cuota de todos los bancos para ese préstamo y permite cambiar de banco con **Usar**. Antes de calcular, una tarjeta muestra las tasas de cada banco y lleva a la página de financiamiento.

El precio y el aporte se ingresan siempre en dólares. El préstamo puede ser en dólares, UI o pesos; en UI y pesos el monto se convierte con la cotización. Si el banco elegido no presta en la moneda marcada, se pasa a una que sí ofrece y las demás quedan deshabilitadas.

El formulario y la simulación se guardan en `sessionStorage` (solo esa pestaña): al ir a la página de financiamiento y volver, se recuperan los valores y se rehace el cálculo. La página de financiamiento usa ese préstamo para precargar su comparador.

Los datos están en `js/bancos.js`. Para actualizarlos, cambiá `CONSULTADO` y los tramos de cada banco.

## Búsqueda de propiedades

Después de simular, la página ofrece buscar casas con ese presupuesto; el formulario se abre solo si la persona toca **Buscar casas**. El precio máximo sugerido es lo que se puede pagar con el aporte inicial y la cuota máxima al plazo máximo; se puede editar, igual que el margen de precio (± %, 10 por defecto), los dormitorios mínimos, el tipo, el departamento y las localidades (barrios en Montevideo).

La búsqueda la hace el backend de `server/` (Node 20.18 o superior):

```bash
cd server
npm install
MELI_ACCESS_TOKEN=... npm start   # escucha en http://localhost:3000
```

La página lo busca en `http://localhost:3000`. Si lo publicás en otro lado, definí `window.SEARCH_API_URL` antes de cargar `js/search.js` y poné el dominio de la página en `ALLOWED_ORIGIN`.

| Fuente | Cómo se consulta | Por qué |
|---|---|---|
| Mercado Libre | API oficial (`api.mercadolibre.com`), con `MELI_ACCESS_TOKEN` de una app creada en developers.mercadolibre.com.uy | Tiene API pública y su robots.txt no permite bots genéricos. Sin token la fuente figura como "No configurada". |
| Gallito | Lectura del listado HTML, hasta 3 páginas por búsqueda, una a la vez, con pausa y caché de 15 minutos | Su robots.txt permite todo y no publica términos que lo prohíban. |
| InfoCasas | Solo un enlace a su buscador | Sus términos (cláusula 16.2) prohíben robots, spiders y scrapers sin autorización escrita. |
| RE/MAX | Solo un enlace a su buscador | Su robots.txt y sus términos no lo prohíben, pero el listado se carga con JavaScript desde una API interna sin documentar. |

Para sumar otra inmobiliaria se agrega un archivo en `server/sources/` con `nombre`, `sitio` y `search(criterios)`, después de revisar su robots.txt y sus términos.

## Tests

```bash
npm install
npm test                    # cálculos (Jest)
cd server && npm test       # backend (node --test)
```

## Publicación

El workflow `.github/workflows/pages.yml` corre los tests en cada PR y, al hacer merge a `main`, publica el sitio en GitHub Pages. Para que funcione hay que activar Pages una vez en **Settings → Pages → Source: GitHub Actions**.

## Estructura

| Archivo | Contenido |
|---|---|
| `js/calculator.js` | Cálculos puros (cuota, intereses, escenarios), testeados con Jest |
| `js/api.js` | Cotización y formato de moneda |
| `js/app.js` | Formulario, validaciones y resultados |
| `js/chartConfig.js` | Gráfica con Chart.js |
| `js/search.js` | Formulario y resultados de la búsqueda de propiedades |
| `js/bancos.js` | Ofertas de los bancos y comparador de préstamos, testeados con Jest |
| `js/financiamiento.js` | Página de financiamiento |
| `js/bancoSimulador.js` | Banco elegido en el simulador, sus validaciones y la comparación de bancos |
| `js/localidades.js` | Departamentos y localidades (lo usan la página y el backend) |
| `server/` | Backend de búsqueda: `search.js` filtra y junta, `sources/` tiene una fuente por portal |
| `img/` | Logo y favicon |
| `SPEC.md` | Especificación técnica y criterios de aceptación |
