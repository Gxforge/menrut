import type { Metadata } from 'next'
import { PageShell, Summary, LAST_UPDATED } from '@/components/marketing/LegalShell'
import { CONTACT } from '@/components/marketing/SiteChrome'

export const metadata: Metadata = {
  title: 'Términos de uso · MENRUT',
  description: 'Condiciones de uso de MENRUT: qué hace la plataforma, responsabilidades de clientes y mensajeros, planes y opiniones.',
  alternates: { canonical: '/terminos/' },
}

export default function Terminos() {
  return (
    <PageShell
      eyebrow="Legal"
      title="Términos de uso"
      intro={`Última actualización: ${LAST_UPDATED}`}
    >
      <Summary>
        <p>MENRUT conecta a clientes con mensajeros independientes. No es el transportista ni garantiza cada entrega.</p>
        <p>Para contactar o contratar necesitas una cuenta. Buscar y ver mensajeros no la requiere.</p>
        <p>Las opiniones deben ser veraces y respetuosas. Puedes reportar abusos.</p>
      </Summary>

      <h2>1. Qué es MENRUT</h2>
      <p>
        MENRUT es una plataforma que ayuda a encontrar mensajeros por municipio, provincia o ruta, y a coordinar la recogida y
        la entrega. Los acuerdos de servicio se cierran entre el cliente y el mensajero.
      </p>

      <h2>2. Cuentas</h2>
      <ul>
        <li>Debes dar datos verdaderos y mantenerlos actualizados.</li>
        <li>Eres responsable de la actividad que se haga con tu cuenta. No la compartas.</li>
        <li>Puedes eliminar tu cuenta desde la aplicación escribiendo la confirmación indicada. Las cuentas de personal no se eliminan desde la aplicación.</li>
      </ul>

      <h2>3. Mensajeros</h2>
      <ul>
        <li>Declaras tu municipio base y tu cobertura, y solo publicas rutas que puedas cumplir.</li>
        <li>La verificación de identidad la revisa el equipo de MENRUT. Un perfil verificado no es una garantía de la entrega.</li>
        <li>Eres responsable de tus servicios, de tus precios y de los objetos que transportas.</li>
      </ul>

      <h2>4. Clientes</h2>
      <ul>
        <li>Describe el pedido con exactitud y no envíes artículos prohibidos por la ley.</li>
        <li>Confirma la entrega solo cuando el paquete esté en tu poder, con el código que te indique la aplicación.</li>
      </ul>

      <h2>5. Confirmación de entregas</h2>
      <p>
        Cada entrega se confirma con un código de 6 dígitos. El código caduca y tiene un número máximo de intentos.
        No compartas el código antes de recibir el pedido.
      </p>

      <h2>6. Opiniones y reportes</h2>
      <ul>
        <li>Solo puedes opinar sobre un mensajero una vez, en 120 caracteres como máximo.</li>
        <li>Prohibimos insultos, datos personales de terceros y contenido falso o engañoso.</li>
        <li>MENRUT puede ocultar o eliminar opiniones que incumplan estas reglas.</li>
      </ul>

      <h2>7. Planes, pagos y promociones</h2>
      <ul>
        <li>Algunas funciones dependen de un plan. Los precios y las condiciones se muestran en la aplicación antes de pagar.</li>
        <li>Los pagos se registran con un comprobante que el equipo de MENRUT revisa antes de activar el plan.</li>
        <li>Las promociones de lanzamiento, como los cupos gratuitos o los descuentos temporales, tienen las condiciones y la fecha de fin que se indican en la aplicación.</li>
      </ul>

      <h2>8. Limitación de responsabilidad</h2>
      <p>
        MENRUT se ofrece tal como está. No respondemos por retrasos, pérdidas, daños ni incumplimientos de los acuerdos entre
        clientes y mensajeros, en la medida permitida por la ley.
      </p>

      <h2>9. Suspensión</h2>
      <p>Podemos limitar o suspender cuentas que incumplan estos términos o que hagan un uso indebido del servicio.</p>

      <h2>10. Cambios y contacto</h2>
      <p>
        Podemos actualizar estos términos. La fecha de la parte superior indica la última revisión. Para cualquier consulta:
        {' '}<a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>.
      </p>
    </PageShell>
  )
}
