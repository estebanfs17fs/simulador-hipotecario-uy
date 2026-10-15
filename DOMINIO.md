# Dominio propio y email

Plan para publicar el sitio en **compracasasuy.com** con el correo **info@compracasasuy.com**, al menor costo posible.

## Costo

| Qué | Dónde | Costo |
|---|---|---|
| Dominio `compracasasuy.com` | Cloudflare Registrar (precio de costo, sin recargo en la renovación) | ~US$ 10,50 por año |
| Hosting | GitHub Pages (como hoy) con HTTPS gratis | US$ 0 |
| Recibir mail en `info@` | Cloudflare Email Routing, reenvía a tu Gmail | US$ 0 |
| Responder como `info@` (opcional) | Gmail "Enviar como" + SMTP gratis de Brevo (300 mails/día) | US$ 0 |
| **Total** | | **~US$ 10,50 por año** |

Alternativas descartadas por precio: `.uy` cuesta ~US$ 25 por año en NIC Uruguay (y bastante más en revendedores, OVH cobra ~US$ 64) y pide cédula y domicilio en Uruguay; `.com.uy` (ANTEL) también sale más que un `.com`. Cloudflare no vende `.uy`, así que para ese caso habría que usar otro proveedor de DNS.

## Pasos

### 1. Comprar el dominio (ya hecho)
1. Crear una cuenta gratis en <https://dash.cloudflare.com>.
2. **Domain Registration → Register Domains**, buscar `compracasasuy.com` y comprarlo (pide tarjeta).
3. El dominio queda con el DNS ya en Cloudflare.

Si el dominio se compró en otro lado, igual se puede usar Cloudflare gratis: **Add a site** → `compracasasuy.com` → plan Free, y en el panel de donde se compró cambiar los nameservers por los dos que da Cloudflare. Desde ahí siguen los mismos pasos.

### 2. Apuntarlo a GitHub Pages
En Cloudflare, **DNS → Records**, agregar (todos con el proxy **apagado**, nube gris, "DNS only"):

| Tipo | Nombre | Valor |
|---|---|---|
| A | `@` | 185.199.108.153 |
| A | `@` | 185.199.109.153 |
| A | `@` | 185.199.110.153 |
| A | `@` | 185.199.111.153 |
| CNAME | `www` | `estebanfs17fs.github.io` |

Después, en GitHub:
1. **Settings (de la cuenta) → Pages → Add a domain**, poner `compracasasuy.com` y agregar en Cloudflare el registro TXT que indica. Esto verifica el dominio y evita que otro lo use.
2. En el repo, **Settings → Pages → Custom domain**: `compracasasuy.com`, guardar.
3. Cuando aparezca el certificado (puede tardar un rato), marcar **Enforce HTTPS**.

El sitio queda en `https://compracasasuy.com`; la dirección `github.io` vieja redirige sola.

### 3. Email `info@compracasasuy.com`
1. En Cloudflare, **Email → Email Routing → Get started**. Agrega solo los registros MX y SPF.
2. **Destination addresses**: tu Gmail, y confirmar el mail de verificación.
3. **Routing rules → Create address**: `info` → tu Gmail.
4. Probar mandando un mail a `info@compracasasuy.com`.

### 4. Responder como info@ (opcional)
Email Routing solo recibe. Para que las respuestas salgan desde `info@`:
1. Crear cuenta gratis en <https://www.brevo.com>, agregar el dominio y cargar en Cloudflare los registros DNS (DKIM y verificación) que pide.
2. En Brevo, **SMTP & API** → copiar usuario y clave SMTP.
3. En Gmail, **Configuración → Cuentas → Enviar como → Agregar otra dirección**: `info@compracasasuy.com`, servidor `smtp-relay.brevo.com`, puerto 587, con el usuario y clave de Brevo.

## En el repo
- Las dos páginas muestran `info@compracasasuy.com` como contacto al pie.
- `CNAME` tiene el dominio y el workflow lo copia al sitio publicado. Con publicación por GitHub Actions lo que manda es lo configurado en **Settings → Pages**; el archivo queda como referencia.
- Si se vuelve a prender el backend de búsqueda, poner `ALLOWED_ORIGIN=https://compracasasuy.com` en su entorno (CORS).
