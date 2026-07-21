export default function TermsOfService({ onBack }) {
  return (
    <div className="ap-overlay">
      <div className="ap-container">
        <div className="ap-topbar">
          <div className="ap-logo">
            Forja<span className="logo-accent"> · Condiciones del Servicio</span>
          </div>
          <div style={{ flex: 1 }} />
          <button className="ap-back" onClick={onBack} title="Volver">
            ← Volver
          </button>
        </div>
        <div className="ap-body">
          <article className="legal">
            <p className="legal-updated">Última actualización: 18 de junio de 2026</p>

            <h1>Condiciones del Servicio</h1>

            <p>
              Las presentes Condiciones del Servicio (en adelante, las
              "Condiciones") regulan el acceso y uso de Forja, una suite de
              aplicaciones empresariales desarrollada y operada por Nicojuri (en
              adelante, "Nicojuri", "nosotros" o "la Empresa"), disponible a
              través del dominio nicojuri.ai. Le rogamos leer detenidamente estas
              Condiciones antes de utilizar la plataforma.
            </p>

            <h2>1. Aceptación de los términos</h2>
            <p>
              Al acceder o utilizar Forja, usted acepta quedar vinculado por
              estas Condiciones, así como por cualquier política o lineamiento
              adicional que Nicojuri ponga a su disposición. Si usted utiliza la
              plataforma en representación de una organización, declara contar con
              las facultades suficientes para aceptar estas Condiciones en nombre
              de dicha organización. Si no está de acuerdo con alguna parte de
              estas Condiciones, deberá abstenerse de utilizar el servicio.
            </p>

            <h2>2. Descripción del servicio</h2>
            <p>
              Forja es una plataforma empresarial privada e interna que aloja
              diversas aplicaciones de negocio, tales como la gestión de
              comisiones, el seguimiento de proyectos y otras herramientas
              corporativas. El acceso a Forja es restringido y se otorga
              exclusivamente por invitación. Cada usuario únicamente visualiza y
              utiliza las aplicaciones que le han sido asignadas por los
              administradores de su organización.
            </p>

            <h2>3. Cuentas de usuario y acceso</h2>
            <p>
              Las cuentas de usuario en Forja son creadas y administradas por los
              administradores designados de cada organización. El acceso a la
              plataforma se realiza por invitación, y no existe un registro
              público ni autoservicio para la creación de cuentas.
            </p>
            <p>
              Usted es responsable de mantener la confidencialidad de sus
              credenciales de acceso y de todas las actividades que se realicen
              bajo su cuenta. En particular, usted se compromete a:
            </p>
            <ul>
              <li>
                Custodiar sus credenciales y no compartirlas con terceros.
              </li>
              <li>
                Notificar de inmediato a su administrador o a Nicojuri cualquier
                uso no autorizado o vulneración de seguridad de su cuenta.
              </li>
              <li>
                Utilizar la plataforma únicamente para los fines autorizados por
                su organización.
              </li>
            </ul>

            <h2>4. Uso aceptable y conductas prohibidas</h2>
            <p>
              Usted se compromete a utilizar Forja de manera lícita, responsable y
              conforme a estas Condiciones. Queda expresamente prohibido:
            </p>
            <ul>
              <li>
                Acceder o intentar acceder a aplicaciones, datos o cuentas que no
                le hayan sido expresamente asignados.
              </li>
              <li>
                Vulnerar, sortear o interferir con las medidas de seguridad o
                autenticación de la plataforma.
              </li>
              <li>
                Introducir software malicioso, virus o cualquier código destinado
                a dañar o interrumpir el servicio.
              </li>
              <li>
                Realizar actividades de ingeniería inversa, descompilación o
                extracción no autorizada de datos de la plataforma.
              </li>
              <li>
                Utilizar el servicio para fines ilícitos, fraudulentos o que
                infrinjan derechos de terceros.
              </li>
              <li>
                Sobrecargar, deteriorar o afectar el rendimiento de la
                infraestructura del servicio.
              </li>
            </ul>

            <h2>5. Funciones de inteligencia artificial</h2>
            <p>
              Forja incorpora funciones de inteligencia artificial, incluyendo el
              asistente "Forjita" y otras herramientas potenciadas por la API de
              Claude de Anthropic. Estas funciones permiten generar contenido,
              respuestas y sugerencias de manera automatizada.
            </p>
            <p>
              Usted reconoce y acepta que el contenido generado por inteligencia
              artificial puede contener imprecisiones, errores u omisiones, y que
              no debe interpretarse como asesoría profesional de carácter legal,
              financiero, contable, tributario ni de ninguna otra índole. Usted es
              el único responsable de revisar, validar y decidir sobre el uso del
              contenido generado por la IA, así como de las consecuencias derivadas
              de dicho uso. Nicojuri no garantiza la exactitud, integridad ni
              idoneidad de los resultados producidos por las funciones de
              inteligencia artificial.
            </p>

            <h2>6. Propiedad intelectual</h2>
            <p>
              Forja, incluyendo su software, código, diseño, interfaces, marcas,
              logotipos y demás elementos, es propiedad de Nicojuri o de sus
              licenciantes, y se encuentra protegido por las leyes de propiedad
              intelectual e industrial aplicables. Estas Condiciones no le
              transfieren la titularidad de ningún derecho de propiedad
              intelectual sobre la plataforma.
            </p>
            <p>
              Los datos y contenidos que usted o su organización ingresen en la
              plataforma permanecen bajo la titularidad de su organización. Usted
              otorga a Nicojuri una licencia limitada para procesar dichos
              contenidos con el único fin de prestar y operar el servicio.
            </p>

            <h2>7. Servicios de terceros</h2>
            <p>
              Forja se apoya en servicios proporcionados por terceros para su
              funcionamiento, entre ellos:
            </p>
            <ul>
              <li>
                <strong>Supabase</strong>, utilizado para la autenticación de
                usuarios y el almacenamiento de datos.
              </li>
              <li>
                <strong>Anthropic</strong>, cuya API de Claude potencia las
                funciones de inteligencia artificial de la plataforma.
              </li>
            </ul>
            <p>
              El uso de estos servicios de terceros puede estar sujeto a sus
              propios términos y políticas. Nicojuri no se responsabiliza por
              interrupciones, fallos o limitaciones atribuibles a dichos
              proveedores.
            </p>

            <h2>8. Confidencialidad de la información empresarial</h2>
            <p>
              Forja gestiona información empresarial de carácter sensible y
              confidencial. Usted se compromete a tratar como confidencial toda la
              información a la que acceda a través de la plataforma, y a no
              divulgarla, reproducirla ni utilizarla para fines distintos de
              aquellos autorizados por su organización. Esta obligación de
              confidencialidad subsistirá incluso tras la terminación de su acceso
              a la plataforma.
            </p>

            <h2>9. Disponibilidad del servicio y modificaciones</h2>
            <p>
              Nicojuri procurará mantener la plataforma disponible de forma
              continua; no obstante, no garantiza un funcionamiento ininterrumpido
              ni libre de errores. El servicio puede verse afectado por tareas de
              mantenimiento, actualizaciones, fallos técnicos o causas ajenas a
              nuestro control. Nos reservamos el derecho de modificar, suspender o
              discontinuar, total o parcialmente, cualquier aplicación o
              funcionalidad de Forja en cualquier momento.
            </p>

            <h2>10. Limitación de responsabilidad</h2>
            <p>
              En la máxima medida permitida por la legislación aplicable, Forja se
              proporciona "tal cual" y "según disponibilidad". Nicojuri no será
              responsable por daños indirectos, incidentales, especiales,
              consecuenciales o lucro cesante derivados del uso o de la
              imposibilidad de uso de la plataforma, incluyendo aquellos
              relacionados con el contenido generado por inteligencia artificial o
              con fallos atribuibles a servicios de terceros.
            </p>

            <h2>11. Indemnización</h2>
            <p>
              Usted se compromete a mantener indemne a Nicojuri, sus directores,
              empleados y colaboradores, frente a cualquier reclamación, demanda,
              pérdida, daño o gasto, incluidos honorarios razonables de abogados,
              que se deriven del incumplimiento de estas Condiciones, del uso
              indebido de la plataforma o de la infracción de derechos de terceros
              o de la normativa aplicable por parte suya.
            </p>

            <h2>12. Terminación y suspensión de cuentas</h2>
            <p>
              Nicojuri y los administradores de su organización podrán suspender o
              dar por terminado su acceso a Forja, en todo o en parte, en caso de
              incumplimiento de estas Condiciones, por razones de seguridad, o
              cuando dicho acceso deje de ser necesario. Una vez terminado el
              acceso, cesará su derecho a utilizar la plataforma, sin perjuicio de
              aquellas disposiciones que por su naturaleza deban subsistir.
            </p>

            <h2>13. Ley aplicable y jurisdicción</h2>
            <p>
              Estas Condiciones se rigen e interpretan de conformidad con las
              leyes de la República de Chile. Para todos los efectos derivados de
              estas Condiciones, las partes se someten a la jurisdicción de los
              tribunales competentes de la ciudad de Santiago de Chile,
              renunciando a cualquier otro fuero que pudiera corresponderles.
            </p>

            <h2>14. Cambios a estos términos</h2>
            <p>
              Nicojuri podrá modificar estas Condiciones en cualquier momento. Las
              modificaciones entrarán en vigor desde su publicación en la
              plataforma o desde la fecha que se indique. El uso continuado de
              Forja con posterioridad a la entrada en vigor de los cambios
              constituirá su aceptación de las Condiciones modificadas.
            </p>

            <h2>15. Contacto</h2>
            <p>
              Si tiene preguntas, comentarios o solicitudes relacionadas con estas
              Condiciones, puede contactarnos a través del correo electrónico{' '}
              <a href="mailto:contacto@nicojuri.ai">contacto@nicojuri.ai</a>.
            </p>
          </article>
        </div>
      </div>
    </div>
  )
}
