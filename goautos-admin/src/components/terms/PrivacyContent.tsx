/**
 * Contenido legal de la Política de Privacidad de GoAuto.
 * Espejo del documento publicado en https://goauto.cl/politica-de-privacidad
 * (`landing-goauto/src/pages/PrivacyPage.tsx`).
 */
export function PrivacyContent() {
  return (
    <div className="space-y-8 text-sm leading-relaxed text-muted-foreground">
      <p className="text-xs text-muted-foreground/80">Última actualización: 13 de mayo de 2026</p>

      <Section title="1. Aspectos generales">
        <p>
          PLATAFORMAS DIGITALES GOAUTO SpA, con domicilio en la República de Chile, actúa como responsable del
          tratamiento de los datos personales recopilados a través de su plataforma. GOAUTO se compromete a proteger
          la privacidad de los usuarios y a cumplir estrictamente la Ley N° 19.628 sobre Protección de la Vida Privada
          y demás normativa aplicable. La legislación chilena establece que el tratamiento de datos personales debe
          respetar los derechos fundamentales de los titulares y sólo puede efectuarse para finalidades permitidas. En
          virtud de ello, se recabará el consentimiento previo, expreso e informado del titular para aquellas
          actividades de tratamiento que así lo requieran, pudiendo el titular revocar dicho consentimiento en
          cualquier momento.
        </p>
      </Section>

      <Section title="2. Datos que recopilamos">
        <ol className="space-y-4 list-decimal list-outside ml-5">
          <li><Term name="Datos de la automotora y sus usuarios:" /> nombre o razón social, RUT, dirección, números de teléfono, correos electrónicos, nombre y RUT de representantes legales o vendedores y otra información necesaria para brindar el servicio.</li>
          <li><Term name="Datos de clientes y leads:" /> cuando la automotora registra leads o clientes potenciales en GOAUTO, se almacenan los datos que esta provee (nombre, teléfono, correo electrónico, intereses, historial de contacto, reservas, etc.). Estos datos se tratan como información confidencial de la automotora.</li>
          <li><Term name="Datos de uso del sitio:" /> recopilamos información sobre el uso que hace del sistema, como las páginas a las que accede, su dirección IP, tipo de navegador y horarios de acceso. Esto incluye información sobre las interacciones de los usuarios con los leads (tiempo de respuesta, conversiones, etc.) para generar estadísticas agregadas.</li>
          <li><Term name="Información de cookies y tecnologías similares:" /> utilizamos cookies y web beacons para mejorar la experiencia del usuario y elaborar estadísticas de uso. Las cookies permiten reconocer a los usuarios registrados y elaborar estadísticas colectivas. Puede configurar su navegador para bloquear cookies, aunque esto podría afectar algunas funcionalidades.</li>
        </ol>
      </Section>

      <Section title="3. Finalidad del tratamiento de datos">
        <ol className="space-y-4 list-decimal list-outside ml-5">
          <li><Term name="Prestación del servicio:" /> los datos personales se utilizan para comunicar a la automotora los leads generados, procesar órdenes, facilitar transacciones y mejorar la gestión del negocio. GOAUTO también utiliza la información para adaptar la plataforma a las preferencias de cada automotora.</li>
          <li><Term name="Mejora y análisis:" /> se analizan datos estadísticos, de forma anonimizada y agregada, para evaluar el rendimiento de la plataforma y proporcionar reportes comparativos. Este análisis jamás permite identificar a una automotora a partir de los datos de otra.</li>
          <li><Term name="Comunicaciones:" /> podemos enviar correos electrónicos con información o promociones sobre productos y servicios de GOAUTO. El usuario puede aceptar o rechazar estas comunicaciones y revocar su consentimiento en cualquier momento.</li>
        </ol>
      </Section>

      <Section title="4. Confidencialidad y no cesión de información entre automotoras">
        <p>Los datos de cada automotora son confidenciales y se protegen especialmente. Incluyen, entre otros:</p>
        <ul className="space-y-2 list-disc list-outside ml-5">
          <li><Term name="Bases de datos internas y de clientes:" /> registros administrativos, agendas, listas de leads y cualquier otra información derivada de su operación comercial.</li>
          <li><Term name="Información personal de clientes y leads:" /> nombres, apellidos, números de teléfono, correos electrónicos, identificadores, historial de contacto y cualquier dato identificable de personas naturales.</li>
          <li><Term name="Información de vehículos:" /> marcas, modelos, años, patentes, kilometraje, estado, fichas técnicas y cualquier descripción de los vehículos.</li>
          <li><Term name="Costos y precios de compra y venta:" /> valores de adquisición, gastos asociados y precios de venta de los vehículos.</li>
          <li><Term name="Indicadores y KPIs de la empresa:" /> métricas de eficiencia, tiempos de respuesta, tasas de conversión, objetivos de ventas y otros indicadores utilizados para medir el rendimiento.</li>
          <li><Term name="Fotografías e imágenes de vehículos:" /> fotos, videos y demás material audiovisual subido a la plataforma.</li>
          <li><Term name="Descripciones y contenidos asociados a los vehículos y servicios:" /> textos, especificaciones y comentarios que describen los vehículos o servicios.</li>
          <li>Cualquier otra información que la automotora gestione a través de GOAUTO.</li>
        </ul>
        <p className="pt-2">
          GOAUTO se compromete a utilizar estos datos únicamente para prestar y mejorar el servicio y no los
          compartirá con otras automotoras ni los usará con fines competitivos o negativos. Sólo se compartirán datos
          cuando exista autorización expresa del titular, sea necesario para prestar un servicio externalizado, o lo
          exija la ley o una autoridad competente. No cedemos ni vendemos datos personales de clientes o leads.
        </p>
      </Section>

      <Section title="5. Conservación y supresión de datos">
        <p>
          Conservamos los datos personales mientras exista una relación contractual con la automotora y durante los
          plazos necesarios para cumplir obligaciones legales o atender posibles responsabilidades. La automotora o el
          titular pueden solicitar la eliminación de sus datos; en ese caso se procederá a su supresión, salvo que la
          ley exija conservarlos. GOAUTO no manipula ni almacena datos financieros; las transacciones se realizan
          mediante proveedores certificados y se utilizan protocolos de cifrado SSL.
        </p>
      </Section>

      <Section title="6. Derechos de los titulares de datos">
        <p>Toda persona puede ejercer los derechos que la ley le reconoce:</p>
        <ul className="space-y-2 list-disc list-outside ml-5">
          <li><Term name="Acceso:" /> conocer qué datos personales se mantienen sobre ella.</li>
          <li><Term name="Rectificación:" /> solicitar la corrección de datos inexactos.</li>
          <li><Term name="Cancelación o supresión:" /> pedir que se eliminen los datos cuando ya no sean necesarios.</li>
          <li><Term name="Oposición:" /> oponerse al tratamiento de sus datos por motivos legítimos.</li>
          <li><Term name="Limitación y portabilidad:" /> limitar el tratamiento o solicitar la portabilidad de sus datos.</li>
        </ul>
        <p className="pt-2">
          Las solicitudes deben enviarse a nuestro correo de soporte. Para proteger la privacidad, se requerirá
          verificar la identidad del solicitante antes de conceder estos derechos.
        </p>
      </Section>

      <Section title="7. Medidas de seguridad">
        <p>
          GOAUTO adopta medidas técnicas y organizativas para proteger los datos personales. Siguiendo las mejores
          prácticas, se utilizan cifrado SSL para la transmisión de datos, bases de datos encriptadas y respaldos
          periódicos; se limita el acceso a personal autorizado y se aplica la técnica de disociación (anonimización)
          cuando se generan estadísticas. Se reconoce que las medidas de seguridad en Internet no son infalibles, pero
          se realizan esfuerzos razonables para evitar accesos no autorizados, pérdida o uso indebido de la
          información.
        </p>
      </Section>

      <Section title="8. Menores de edad">
        <p>
          La plataforma está dirigida a personas mayores de 18 años. Nuestro servicio no está diseñado ni se dirige a
          menores de edad; por lo tanto, no recopilamos deliberadamente información de menores.
        </p>
      </Section>

      <Section title="9. Modificaciones a la política de privacidad">
        <p>
          GOAUTO se reserva el derecho de modificar esta política de privacidad. Cualquier cambio será informado a las
          automotoras mediante correo electrónico y entrará en vigor a partir de su publicación. La simple utilización
          de la plataforma después del cambio implicará la aceptación de la nueva política.
        </p>
      </Section>

      <Section title="10. Contacto">
        <p>
          Para cualquier consulta o ejercicio de derechos, puede comunicarse con nuestro responsable de privacidad al
          correo electrónico{' '}
          <a href="mailto:privacidad@goauto.cl" className="text-primary underline">privacidad@goauto.cl</a>{' '}
          o a la dirección física que figure en nuestro sitio web. Si una persona considera que sus datos han sido
          vulnerados, tiene derecho a presentar reclamos ante el Servicio Nacional del Consumidor (SERNAC) o ante los
          tribunales ordinarios.
        </p>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-3 border-b pb-2 text-base font-semibold text-foreground">{title}</h3>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Term({ name }: { name: string }) {
  return <span className="font-semibold text-foreground">{name}</span>;
}
