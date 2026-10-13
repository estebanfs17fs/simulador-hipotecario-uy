# SPEC: Simulador de Créditos Hipotecarios Uruguay

## 1. Propósito
Aplicación web estática que permite simular un crédito hipotecario en Uruguay, generando tres escenarios optimizados a partir de los parámetros del usuario y visualizando el impacto del plazo sobre la cuota mensual.

---

## 2. Módulo de Cálculo (`js/calculator.js`)

### 2.1 Funciones de conversión

```js
convertUSDtoUYU(amountUSD: number, exchangeRate: number): number
```
- Retorna `amountUSD * exchangeRate`
- Precondición: ambos parámetros > 0

```js
convertUYUtoUSD(amountUYU: number, exchangeRate: number): number
```
- Retorna `amountUYU / exchangeRate`
- Precondición: ambos parámetros > 0

---

### 2.2 Fórmula base de cuota mensual (sistema francés)

```js
calculateMonthlyPayment(principal: number, annualRate: number, years: number): number
```

**Fórmula:**
```
r = annualRate / 100 / 12          (tasa mensual)
n = years * 12                     (cantidad de cuotas)
M = P * [r(1+r)^n] / [(1+r)^n - 1]
```

**Casos especiales:**
- Si `annualRate === 0`: `M = principal / n` (división simple)
- Si `years === 0` o `principal === 0`: retorna `0`

**Criterios de aceptación (TNA/12 como tasa mensual):**
- `calculateMonthlyPayment(100000, 3.75, 20)` ≈ `592.89 USD` (tolerancia ±0.05)
- `calculateMonthlyPayment(100000, 3.75, 30)` ≈ `463.12 USD` (tolerancia ±0.05)
- `calculateMonthlyPayment(50000, 0, 10)` = `416.67 USD` (tolerancia ±0.01)

---

### 2.3 Cálculo de intereses totales

```js
calculateTotalInterest(principal: number, monthlyPayment: number, years: number): number
```

**Fórmula:** `totalInterest = monthlyPayment * years * 12 - principal`

**Criterios de aceptación:**
- `calculateTotalInterest(100000, 590.49, 20)` ≈ `41717.60` (tolerancia ±1)
- Siempre ≥ 0

---

### 2.4 Escenario 1 — Cuota Mínima (Plazo Extendido)

```js
findScenarioMinQuota(
  principal: number,
  annualRate: number,
  minPaymentUYU: number,
  exchangeRate: number,
  minYears: number,
  maxYears: number
): ScenarioResult | null
```

**Lógica:**
1. Convertir `minPaymentUYU` a USD: `maxAffordableUSD = minPaymentUYU / exchangeRate`
2. Iterar desde `maxYears` hacia abajo hasta `minYears`
3. Para cada año calcular `calculateMonthlyPayment(principal, annualRate, year)`
4. Retornar el mayor plazo `year` donde la cuota ≤ `maxAffordableUSD`
5. Si ningún plazo es viable dentro del rango → retornar `null`

**Retorna:** `ScenarioResult`

---

### 2.5 Escenario 2 — Cuota Máxima (Plazo Mínimo)

```js
findScenarioMaxQuota(
  principal: number,
  annualRate: number,
  maxPaymentUYU: number,
  exchangeRate: number,
  minYears: number,
  maxYears: number
): ScenarioResult | null
```

**Lógica:**
1. Convertir `maxPaymentUYU` a USD: `maxAffordableUSD = maxPaymentUYU / exchangeRate`
2. Iterar desde `minYears` hacia arriba hasta `maxYears`
3. Retornar el menor plazo donde la cuota ≤ `maxAffordableUSD`
4. Si ningún plazo es viable → retornar `null`

---

### 2.6 Escenario 3 — Óptimo (Eficiencia Financiera)

```js
findOptimalScenario(
  principal: number,
  annualRate: number,
  minPaymentUYU: number,
  maxPaymentUYU: number,
  exchangeRate: number,
  minYears: number,
  maxYears: number
): ScenarioResult | null
```

**Lógica:**
1. Calcular plazo objetivo: `targetYears = minYears + Math.floor((maxYears - minYears) / 3)`
2. Calcular la cuota necesaria para ese plazo: `requiredPaymentUSD = calculateMonthlyPayment(principal, annualRate, targetYears)`
3. Convertir a UYU: `requiredPaymentUYU = requiredPaymentUSD * exchangeRate`
4. Si `requiredPaymentUYU` está dentro de `[minPaymentUYU, maxPaymentUYU]` → usar ese plazo
5. Si `requiredPaymentUYU < minPaymentUYU` → incrementar el plazo hacia `maxYears` hasta que la cuota sea ≥ `minPaymentUYU` (sin exceder `maxPaymentUYU`)
6. Si `requiredPaymentUYU > maxPaymentUYU` → degradar al escenario 2 (usar `findScenarioMaxQuota`)
7. Si ningún escenario es posible → retornar `null`

---

### 2.7 Tipo `ScenarioResult`

```js
{
  years: number,            // Plazo en años
  monthlyPaymentUSD: number,  // Cuota en USD
  monthlyPaymentUYU: number,  // Cuota en UYU
  totalInterestUSD: number,   // Total intereses en USD
  totalInterestUYU: number,   // Total intereses en UYU
  totalPaymentUSD: number,    // Principal + intereses en USD
  totalPaymentUYU: number     // Principal + intereses en UYU
}
```

---

### 2.8 Generación de datos para gráfica

```js
generateChartData(
  principal: number,
  annualRates: number[],
  minYears: number,
  maxYears: number,
  exchangeRate: number
): ChartData
```

- Para cada tasa en `annualRates` y cada año en `[minYears..maxYears]`, calcula la cuota en UYU.
- Retorna `{ labels: number[], datasets: Dataset[] }` compatible con Chart.js.

---

## 3. Módulo de API (`js/api.js`)

### 3.1 Obtención de cotización

```js
fetchExchangeRate(): Promise<number | null>
```
- Endpoint: `https://open.er-api.com/v6/latest/USD`
- Extrae el campo `rates.UYU`
- Si la petición falla o el campo no existe → retorna `null`
- Timeout implícito vía `AbortController` a 5 segundos

### 3.2 Formateo de moneda

```js
formatUYU(amount: number): string   // Ej: "$ 25.430,50"
formatUSD(amount: number): string   // Ej: "US$ 1.234,56"
```
- Separador de miles: `.`
- Separador decimal: `,`
- 2 decimales

---

## 4. Interfaz de Usuario (`index.html`, `js/app.js`)

### 4.1 Inputs requeridos (RF-01)
| Campo | Tipo | Validación |
|---|---|---|
| Precio de la propiedad (USD) | number | > 0 |
| Cotización del dólar (UYU) | number | > 0, editable si API falla |
| Aporte inicial (USD) | number | ≥ 0 y < precio propiedad |
| Tasa de interés anual (%) | number | ≥ 0, default 3.75 |
| Plazo mínimo (años) | number | ≥ 1 |
| Plazo máximo (años) | number | > plazo mínimo, ≤ 40 |
| Cuota mínima mensual (UYU) | number | > 0 |
| Cuota máxima mensual (UYU) | number | > cuota mínima |

### 4.2 Outputs
- **Resumen General:** Precio casa, aporte, préstamo en USD y UYU
- **Tarjeta Escenario 1 (azul):** Plazo, cuota USD/UYU, intereses, total
- **Tarjeta Escenario 2 (verde):** Plazo, cuota USD/UYU, intereses, total
- **Tarjeta Escenario 3 (naranja):** Plazo, cuota USD/UYU, intereses, total
- **Gráfica Chart.js:** Líneas de cuota (UYU) vs años, una por cada tasa

### 4.3 Comportamiento
- Al cargar la página: intentar obtener cotización automáticamente
- Cotización: mostrar indicador de carga, luego el valor o habilitarla para edición manual
- Validaciones en tiempo real (input events)
- El botón "Calcular" queda deshabilitado si hay errores de validación

---

## 5. Criterios de Aceptación Globales

| ID | Criterio |
|---|---|
| CA-01 | Con P=100000 USD, tasa=3.75% TNA, plazo=20 años → cuota ≈ US$ 592.89 |
| CA-02 | El escenario de cuota mínima siempre tiene plazo ≥ escenario óptimo ≥ escenario máxima |
| CA-03 | Total intereses escenario 1 > escenario 3 > escenario 2 |
| CA-04 | Si la cuota mínima no alcanza para pagar el préstamo en maxYears, se muestra un error descriptivo |
| CA-05 | La cotización se muestra automáticamente y es editable en caso de fallo de API |
| CA-06 | La página es responsive (mobile ≥ 320px) |
| CA-07 | `npm test` pasa sin errores |
