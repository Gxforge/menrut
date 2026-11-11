# 01 · Pantallas, navegación y diseño

La app es **una sola ruta** (`/`). `AppRouter.tsx` cambia de pantalla según `screen` en el store (`lib/store.ts`). Por eso no hay URLs por pantalla: solo `/` y los parámetros que la pantalla de inicio lee (por ejemplo `?admin`).

Hay **35 pantallas** (`AppRouter.tsx`): 17 públicas o de cliente, 9 de mensajero y 9 de administración. Las pantallas grandes tienen una carpeta `…Pieces/` con sus subcomponentes (el límite del proyecto es de 300 líneas por archivo).

## 1. Pantallas públicas y de cliente (17)
> Nota: el archivo `ClientProfileScreen` y `BusinessProfileScreen` son las pantallas de perfil; la misma clave `screen` puede mostrar variantes según el rol.
| Clave (`screen`) | Archivo | Qué hace |
|---|---|---|
| `splash` | `public/SplashScreen.tsx` | Logo ORIGINAL. Tras ~1,7 s avanza: con sesión, a su pantalla; sin sesión, al inicio. **Con `?admin` sin sesión, va a inicio de sesión.** |
| `login` | `public/LoginScreen.tsx` | Inicio de sesión con Supabase. Redirige según el rol. |
| `register` | `public/RegisterScreen.tsx` | Registro de cuentas (3 tipos: cliente, negocio, mensajero). |
| `recovery` | `public/RecoveryScreen.tsx` | Recuperación de contraseña por correo. |
| `welcome` | `public/WelcomeScreen.tsx` | Bienvenida y onboarding. |
| `complete-profile` | `public/CompleteProfileScreen.tsx` | Completar perfil profesional (mensajero) y verificación de identidad. |
| `home` | `public/HomeScreen.tsx` | Inicio: buscador de rutas. Es la pantalla principal del cliente. |
| `filters` | `public/FiltersScreen.tsx` | Búsqueda avanzada y filtros. |
| `results` | `public/ResultsScreen.tsx` | Resultados de mensajeros para una ruta. |
| `passport` | `public/PassportScreen.tsx` | Pasaporte público del mensajero: datos, cobertura, rutas, reseñas. Incluye referencias a OTP de entrega y reseñas. |
| `map` | `public/MapScreen.tsx` | Mapa de rutas por red o por zonas. |
| `saved` | `public/SavedScreen.tsx` | Rutas guardadas y mensajeros favoritos. |
| `inbox` | `public/InboxScreen.tsx` | Bandeja de mensajes. |
| `chat` | `public/ChatScreen.tsx` | Conversación 1 a 1 (HTTP, sin websocket en producción). |
| `notifications` | `public/NotificationsScreen.tsx` | Notificaciones. |
| `client-profile` | `public/ClientProfileScreen.tsx` | Perfil del cliente: cuenta, actividad, privacidad, soporte y cierre de sesión. |
| `business-profile` | `public/BusinessProfileScreen.tsx` | Variante de perfil para negocios. |
| `privacy` | `public/PrivacyScreen.tsx` | Privacidad, términos y borrado de cuenta. |

## 2. Pantallas de mensajero (9)
| Clave | Archivo | Qué hace |
|---|---|---|
| `courier-home` | `courier/CourierHomeScreen.tsx` | «Mi espacio»: dashboard con visibilidad, métricas y accesos rápidos. |
| `courier-routes` | `courier/CourierRoutesScreen.tsx` | Gestión de rutas propias. |
| `route-form` | `courier/RouteFormScreen.tsx` | Publicar o editar ruta en tres pasos (territorio, detalles, servicio). |
| `reputation` | `courier/ReputationScreen.tsx` | Valoraciones y opiniones. Permite responder cada reseña. |
| `membership` | `courier/MembershipScreen.tsx` | Estado de la membresía y permanencia. Historial de pagos. |
| `plan-options` | `courier/PlanOptionsScreen.tsx` | Matriz de planes: 3 niveles × 4 duraciones. |
| `tools` | `courier/ToolsScreen.tsx` | Créditos y herramientas: reservar, confirmar o liberar. |
| `courier-deliveries` | `courier/CourierDeliveriesScreen.tsx` | Entregas verificadas: el mensajero valida el código OTP del cliente. |
| `settings` | `courier/SettingsScreen.tsx` | Ajustes: pasaporte, seguridad, ayuda, Términos, Privacidad, **tarjeta «Creado por Studio Lexair»** (nueva). |

Diálogos de mensajero: `courier/PaymentInstructionsDialog.tsx` (instrucciones de Transfermóvil y subida de captura).

## 3. Pantallas de administración (9)
Solo para `owner`, `admin` y `moderator`. El frontend solo oculta o muestra; **el permiso lo comprueba el backend** contra las listas de correos del entorno.

| Clave | Archivo | Qué hace |
|---|---|---|
| `admin-home` | `admin/AdminHomeScreen.tsx` | Inicio del panel con métricas reales. |
| `admin-couriers` | `admin/AdminCouriersScreen.tsx` | Mensajeros y aprobación o rechazo de verificaciones. |
| `admin-businesses` | `admin/AdminBusinessesScreen.tsx` | Clientes y negocios (consulta). |
| `admin-payments` | `admin/AdminPaymentsScreen.tsx` | Pagos y comprobantes de Transfermóvil: revisar, aprobar con monto o rechazar. |
| `admin-tools` | `admin/AdminToolsScreen.tsx` | Planes y herramientas (editar precios y reglas). |
| `admin-moderation` | `admin/AdminModerationScreen.tsx` | Reseñas y denuncias: ocultar, restaurar, resolver. Historial de auditoría. |
| `admin-settings` | `admin/AdminSettingsScreen.tsx` | Configuración general de la plataforma. |
| `admin-system` | `admin/AdminSystemScreen.tsx` | Estado del sistema y bitácora de reconciliación. |
| `admin-databases` | `admin/AdminDatabasesScreen.tsx` | Visor en vivo de las 10 bases D1. |

## 4. Flujo de navegación
- **Inicio → cliente:** Splash → Inicio → Resultados (o Filtros) → Pasaporte → Chat, Guardados o Mapa.
- **Mensajero:** Splash → Mi espacio → Rutas (→ formulario), Reputación, Membresía (→ Planes → instrucciones de pago), Herramientas, Entregas, Ajustes.
- **Staff:** Splash o inicio de sesión → Panel (`admin-home`) → las 9 secciones de la barra de staff. El enlace `?admin` lleva a iniciar sesión; el permiso lo decide el backend.
- **Barra inferior** (`core/BottomNav.tsx`): cliente: Inicio, Rutas, Guardados, Mensajes, Perfil. Mensajero: Mi espacio, Mis rutas, Reputación y accesos de mensajero. Staff: Inicio, Mensajeros, Cuentas, Pagos, Planes/Herram., Moderación, Config, Base de datos y Sistema (9 secciones).

## 5. Sistema de diseño (verificado en código)
- **Paleta azul** (no negociable; la verde fue rechazada por el propietario; no usar índigo):
  - navy `#0B2B60` · deep `#071D43` · azul primario `#1688F5` · cian `#00C2FF`
  - naranja `#FF9C38` (alertas suaves) · éxito `#1BA979` · peligro `#E45C67`
  - fondo `#F3F8FF` · texto `#102447`
- **Tipografía:** Manrope para títulos (`font-display`) y la fuente base del sistema para el texto.
- **Formas:** tarjetas `rounded-2xl`, botones redondeados. Nada en mayúsculas sostenidas.
- **Iconos:** `lucide-react`. **Prohibido** usar emoji como icono.
- **Marca:** logo original en `web/public/brand/` (WebP derivado del PNG del propietario). No redibujar ni imitar el logo con texto.
- **Pie de marca:** «MENRUT · Conectamos caminos.» Crédito del estudio: tarjeta «Creado por Studio Lexair · Desarrollo digital», que enlaza a `studiolexair.ddns.net` (en Ajustes del mensajero, en «Acerca de»).
- **Estados obligatorios:** carga, vacío y error en toda pantalla con datos. Sello de verificación **solo** si `is_verified === true`.
- **Textos:** en español. Microcopia fija (por ejemplo: «Todavía no encontramos mensajeros para este trayecto. Prueba con un municipio cercano.»).
- **Objetivos táctiles** de al menos 44 px. Diseño de 360 × 800, marco máximo de 430 px.
- **Sin datos inventados:** toda cifra dinámica viene de la API. No se simulan porcentajes, GPS ni garantías.

## 6. Componentes compartidos (`core/`)
`TopBar`, `BottomNav`, `Brand` (`MenrutMark`), `Rating`, `StatusBadge`, `EmptyState`, `CourierCard`, `RouteCard`, `PwaSetup` (aviso «Instalar app», con instrucciones para iOS).

## 7. Cambios de esta sesión (para que se vean en el registro)
1. **Tarjeta «Creado por Studio Lexair»** en Ajustes → Acerca de (`courier/SettingsScreenPieces/MenuSections.tsx`).
2. **Enlace directo al panel `?admin`** (`public/SplashScreen.tsx`): sin sesión lleva a inicio de sesión. Con sesión de staff, al panel. Probado en navegador: sin errores de consola.
