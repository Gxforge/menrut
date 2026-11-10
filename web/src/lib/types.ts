// MENRUT — Tipos compartidos (contrato entre pantallas y API)
// Barril de dominios: ningún importador cambia (`@/lib/types` sigue igual).
//   · types-shared  → común: sesión, territorios, búsqueda, pasaporte, mensajes
//   · types-courier → mensajero: membresías, créditos, herramientas, dashboard
//   · types-payments→ pagos Transfermóvil: solicitud y revisión
//   · types-admin   → administración: panel, cuentas, auditoría, sistema
export * from './types-shared'
export * from './types-courier'
export * from './types-payments'
export * from './types-admin'
