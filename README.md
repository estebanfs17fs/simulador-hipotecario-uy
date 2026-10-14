# Simulador hipotecario Uruguay

Página web que simula un crédito hipotecario en Uruguay. A partir del precio de la propiedad, el aporte inicial, la tasa, el rango de plazos y el rango de cuota que podés pagar en pesos, muestra tres escenarios y una gráfica de cuota según plazo.

- **Cuota mínima:** el plazo más largo cuya cuota no supera tu cuota mínima.
- **Cuota máxima:** el plazo más corto cuya cuota no supera tu cuota máxima. Es el que menos intereses paga.
- **Óptimo (equilibrio):** el plazo más corto con una cuota hasta la mitad de tu rango.

El préstamo puede calcularse en dólares o en Unidades Indexadas (UI). Las cuotas usan el sistema francés (cuota fija, tasa mensual = TNA / 12).

## Uso

No necesita instalación: abrí `index.html` en el navegador, o servilo localmente:

```bash
npx serve .
```

La cotización del dólar se obtiene de [open.er-api.com](https://open.er-api.com) como referencia de mercado (no es la oficial del BCU) y se puede editar. El valor de la UI se ingresa a mano; lo publica el [INE](https://www.ine.gub.uy/unidad-indexada).

## Tests

```bash
npm install
npm test
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
| `SPEC.md` | Especificación técnica y criterios de aceptación |
