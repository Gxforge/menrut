// MENRUT — Seed con catálogo territorial REAL de Cuba
// 15 provincias + Isla de la Juventud (municipio especial) + municipios.
// Sin cuentas de ejemplo: la plataforma arranca limpia (decisión del propietario).
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

// Catálogo territorial de Cuba (provincia -> municipios)
const TERRITORY: Record<string, string[]> = {
  'Pinar del Río': ['Pinar del Río', 'Consolación del Sur', 'Los Palacios', 'Sandino', 'Minas de Matahambre', 'Mantua', 'Viñales', 'Guane', 'San Juan y Martínez', 'San Luis', 'La Palma'],
  'Artemisa': ['Artemisa', 'Guanajay', 'Mariel', 'Bauta', 'San Antonio de los Baños', 'Caimito', 'Alquízar', 'Güira de Melena', 'Bahía Honda', 'Candelaria', 'San Cristóbal'],
  'La Habana': ['Habana Vieja', 'Centro Habana', 'Cerro', 'Diez de Octubre', 'Arroyo Naranjo', 'Marianao', 'La Lisa', 'Playa', 'Plaza de la Revolución', 'Regla', 'Habana del Este', 'Guanabacoa', 'San Miguel del Padrón', 'Boyeros', 'Cotorro'],
  'Mayabeque': ['San José de las Lajas', 'Bejucal', 'Jaruco', 'Santa Cruz del Norte', 'Madruga', 'Nueva Paz', 'San Nicolás', 'Güines', 'Melena del Sur', 'Batabanó', 'Quivicán'],
  'Matanzas': ['Matanzas', 'Cárdenas', 'Martí', 'Colón', 'Perico', 'Jovellanos', 'Pedro Betancourt', 'Limonar', 'Unión de Reyes', 'Ciénaga de Zapata', 'Jagüey Grande', 'Calimete', 'Los Arabos'],
  'Villa Clara': ['Santa Clara', 'Camajuaní', 'Cifuentes', 'Corralillo', 'Encrucijada', 'Manicaragua', 'Placetas', 'Quemado de Güines', 'Ranchuelo', 'Remedios', 'Sagua la Grande', 'Santo Domingo', 'Caibarién'],
  'Cienfuegos': ['Cienfuegos', 'Cruces', 'Cumanayagua', 'Palmira', 'Rodas', 'Abreus', 'Aguada de Pasajeros', 'Lajas'],
  'Sancti Spíritus': ['Sancti Spíritus', 'Trinidad', 'Cabaiguán', 'Jatibonico', 'Yaguajay', 'Taguasco', 'La Sierpe', 'Fomento'],
  'Ciego de Ávila': ['Ciego de Ávila', 'Morón', 'Chambas', 'Ciro Redondo', 'Florencia', 'Majagua', 'Primero de Enero', 'Bolivia', 'Venezuela', 'Baraguá'],
  'Camagüey': ['Camagüey', 'Florida', 'Nuevitas', 'Guáimaro', 'Sibanicú', 'Santa Cruz del Sur', 'Minas', 'Esmeralda', 'Sierra de Cubitas', 'Vertientes', 'Jimaguayú', 'Najasa', 'Carlos Manuel de Céspedes'],
  'Las Tunas': ['Las Tunas', 'Puerto Padre', 'Amancio', 'Colombia', 'Jobabo', 'Majibacoa', 'Manatí', 'Jesús Menéndez'],
  'Holguín': ['Holguín', 'Banes', 'Antilla', 'Báguanos', 'Cueto', 'Frank País', 'Gibara', 'Rafael Freyre', 'Sagua de Tánamo', 'Mayarí', 'Moa', 'Calixto García', 'Urbano Noris', 'Cacocum'],
  'Granma': ['Bayamo', 'Manzanillo', 'Jiguaní', 'Pilón', 'Niquero', 'Media Luna', 'Campechuela', 'Yara', 'Río Cauto', 'Cauto Cristo', 'Buey Arriba', 'Guisa', 'Bartolomé Masó'],
  'Santiago de Cuba': ['Santiago de Cuba', 'Palma Soriano', 'Contramaestre', 'San Luis', 'Songo-La Maya', 'Mella', 'Segundo Frente', 'Guamá', 'Tercer Frente'],
  'Guantánamo': ['Guantánamo', 'Baracoa', 'Maisí', 'Imías', 'San Antonio del Sur', 'Caimanera', 'Niceto Pérez', 'El Salvador', 'Manuel Tames', 'Yateras'],
  'Isla de la Juventud': ['Isla de la Juventud'],
}

async function main() {
  console.log('🇨🇺 Sembrando catálogo territorial de Cuba…')

  // Territorios
  let provinceOrder = 0
  for (const [provName, muns] of Object.entries(TERRITORY)) {
    const province = await db.province.upsert({
      where: { code: provName.toLowerCase().replace(/[^a-z]+/g, '-') },
      update: { name: provName, sortOrder: provinceOrder },
      create: {
        code: provName.toLowerCase().replace(/[^a-z]+/g, '-'),
        name: provName,
        sortOrder: provinceOrder,
      },
    })
    for (const munName of muns) {
      await db.municipality.upsert({
        where: { provinceId_name: { provinceId: province.id, name: munName } },
        update: {},
        create: { provinceId: province.id, name: munName },
      })
    }
    provinceOrder++
  }
  const munCount = await db.municipality.count()
  console.log(`   ✓ ${provinceOrder} provincias, ${munCount} municipios`)

  // Helpers de municipios/provincias
  const mun = async (provinceName: string, munName: string) => {
    const p = await db.province.findUnique({ where: { code: provinceName.toLowerCase().replace(/[^a-z]+/g, '-') } })
    if (!p) throw new Error(`Provincia no encontrada: ${provinceName}`)
    return db.municipality.findUnique({ where: { provinceId_name: { provinceId: p.id, name: munName } } })
  }
  const prov = async (provinceName: string) => {
    const p = await db.province.findUnique({ where: { code: provinceName.toLowerCase().replace(/[^a-z]+/g, '-') } })
    if (!p) throw new Error(`Provincia no encontrada: ${provinceName}`)
    return p
  }

  // Planes — matriz aprobada por el propietario (2026-11-09): 12 planes activos
  // + prueba gratuita. Créditos de permanencia = días × 10 (10 créditos = 24h).
  const plans = [
    { code: 'prueba', name: 'Prueba gratuita', description: '7 días para conocer la plataforma. Se ofrece una sola vez por cuenta.', durationDays: 7, priceCup: 0, permanenceCredits: 70, toolCredits: 0, isTrial: true, isProposal: false, sortOrder: 0 },
    { code: 'basic-1m', name: 'Básico 1 mes', description: 'Pasaporte visible 30 días y 100 créditos de herramientas.', durationDays: 30, priceCup: 1500, permanenceCredits: 300, toolCredits: 100, isTrial: false, isProposal: false, sortOrder: 1 },
    { code: 'basic-3m', name: 'Básico 3 meses', description: 'Pasaporte visible 90 días y 100 créditos de herramientas, con descuento.', durationDays: 90, priceCup: 4200, permanenceCredits: 900, toolCredits: 100, isTrial: false, isProposal: false, sortOrder: 2 },
    { code: 'basic-6m', name: 'Básico 6 meses', description: 'Medio año de visibilidad del pasaporte y 100 créditos de herramientas.', durationDays: 180, priceCup: 7500, permanenceCredits: 1800, toolCredits: 100, isTrial: false, isProposal: false, sortOrder: 3 },
    { code: 'basic-12m', name: 'Básico 12 meses', description: 'Un año de visibilidad del pasaporte y 100 créditos de herramientas, la mejor relación costo-beneficio.', durationDays: 365, priceCup: 13500, permanenceCredits: 3650, toolCredits: 100, isTrial: false, isProposal: false, sortOrder: 4 },
    { code: 'pro-1m', name: 'Profesional 1 mes', description: 'Prioridad en resultados y 350 créditos de herramientas durante 30 días.', durationDays: 30, priceCup: 2500, permanenceCredits: 300, toolCredits: 350, isTrial: false, isProposal: false, sortOrder: 5 },
    { code: 'pro-3m', name: 'Profesional 3 meses', description: 'Prioridad en resultados y 350 créditos de herramientas durante 90 días.', durationDays: 90, priceCup: 6900, permanenceCredits: 900, toolCredits: 350, isTrial: false, isProposal: false, sortOrder: 6 },
    { code: 'pro-6m', name: 'Profesional 6 meses', description: 'Prioridad en resultados y 350 créditos de herramientas durante 180 días.', durationDays: 180, priceCup: 12000, permanenceCredits: 1800, toolCredits: 350, isTrial: false, isProposal: false, sortOrder: 7 },
    { code: 'pro-12m', name: 'Profesional 12 meses', description: 'Un año con prioridad en resultados y 350 créditos de herramientas.', durationDays: 365, priceCup: 21000, permanenceCredits: 3650, toolCredits: 350, isTrial: false, isProposal: false, sortOrder: 8 },
    { code: 'featured-1m', name: 'Destacado 1 mes', description: 'Perfil destacado en búsquedas y 700 créditos de herramientas durante 30 días.', durationDays: 30, priceCup: 4000, permanenceCredits: 300, toolCredits: 700, isTrial: false, isProposal: false, sortOrder: 9 },
    { code: 'featured-3m', name: 'Destacado 3 meses', description: 'Perfil destacado en búsquedas y 700 créditos de herramientas durante 90 días.', durationDays: 90, priceCup: 10800, permanenceCredits: 900, toolCredits: 700, isTrial: false, isProposal: false, sortOrder: 10 },
    { code: 'featured-6m', name: 'Destacado 6 meses', description: 'Medio año con perfil destacado y 700 créditos de herramientas.', durationDays: 180, priceCup: 19200, permanenceCredits: 1800, toolCredits: 700, isTrial: false, isProposal: false, sortOrder: 11 },
    { code: 'featured-12m', name: 'Destacado 12 meses', description: 'Un año con perfil destacado y 700 créditos de herramientas.', durationDays: 365, priceCup: 34800, permanenceCredits: 3650, toolCredits: 700, isTrial: false, isProposal: false, sortOrder: 12 },
  ]
  for (const p of plans) {
    await db.membershipPlan.upsert({ where: { code: p.code }, update: p, create: p })
  }
  // Planes de la matriz anterior: se desactivan (no se borran; hay membresías que los referencian).
  for (const oldCode of ['mensual', 'trimestral', 'anual']) {
    await db.membershipPlan.updateMany({ where: { code: oldCode, isActive: true }, data: { isActive: false } })
  }
  console.log('   ✓ 12 planes activos + prueba gratuita (matriz aprobada por el propietario)')

  // Herramientas (minPlanCode apunta a la nueva matriz basic/pro/featured)
  const tools = [
    { code: 'publicar-rutas', name: 'Publicar rutas', description: 'Publica y mantiene activas tus rutas en el directorio.', tag: 'GRATUITA', creditCost: 0, requiresActiveMembership: true, minPlanCode: null, blockedMessage: 'Disponible con cualquier membresía activa.', sortOrder: 0 },
    { code: 'anuncio-recorrido', name: 'Anunciar próximo recorrido', description: 'Anuncia una salida futura para que clientes de esa ruta te encuentren.', tag: 'BÁSICO', creditCost: 1, requiresActiveMembership: true, minPlanCode: 'basic-1m', blockedMessage: 'Requiere plan Básico o superior.', sortOrder: 1 },
    { code: 'estadisticas-avanzadas', name: 'Estadísticas avanzadas', description: 'Vistas, búsquedas y contactos recibidos por ruta.', tag: 'PRO', creditCost: 1, requiresActiveMembership: true, minPlanCode: 'pro-1m', blockedMessage: 'Requiere plan Profesional o superior.', sortOrder: 2 },
    { code: 'prioridad-resultados', name: 'Prioridad en resultados', description: 'Tu pasaporte aparece antes en búsquedas de tus rutas.', tag: 'PRO', creditCost: 2, requiresActiveMembership: true, minPlanCode: 'pro-3m', blockedMessage: 'Requiere plan Profesional 3 meses o superior.', sortOrder: 3 },
    { code: 'destacar-perfil', name: 'Destacar perfil', description: 'Tu pasaporte se destaca visualmente en resultados y rutas populares.', tag: 'DESTACADO', creditCost: 3, requiresActiveMembership: true, minPlanCode: 'featured-1m', blockedMessage: 'Requiere plan Destacado o superior.', sortOrder: 4 },
  ]
  for (const t of tools) {
    await db.tool.upsert({ where: { code: t.code }, update: t, create: t })
  }
  console.log('   ✓ 5 herramientas en catálogo')

  // Configuración global
  const configs = [
    { key: 'trial_days', value: '7' },
    { key: 'trial_permanence_credits', value: '70' },
    { key: 'credits_per_12h', value: '5' },
    { key: 'credits_per_24h', value: '10' },
    { key: 'renewal_mode', value: 'add' }, // permanencia acumulativa
    { key: 'tool_credits_expiry_mode', value: 'carry' }, // se conservan
    { key: 'search_radius_alternatives', value: '1' }, // municipios vecinos
    { key: 'app_slogan', value: 'Conectamos caminos.' },
    // Pago manual por Transfermóvil (decisión del propietario, 2026-11-09)
    { key: 'payment_method', value: 'Transfermóvil' },
    { key: 'payment_card', value: '9205-0699-9403-1473' },
    { key: 'payment_phone', value: '+53 52678747' },
    { key: 'payment_note', value: 'Transfiere el importe exacto por Transfermóvil a la tarjeta indicada y conserva la captura de la operación. El propietario confirma la recepción antes de activar tu plan.' },
  ]
  for (const c of configs) {
    await db.platformConfig.upsert({ where: { key: c.key }, update: { value: c.value }, create: c })
  }
  console.log('   ✓ Configuración global')

  console.log('🧹 Sin datos de ejemplo: la plataforma arranca limpia (decisión del propietario, 2026-11-10).')

  console.log('🎉 Seed completado.')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => db.$disconnect())
