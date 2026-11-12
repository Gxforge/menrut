import type { Metadata } from 'next'
import { PageShell, Summary, LAST_UPDATED } from '@/components/marketing/LegalShell'
import { CONTACT } from '@/components/marketing/SiteChrome'

export const metadata: Metadata = {
  title: 'Política de privacidad · MENRUT',
  description: 'Qué datos recoge MENRUT, para qué los usa, quién puede verlos y cuánto tiempo se conservan.',
  alternates: { canonical: '/privacidad/' },
}

export default function Privacidad() {
  return (
    <PageShell
      eyebrow="Legal"
      title="Política de privacidad"
      intro={`Última actualización: ${LAST_UPDATED}`}
    >
      <Summary>
        <p>MENRUT solo recoge los datos necesarios para crear tu cuenta, mostrar tu perfil de mensajero y coordinar entregas.</p>
        <p>No usamos geolocalización en vivo: el municipio lo indicas tú. No incluimos analítica ni rastreadores de terceros en la aplicación.</p>
        <p>Los documentos de verificación se guardan en un almacenamiento privado y solo los revisa el equipo de MENRUT.</p>
      </Summary>

      <h2>Qué datos recogemos</h2>
      <ul>
        <li><b>Cuenta:</b> nombre, correo electrónico y, si lo añades, teléfono y foto de perfil.</li>
        <li><b>Perfil de mensajero:</b> municipio base, cobertura, servicios, descripción, rutas que publicas y tu disponibilidad.</li>
        <li><b>Verificación:</b> si solicitas verificación, el documento de identidad que subas y la nota que la acompañe.</li>
        <li><b>Conversaciones y pedidos:</b> mensajes del chat, solicitudes de entrega y su estado.</li>
        <li><b>Opiniones y reportes:</b> las opiniones que escribes (120 caracteres como máximo) y los reportes de abuso.</li>
        <li><b>Planes y pagos:</b> el plan elegido, la solicitud de pago y el comprobante que subas. Solo mostramos los últimos dígitos de la tarjeta, si la indicas.</li>
        <li><b>Datos técnicos:</b> los necesarios para mantener la sesión iniciada y para la seguridad del servicio.</li>
      </ul>

      <h2>Ubicación</h2>
      <p>MENRUT no pide tu ubicación del dispositivo ni la rastrea.</p>
      <ul>
        <li><b>Clientes:</b> eliges manualmente el municipio de origen y de destino en la búsqueda.</li>
        <li><b>Mensajeros:</b> declaran su municipio base y su cobertura (municipal, provincial, de zona o por rutas publicadas). Las rutas que publicas son visibles en el mapa.</li>
      </ul>

      <h2>Analítica y almacenamiento en el navegador</h2>
      <p>
        La aplicación no incluye herramientas de analítica ni de publicidad de terceros. En tu navegador se guardan
        la sesión, tus preferencias de búsqueda y algunos avisos ya mostrados, y se guarda en caché la aplicación para funcionar sin conexión.
      </p>

      <h2>Promociones y cupos de lanzamiento</h2>
      <p>
        Las promociones de lanzamiento, como los cupos gratuitos por municipio o los descuentos temporales, se registran
        con tu cuenta y su municipio base declarado. Cada promoción indica su fecha de fin en la aplicación.
      </p>

      <h2>Quién ve tus datos</h2>
      <ul>
        <li><b>Otros usuarios:</b> en el perfil público de un mensajero se ve su nombre, municipio base, cobertura, servicios, rutas publicadas, valoración y estado de verificación. No se muestran correo ni teléfono.</li>
        <li><b>Equipo de MENRUT:</b> el personal autorizado puede ver los datos necesarios para verificar cuentas, revisar pagos y atender reportes.</li>
        <li><b>Servicios técnicos:</b> algunos servicios de terceros que la aplicación necesita para funcionar, como el alojamiento y el envío de correos de cuenta.</li>
      </ul>
      <p>No vendemos tus datos ni los cedemos a terceros con fines publicitarios.</p>

      <h2>Conservación</h2>
      <ul>
        <li>Los datos de tu cuenta se conservan mientras la cuenta exista.</li>
        <li>Puedes eliminar tu cuenta desde la aplicación. Al hacerlo se borran tus datos personales y tu perfil público; las cuentas de personal no se pueden eliminar desde la aplicación.</li>
        <li>Los códigos de confirmación de entrega caducan, y el servidor guarda solo su huella (hash), no el código en claro.</li>
      </ul>

      <h2>Tus derechos</h2>
      <p>
        Puedes consultar y corregir tus datos desde tu perfil, y pedir su eliminación desde la aplicación. Para cualquier duda sobre
        tus datos, escribe a <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>.
      </p>

      <h2>Cambios en esta política</h2>
      <p>Si cambiamos esta política, actualizaremos la fecha de la parte superior de esta página.</p>
    </PageShell>
  )
}
