# Especificación de Requerimiento: Simulador de Créditos Hipotecarios (Uruguay)

## 1. Resumen Ejecutivo
Crear una aplicación web interactiva de simulación de créditos hipotecarios adaptada al mercado financiero de Uruguay. El sistema permitirá calcular y optimizar escenarios de préstamo en base a variables de entrada del usuario (precio del inmueble, aporte inicial, plazos, capacidad de pago en pesos uruguayos y tasa de interés), integrando la cotización oficial del dólar del día y generando un análisis comparativo con tres escenarios financieros clave, acompañado de una representación gráfica.

---

## 2. Requerimientos Funcionales (RF)

### RF-01: Entradas del Sistema (Inputs)
El usuario deberá ingresar y configurar los siguientes parámetros en la interfaz:
1. **Precio de la propiedad ($USD$):** Valor total de la casa en dólares estadounidenses.
2. **Cotización del Dólar:** El sistema deberá consultar y obtener automáticamente la cotización del dólar del día (tipo de cambio en Uruguay, ej. compra/venta interbancaria o BROU), permitiendo opcionalmente su edición manual si la API no está disponible.
3. **Aporte Inicial ($USD$):** Monto en dólares que el comprador aporta como 
4. **Tasa de Interés Anual (Efectiva/Nominal según aplique):** Campo numérico editable con un valor por defecto de $3.75\%$.
5. **Rango de Plazos (Años):** 
   - Valor mínimo de años permitidos.
   - Valor máximo de años permitidos.
6. **Capacidad de Pago Mensual ($UYU$):** 
   - Cuota mínima mensual que el usuario está dispuesto a pagar (en pesos uruguayos).
   - Cuota máxima mensual que el usuario puede pagar (en pesos uruguayos).

---

### RF-02: Cálculos Base y Conversiones
1. **Préstamo Solicitado ($USD$):** 
   $$\text{Préstamo Solicitado} = \text{Precio de la Propiedad} - \text{Aporte Inicial}$$
2. **Conversión a Pesos Uruguayos ($UYU$):** 
   El sistema deberá convertir los valores monetarios en dólares a pesos uruguayos utilizando la cotización del dólar obtenida para el cálculo de cuotas, ya que las cuotas en el mercado hipotecario uruguayo suelen expresarse o pagarse en moneda nacional o UI/pesos según corresponda, cumpliendo con la restricción de que la cuota esté expresada en pesos.

---

### RF-03: Generación de Escenarios de Préstamo (Outputs)
El sistema deberá procesar la información y retornar un **Resumen General del Préstamo** (Valor de la casa, aporte inicial y préstamo solicitado en USD y UYU) junto con tres escenarios optimizados:

1. **Escenario de Cuota Mínima (Plazo Extendido):**
   - Utiliza el valor de la cuota mínima ingresada por el usuario.
   - Calcula el plazo máximo necesario (dentro del rango permitido) para cumplir con dicha cuota.
   - Muestra el valor total de los intereses a pagar.

2. **Escenario de Cuota Máxima (Plazo Mínimo):**
   - Utiliza el valor de la cuota máxima ingresada por el usuario.
   - Calcula el menor tiempo de pago posible (dentro del rango permitido).
   - Muestra el valor total de los intereses a pagar (el cual será significativamente menor).

3. **Escenario Óptimo (Eficiencia Financiera):**
   - Encuentra un punto de equilibrio inteligente entre el valor mínimo y máximo de cuota establecido por el usuario.
   - Su objetivo es **minimizar la cantidad total de intereses pagados**, respetando los límites de presupuesto mensual del usuario.

---

### RF-04: Representación Gráfica
- **Gráfica Interactiva:** Incluir un gráfico (ej. Chart.js o similar) que relacione el **Valor de la Cuota** en función de los **Años** y la **Tasa de Interés**, permitiendo visualizar de forma visual el impacto del plazo sobre la cuota mensual.

---

## 3. Requerimientos No Funcionales (RNF)
- **Localización:** Formato de moneda adaptado para Uruguay ($U\$S$ para dólares y $\$UYU$ o $\$$ para pesos uruguayos).
- **Usabilidad:** Interfaz limpia, responsiva y validaciones en tiempo real para evitar que el aporte inicial supere el valor de la casa o que los rangos de años/cuotas sean incoherentes.
- **Conectividad:** Integración con una API pública de cotización de moneda en Uruguay (ej. BCU o cotizaciones libres de plaza).