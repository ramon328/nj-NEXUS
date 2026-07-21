/**
 * Contenido legal de los Términos y Condiciones de GoAuto.
 * Espejo del documento publicado en https://goauto.cl/terminos-y-condiciones
 * (`landing-goauto/src/pages/TermsPage.tsx`).
 */
export function TermsContent() {
  return (
    <div className="space-y-8 text-sm leading-relaxed text-muted-foreground">
      <p className="text-xs text-muted-foreground/80">Última actualización: 13 de mayo de 2026</p>

      <Section title="Introducción">
        <p>
          El presente documento regula el acceso y uso de GOAUTO, una plataforma B2B destinada a la gestión integral
          de automotoras (concesionarias) y sus operaciones comerciales. Constituye un acuerdo legalmente vinculante
          entre PLATAFORMAS DIGITALES GOAUTO SpA y la automotora que utiliza nuestros servicios. Nuestra plataforma
          permite llevar control de vehículos, leads, reservas y otras gestiones en un único sistema.
        </p>
        <p>
          Al registrarse o utilizar la plataforma, el Usuario declara haber leído, comprendido y aceptado en su
          totalidad estos Términos y Condiciones y la Política de Privacidad, obligándose a cumplirlos. Las cláusulas
          se basan en las mejores prácticas de la industria y se ajustan a la Ley chilena N° 19.628 sobre protección
          de la vida privada. La aceptación se realiza en línea mediante un mecanismo de confirmación, cuya marca
          temporal (fecha, dirección IP y versión aceptada) se registra a efectos probatorios.
        </p>
      </Section>

      <Section title="1. Definiciones">
        <ul className="space-y-3 list-disc list-outside ml-5">
          <li><Term name="GOAUTO" /> plataforma ERP provista por PLATAFORMAS DIGITALES GOAUTO SpA que permite gestionar vehículos, leads y reservas de automotoras.</li>
          <li><Term name="Usuario" /> persona natural o jurídica que, en representación de una automotora, accede a la plataforma y utiliza los servicios de GOAUTO.</li>
          <li><Term name="Automotora" /> concesionario o vendedor profesional de vehículos que contrata los servicios de GOAUTO.</li>
          <li><Term name="Servicios" /> funcionalidades disponibles en GOAUTO, tales como gestión de inventario, agenda de citas, control de leads, generación de reportes y herramientas de integración.</li>
        </ul>
      </Section>

      <Section title="2. Aceptación de los términos">
        <p>
          El acceso a la plataforma y la creación de una cuenta implican la aceptación expresa, libre e informada de
          estos T&amp;C y de la Política de Privacidad. La aceptación constituye la manifestación de voluntad de
          vincularse contractualmente con GOAUTO. En caso de que el Usuario no acepte las condiciones, deberá
          abstenerse de acceder o utilizar los servicios.
        </p>
      </Section>

      <Section title="3. Objeto del servicio">
        <p>
          GOAUTO otorga a la automotora una licencia de uso limitada, no exclusiva, intransferible y revocable para
          acceder a la plataforma y utilizar las funcionalidades disponibles con el único fin de gestionar su negocio.
          Los servicios están destinados a visibilizar la oferta de vehículos y facilitar el contacto con clientes. La
          automotora es responsable de efectuar las configuraciones necesarias (correo electrónico, datos de contacto,
          herramientas de integración) para recibir y procesar la información. GOAUTO ofrece herramientas para
          recopilar y organizar leads, reportar tiempos de respuesta y generar informes agregados; no garantiza el
          número de ventas, cotizaciones ni el éxito de las campañas. Nos reservamos el derecho de modificar,
          actualizar o interrumpir temporalmente funcionalidades de la plataforma para mejorar el servicio o por
          razones técnicas, sin que ello genere indemnización alguna.
        </p>
      </Section>

      <Section title="4. Obligaciones de las automotoras y usuarios">
        <ol className="space-y-4 list-decimal list-outside ml-5">
          <li><Term name="Proporcionar información veraz y actualizada:" /> la automotora se obliga a publicar y mantener datos exactos de cada vehículo (marca, modelo, año, patente, kilometraje, estado, etc.) y de cualquier otro bien o servicio ofrecido. Asimismo, se compromete a mantener las publicaciones actualizadas y a retirar de inmediato los avisos correspondientes a vehículos vendidos o no disponibles. Si se detectan datos falsos, erróneos o que vulneren derechos de terceros, GOAUTO podrá suspender o eliminar la publicación y exigir las responsabilidades que correspondan.</li>
          <li><Term name="Uso adecuado de la plataforma:" /> queda estrictamente prohibido cargar, distribuir o transmitir material que sea ilegal, obsceno, injurioso, fraudulento, difamatorio o que atente contra la imagen de terceros, derechos de propiedad intelectual o normativa vigente. GOAUTO eliminará cualquier contenido que infrinja estas normas o el buen uso de la plataforma y se reserva el derecho de suspender la cuenta del infractor.</li>
          <li><Term name="Titularidad y licencias sobre el contenido:" /> la automotora garantiza que es titular de todos los derechos sobre los datos, imágenes y demás material que carga en la plataforma o que cuenta con las licencias y autorizaciones necesarias. Al publicar contenido, concede a GOAUTO una licencia gratuita, mundial y por el tiempo de duración del contrato para reproducirlo y exhibirlo únicamente con el propósito de prestar los servicios. GOAUTO podrá eliminar cualquier contenido que infrinja estos T&amp;C o los derechos de terceros.</li>
          <li><Term name="Confidencialidad de credenciales y acceso:" /> el Usuario se obliga a mantener en secreto sus credenciales (nombre de usuario, contraseña, tokens de acceso) y a no compartirlas con terceros. Toda actividad realizada desde su cuenta se considerará realizada por el Usuario; por lo tanto, responderá por los perjuicios que deriven de su uso indebido o negligente.</li>
        </ol>
      </Section>

      <Section title="5. Uso de información y confidencialidad">
        <ol className="space-y-4 list-decimal list-outside ml-5">
          <li><Term name="Propiedad de la información y confidencialidad:" /> toda la información de vehículos, leads y clientes cargada por cada automotora es de su propiedad exclusiva. GOAUTO actuará como encargado del tratamiento y utilizará los datos únicamente para prestar, mantener y mejorar el servicio, conforme a la legislación y a la presente política. Se prohíbe expresamente transferir, ceder o comunicar información entre automotoras o utilizarla con fines no autorizados. Sólo se publicarán datos que la automotora decida hacer públicos (por ejemplo, anuncios de vehículos). El acceso y uso de la información por parte de GOAUTO no se entenderá como cesión de derechos sobre la misma.</li>
          <li><Term name="Estadísticas y análisis:" /> la plataforma recopila datos estadísticos sobre tiempos de respuesta y comportamiento de leads para mostrar a la automotora su eficiencia y compararla con promedios nacionales o regionales. Estas estadísticas se generan a partir de datos anónimos y agregados, de modo que ninguna automotora pueda identificar la información de otra.</li>
          <li><Term name="Comunicaciones comerciales:" /> previa autorización del Usuario, GOAUTO podrá enviar comunicaciones comerciales o promocionales relativas a productos o servicios propios. El Usuario puede en cualquier momento revocar este consentimiento a través de los mecanismos de cancelación que se incluyan en cada comunicación.</li>
        </ol>
      </Section>

      <Section title="6. Política de pagos y morosidad">
        <p>
          Los servicios de GOAUTO se proporcionan mediante planes de suscripción o tarifas por servicio definidas en
          la oferta comercial vigente. El Usuario se obliga a pagar puntualmente los importes facturados, incluidos
          los impuestos aplicables, por los medios y en los plazos establecidos. En caso de morosidad o
          incumplimiento en los pagos, GOAUTO podrá suspender, restringir o eliminar el acceso a la plataforma. La
          suspensión por mora no libera a la automotora de la obligación de pagar los saldos adeudados, así como los
          recargos o intereses que procedan. GOAUTO se reserva el derecho de modificar sus tarifas previa notificación
          y de contratar a terceros para la gestión de cobro.
        </p>
      </Section>

      <Section title="7. Limitación de responsabilidad">
        <ol className="space-y-4 list-decimal list-outside ml-5">
          <li><Term name="Exclusión de garantías y resultados:" /> GOAUTO proporciona herramientas y servicios para organizar y gestionar leads, pero no ofrece garantía alguna sobre la cantidad de ventas, cotizaciones, conversiones u otros resultados que la automotora pueda obtener. El Usuario reconoce que los resultados dependen de múltiples factores ajenos a GOAUTO.</li>
          <li><Term name="Contenidos de terceros:" /> GOAUTO no avala ni garantiza la veracidad, licitud o idoneidad de las publicaciones y contenidos generados por las automotoras o usuarios. Cada automotora asume la responsabilidad exclusiva por la exactitud de sus anuncios, negociaciones con clientes y cualquier incumplimiento legal o contractual derivado de sus publicaciones.</li>
          <li><Term name="Disponibilidad del servicio:" /> aunque se adoptan medidas razonables de seguridad y se realizan respaldos periódicos, GOAUTO no garantiza la disponibilidad ininterrumpida del servicio. La plataforma puede experimentar interrupciones temporales por mantenimiento programado, actualización del sistema o causas de fuerza mayor ajenas al control de GOAUTO. En tales casos, GOAUTO no será responsable por daños directos, indirectos, lucro cesante o pérdida de datos derivados de la indisponibilidad de la plataforma.</li>
          <li><Term name="Limitación de responsabilidad:" /> en todo caso, la responsabilidad total de GOAUTO derivada del uso de la plataforma se limitará al monto efectivamente pagado por la automotora en los seis meses inmediatamente anteriores al hecho que origine la reclamación. GOAUTO no será responsable por pérdidas o accesos no autorizados que resulten de causas externas, fallas de terceros o ataques informáticos, siempre que haya implementado medidas de seguridad razonables.</li>
          <li><Term name="Fuerza mayor:" /> GOAUTO quedará exento de responsabilidad en caso de retrasos o incumplimientos debidos a acontecimientos que escapen a su control razonable, como incendios, terremotos, inundaciones, pandemias, actos de autoridades gubernamentales, cortes de energía o ataques cibernéticos.</li>
        </ol>
      </Section>

      <Section title="8. Propiedad intelectual">
        <p>
          Todo el software, códigos fuente, algoritmos, bases de datos, diseños, contenidos, marcas, logotipos,
          nombres comerciales y demás elementos que integran la plataforma GOAUTO son propiedad exclusiva de
          PLATAFORMAS DIGITALES GOAUTO SpA o de sus respectivos licenciantes y están protegidos por las leyes de
          propiedad intelectual y por tratados internacionales. Se concede al Usuario únicamente una licencia de uso
          limitada para su gestión interna, sin que ello implique la cesión de derechos sobre dichos elementos. Queda
          estrictamente prohibido copiar, reproducir, modificar, descompilar, realizar ingeniería inversa, distribuir
          o explotar comercialmente la plataforma o cualquiera de sus componentes sin autorización expresa y por
          escrito de GOAUTO.
        </p>
      </Section>

      <Section title="9. Indemnidad">
        <p>
          El Usuario se obliga a mantener indemne y a defender a GOAUTO, sus sociedades relacionadas, directores,
          ejecutivos, empleados y colaboradores frente a cualquier reclamo, demanda, acción judicial, sanción o
          pérdida (incluyendo honorarios de abogados y costas judiciales) que se derive del uso indebido de la
          plataforma, de la vulneración de estos T&amp;C o de la infracción de derechos de terceros. Esta obligación
          subsistirá aun después de la terminación de la relación contractual.
        </p>
      </Section>

      <Section title="10. Suspensión y terminación">
        <p>
          GOAUTO podrá, a su sola discreción, suspender temporalmente o terminar de forma definitiva el acceso a la
          plataforma en caso de incumplimiento de estos T&amp;C, morosidad en el pago de suscripciones, uso fraudulento
          o cualquier conducta que afecte negativamente a otros usuarios o a la reputación de GOAUTO. Asimismo, GOAUTO
          podrá resolver anticipadamente el contrato sin expresión de causa, previa notificación por escrito con la
          antelación razonable establecida en la ley. La automotora podrá dar término al contrato en cualquier momento
          dejando de utilizar la plataforma y comunicando su decisión; sin embargo, subsistirán las obligaciones
          relativas a pagos pendientes, indemnizaciones y a la confidencialidad de la información. La terminación del
          servicio, por cualquier causa, no generará derecho a reembolso ni indemnización alguna.
        </p>
      </Section>

      <Section title="11. Modificaciones de los T&C">
        <p>
          GOAUTO podrá modificar estos T&amp;C en cualquier momento. Se notificará por correo electrónico al Usuario
          registrado y se publicará la versión actualizada con al menos cinco días de antelación. El uso continuado
          de la plataforma después de la entrada en vigor de las modificaciones implicará la aceptación de los nuevos
          términos.
        </p>
      </Section>

      <Section title="12. Ley aplicable y resolución de conflictos">
        <p>
          Estos T&amp;C se rigen por las leyes de la República de Chile y, en particular, por las normas de protección
          al consumidor y de protección de datos personales. Cualquier controversia se someterá a los tribunales
          competentes de Santiago, salvo que las partes acuerden someterse a arbitraje conforme a la normativa
          vigente. Nada en este acuerdo limita el derecho del Usuario a recurrir al Servicio Nacional del Consumidor
          (SERNAC).
        </p>
      </Section>

      <Section title="13. Disposiciones generales">
        <ol className="space-y-4 list-decimal list-outside ml-5">
          <li><Term name="Divisibilidad:" /> si alguna disposición de estos T&amp;C se declara nula, inválida o inaplicable por un tribunal competente, dicha disposición se entenderá modificada sólo en lo estrictamente necesario para que sea válida y exigible, y las demás disposiciones mantendrán su plena vigencia.</li>
          <li><Term name="No renuncia:" /> la falta de ejercicio o el retraso en el ejercicio de un derecho por parte de GOAUTO no constituye renuncia al mismo. La renuncia a exigir el cumplimiento de alguna disposición deberá constar por escrito y firmada por representante autorizado.</li>
          <li><Term name="Cesión:" /> la automotora no podrá ceder ni transferir los derechos u obligaciones derivados de estos T&amp;C sin el consentimiento previo y por escrito de GOAUTO. GOAUTO podrá ceder total o parcialmente este contrato, sin necesidad de autorización del Usuario, a cualquier sociedad vinculada, sucesora o adquirente de la plataforma.</li>
        </ol>
      </Section>

      <p className="border-t pt-4 text-xs">
        ¿Dudas? Escríbenos a{' '}
        <a href="mailto:soporte@goauto.cl" className="text-primary underline">soporte@goauto.cl</a>.
      </p>
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
