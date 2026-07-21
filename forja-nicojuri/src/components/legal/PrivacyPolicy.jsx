export default function PrivacyPolicy({ onBack }) {
  return (
    <div className="ap-overlay">
      <div className="ap-container">
        <div className="ap-topbar">
          <div className="ap-logo">
            Forja<span className="logo-accent"> · Política de Privacidad</span>
          </div>
          <div style={{ flex: 1 }} />
          <button className="ap-back" onClick={onBack} title="Volver">
            ← Volver
          </button>
        </div>
        <div className="ap-body">
          <article className="legal">
            <h1>Política de Privacidad</h1>
            <p className="legal-updated">Última actualización: 18 de junio de 2026</p>

            <h2>1. Introducción</h2>
            <p>
              Forja es una suite de aplicaciones empresariales desarrollada y operada por
              Nicojuri, empresa constituida en Chile. La presente Política de Privacidad
              describe cómo recopilamos, utilizamos, almacenamos y protegemos los datos
              personales de las personas usuarias de la plataforma, disponible en el dominio
              nicojuri.ai.
            </p>
            <p>
              Esta política se ajusta a la legislación chilena vigente, en particular a la
              Ley N° 19.628 sobre Protección de la Vida Privada. Al utilizar Forja, usted
              reconoce haber leído y comprendido las prácticas descritas en este documento.
            </p>

            <h2>2. Información que recopilamos</h2>
            <p>
              Recopilamos únicamente la información necesaria para prestar nuestros servicios.
              Las cuentas de usuario son creadas y administradas por administradores de la
              organización. Los datos que tratamos incluyen:
            </p>
            <ul>
              <li>
                <strong>Datos de cuenta:</strong> dirección de correo electrónico y nombre de
                visualización (nombre con que se identifica al usuario dentro de la plataforma).
              </li>
              <li>
                <strong>Credenciales de acceso:</strong> contraseña de la cuenta, la cual se
                almacena de forma cifrada (hash) mediante nuestro proveedor de autenticación.
                Nicojuri no tiene acceso a su contraseña en texto plano.
              </li>
              <li>
                <strong>Datos de uso:</strong> información sobre las aplicaciones a las que
                accede dentro de la suite y la actividad necesaria para el funcionamiento de la
                plataforma.
              </li>
              <li>
                <strong>Contenido enviado a las funciones de inteligencia artificial:</strong>{' '}
                los textos, consultas y demás contenido que usted introduce en el asistente
                Forjita o en las herramientas de IA, los cuales son procesados para generar una
                respuesta.
              </li>
            </ul>

            <h2>3. Cómo usamos la información</h2>
            <p>Utilizamos la información recopilada para los siguientes fines:</p>
            <ul>
              <li>Autenticar su identidad y permitir el acceso seguro a su cuenta.</li>
              <li>
                Mostrarle únicamente las aplicaciones internas que le han sido asignadas (por
                ejemplo, comisiones o seguimiento de proyectos).
              </li>
              <li>
                Procesar sus consultas a través de las funciones de inteligencia artificial y
                entregarle las respuestas correspondientes.
              </li>
              <li>Operar, mantener, mejorar y dar soporte a la plataforma.</li>
              <li>Cumplir con obligaciones legales y resguardar la seguridad del servicio.</li>
            </ul>

            <h2>4. Base legal y consentimiento</h2>
            <p>
              El tratamiento de sus datos personales se fundamenta en el consentimiento que
              usted otorga al utilizar la plataforma, así como en la necesidad de ejecutar la
              relación de servicio entre Nicojuri y la organización a la que pertenece.
              Conforme a la Ley N° 19.628, el tratamiento de datos se realiza de manera lícita,
              informada y limitada a las finalidades aquí señaladas. Usted puede revocar su
              consentimiento en cualquier momento, sin perjuicio de los tratamientos que
              resulten necesarios para cumplir obligaciones legales.
            </p>

            <h2>5. Servicios de terceros</h2>
            <p>
              Para prestar nuestros servicios nos apoyamos en proveedores externos que actúan
              como encargados del tratamiento de datos:
            </p>
            <ul>
              <li>
                <strong>Supabase:</strong> utilizado para la autenticación de usuarios y como
                base de datos. Allí se almacenan los datos de cuenta y las credenciales
                cifradas.
              </li>
              <li>
                <strong>Anthropic (Claude):</strong> utilizado para las funciones de
                inteligencia artificial. El contenido que usted envía al asistente Forjita o a
                las herramientas de IA se transmite y procesa por Anthropic para generar las
                respuestas.
              </li>
            </ul>
            <p>
              Estos proveedores tratan los datos conforme a sus propias políticas y a los
              acuerdos suscritos con Nicojuri. Le recomendamos no introducir información
              sensible o confidencial innecesaria en las funciones de inteligencia artificial.
            </p>

            <h2>6. Cookies y almacenamiento local</h2>
            <p>
              Forja utiliza almacenamiento local del navegador y cookies estrictamente
              necesarias para mantener su sesión de autenticación activa y permitir el correcto
              funcionamiento de la plataforma. No utilizamos cookies con fines publicitarios ni
              de seguimiento de terceros. Si elimina estos datos de su navegador, deberá iniciar
              sesión nuevamente.
            </p>

            <h2>7. Seguridad de los datos</h2>
            <p>
              Adoptamos medidas técnicas y organizativas razonables para proteger sus datos
              personales frente a accesos no autorizados, pérdida, alteración o divulgación.
              Entre ellas se incluyen el cifrado de las contraseñas, la transmisión de datos a
              través de conexiones seguras y el control de acceso basado en los permisos
              asignados a cada usuario. No obstante, ningún sistema es completamente infalible,
              por lo que no podemos garantizar una seguridad absoluta.
            </p>

            <h2>8. Retención de datos</h2>
            <p>
              Conservamos sus datos personales mientras su cuenta permanezca activa y durante el
              tiempo necesario para cumplir con las finalidades descritas en esta política, así
              como con las obligaciones legales aplicables. Cuando un administrador elimina una
              cuenta o esta deja de ser necesaria, los datos asociados se eliminan o anonimizan
              dentro de un plazo razonable, salvo que la ley exija su conservación.
            </p>

            <h2>9. Derechos del usuario</h2>
            <p>
              De conformidad con la Ley N° 19.628 sobre Protección de la Vida Privada, usted
              tiene derecho a:
            </p>
            <ul>
              <li>
                <strong>Acceso:</strong> conocer qué datos personales suyos tratamos.
              </li>
              <li>
                <strong>Rectificación:</strong> solicitar la corrección de datos inexactos,
                erróneos o incompletos.
              </li>
              <li>
                <strong>Eliminación o cancelación:</strong> solicitar la supresión de sus datos
                cuando proceda conforme a la ley.
              </li>
              <li>
                <strong>Oposición:</strong> oponerse a determinados tratamientos en los casos
                que la ley permita.
              </li>
            </ul>
            <p>
              Para ejercer estos derechos puede contactarnos a través del correo indicado en la
              sección de contacto. Algunas solicitudes podrían requerir la intervención del
              administrador de su organización.
            </p>

            <h2>10. Menores de edad</h2>
            <p>
              Forja es una plataforma destinada a uso empresarial y profesional, dirigida a
              personas mayores de edad. No recopilamos de manera intencionada datos de menores
              de edad. Si tenemos conocimiento de que se han registrado datos de un menor sin la
              debida autorización, procederemos a su eliminación.
            </p>

            <h2>11. Cambios a esta política</h2>
            <p>
              Podemos actualizar esta Política de Privacidad para reflejar cambios en nuestras
              prácticas, en la plataforma o en la normativa aplicable. Cuando realicemos
              modificaciones relevantes, actualizaremos la fecha de última actualización y, de
              ser necesario, le informaremos por los medios disponibles. Le recomendamos revisar
              esta página periódicamente.
            </p>

            <h2>12. Contacto</h2>
            <p>
              Si tiene preguntas, comentarios o desea ejercer sus derechos respecto al
              tratamiento de sus datos personales, puede escribirnos a{' '}
              <a href="mailto:contacto@nicojuri.ai">contacto@nicojuri.ai</a>.
            </p>
          </article>
        </div>
      </div>
    </div>
  )
}
