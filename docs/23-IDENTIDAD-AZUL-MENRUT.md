# Corrección visual: identidad azul MenRut

Se elimina la paleta verde de la versión React por indicación del propietario. Referencia: logotipos originales adjuntos.

- Azul marino: `#071C50` para texto y fondos de marca.
- Azul eléctrico: `#006EE6` para acciones principales.
- Cian: `#00B7F2` para acentos y movimiento.
- Naranja: `#FF9500` para detalles de contraste.
- Fondo claro: `#F7FAFF`.

Aplicado a inicio, dashboard, formularios, perfiles HTML, iconos, ilustración de rutas y manifest PWA. No se modifica la lógica de negocio. Build/typecheck, pruebas unitarias/SQLite y ocho pruebas de navegador móvil/escritorio sobre el despliegue pasan.

Despliegue: https://dc947e20.menrut.pages.dev . Captura: `reports/menrut-azul.png`.

## Logotipo original
Cabecera y pie React y cabecera/pie de perfiles HTML utilizan ahora la imagen original proporcionada por el propietario, no texto ni un símbolo recreado. `web/public/brand/menrut-logo.webp` se obtiene del PNG original recortando únicamente márgenes transparentes y reduciendo resolución con compresión WebP sin pérdida de esa imagen reducida. No hay redibujo ni generación por IA. Se conserva transparencia y proporción.

Diez pruebas de navegador sobre el despliegue pasan, incluidas comprobaciones del archivo, carga de imagen, ausencia de la imitación y uso en el pie, en escritorio y móvil. Captura: `reports/menrut-logo-original.png`. Despliegue: https://40d6e48b.menrut.pages.dev .
