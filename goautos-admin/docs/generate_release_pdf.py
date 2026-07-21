#!/usr/bin/env python3
"""Generate release notes PDF for Joaquin - March 19, 2026 updates."""

from fpdf import FPDF
import os

class ReleasePDF(FPDF):
    def header(self):
        self.set_font('Helvetica', 'B', 10)
        self.set_text_color(100, 100, 100)
        self.cell(0, 8, 'GoAuto - Notas de Actualización', align='R', new_x="LMARGIN", new_y="NEXT")
        self.set_draw_color(59, 130, 246)
        self.set_line_width(0.5)
        self.line(10, self.get_y(), 200, self.get_y())
        self.ln(4)

    def footer(self):
        self.set_y(-15)
        self.set_font('Helvetica', '', 8)
        self.set_text_color(150, 150, 150)
        self.cell(0, 10, f'Página {self.page_no()}/{{nb}}', align='C')

    def section_title(self, num, title):
        self.ln(4)
        self.set_font('Helvetica', 'B', 14)
        self.set_text_color(30, 41, 59)
        self.cell(0, 10, f'{num}. {title}', new_x="LMARGIN", new_y="NEXT")
        self.set_draw_color(59, 130, 246)
        self.set_line_width(0.3)
        self.line(10, self.get_y(), 80, self.get_y())
        self.ln(3)

    def sub_title(self, text):
        self.set_font('Helvetica', 'B', 11)
        self.set_text_color(71, 85, 105)
        self.cell(0, 7, text, new_x="LMARGIN", new_y="NEXT")
        self.ln(1)

    def body_text(self, text):
        self.set_font('Helvetica', '', 10)
        self.set_text_color(51, 65, 85)
        self.multi_cell(0, 5.5, text)
        self.ln(2)

    def bullet(self, text, indent=15):
        x = self.get_x()
        self.set_font('Helvetica', '', 10)
        self.set_text_color(51, 65, 85)
        self.set_x(indent)
        self.cell(5, 5.5, '-')
        self.multi_cell(0, 5.5, text)
        self.ln(1)

    def how_to_verify(self, steps):
        self.set_fill_color(241, 245, 249)
        self.set_font('Helvetica', 'B', 9)
        self.set_text_color(71, 85, 105)
        y_start = self.get_y()
        self.set_x(12)
        self.cell(186, 7, '  Como verificarlo', new_x="LMARGIN", new_y="NEXT", fill=True)
        self.set_font('Helvetica', '', 9)
        self.set_text_color(71, 85, 105)
        for i, step in enumerate(steps, 1):
            self.set_x(15)
            self.multi_cell(180, 5, f'{i}. {step}', fill=True)
        self.ln(3)

    def activation_box(self, title, sql):
        self.set_fill_color(254, 243, 199)
        self.set_draw_color(234, 179, 8)
        self.set_line_width(0.3)
        self.set_font('Helvetica', 'B', 9)
        self.set_text_color(133, 77, 14)
        self.set_x(12)
        self.cell(186, 7, f'  (!) {title}', new_x="LMARGIN", new_y="NEXT", fill=True, border=1)
        self.set_font('Courier', '', 8)
        self.set_text_color(133, 77, 14)
        for line in sql.strip().split('\n'):
            self.set_x(12)
            self.cell(186, 4.5, f'  {line}', new_x="LMARGIN", new_y="NEXT", fill=True, border='LR')
        self.set_x(12)
        self.cell(186, 0.5, '', new_x="LMARGIN", new_y="NEXT", border='LRB', fill=True)
        self.ln(3)


def generate():
    pdf = ReleasePDF()
    pdf.alias_nb_pages()
    pdf.set_auto_page_break(auto=True, margin=20)
    pdf.add_page()

    # Title
    pdf.set_font('Helvetica', 'B', 22)
    pdf.set_text_color(15, 23, 42)
    pdf.cell(0, 12, 'Actualización GoAuto', new_x="LMARGIN", new_y="NEXT")
    pdf.set_font('Helvetica', '', 12)
    pdf.set_text_color(100, 116, 139)
    pdf.cell(0, 8, '19 de Marzo, 2026', new_x="LMARGIN", new_y="NEXT")
    pdf.ln(4)

    pdf.body_text(
        'Este documento detalla todas las mejoras implementadas en la plataforma GoAuto. '
        'A continuación se describe cada funcionalidad, cómo verificarla y los pasos '
        'necesarios para activarla.'
    )

    # ─── 1. Métricas Comerciales ───
    pdf.section_title(1, 'Resumen Comercial en Dashboard')
    pdf.body_text(
        'Se agregó una nueva tarjeta en la pestaña "Comercial" del dashboard que muestra '
        'las métricas comerciales de los vehículos vendidos en el período seleccionado.'
    )
    pdf.sub_title('Que muestra')
    pdf.bullet('Vendido: Total de ingresos por ventas del período.')
    pdf.bullet('Costó: Costo total (adquisición + gastos adicionales + comisiones).')
    pdf.bullet('Margen: La diferencia entre lo vendido y lo que costó, con porcentaje.')
    pdf.bullet('Promedio por vehículo: Venta promedio, costo promedio y margen promedio por unidad.')
    pdf.bullet('Desglose de costos: Cuando hay gastos adicionales o comisiones, se desglosan por separado.')

    pdf.sub_title('Permisos')
    pdf.body_text(
        'Esta tarjeta tiene su propio permiso llamado "Resumen Comercial". '
        'Los administradores la ven por defecto. Para que un vendedor la vea, '
        'deben habilitarla en Configuración > Equipo > [Rol] > Dashboard.'
    )

    pdf.how_to_verify([
        'Ir al Dashboard > pestaña "Comercial".',
        'Debajo de los 4 KPIs principales, aparece la tarjeta "Resumen Comercial".',
        'Cambiar el rango de fechas para ver cómo cambian los números.',
        'Si no aparece, verificar que el permiso esté habilitado en Configuración > Equipo.',
    ])

    # ─── 2. Documentación Obligatoria ───
    pdf.section_title(2, 'Documentación Obligatoria Configurable')
    pdf.body_text(
        'Cada automotora puede elegir qué documentos son obligatorios al agregar un vehículo. '
        'Los 4 campos configurables son: Revisión Técnica, Permiso de Circulación, SOAP y '
        'Permiso Municipal.'
    )
    pdf.sub_title('Como configurarlo')
    pdf.bullet('Ir a Configuración > Vehículos > pestaña "Documentación".')
    pdf.bullet('Activar el toggle de cada documento que se quiera hacer obligatorio.')
    pdf.bullet('El cambio es inmediato: al agregar o editar un vehículo, esos campos aparecerán con asterisco rojo (*) y no se podrá guardar sin completarlos.')

    pdf.body_text(
        'Por defecto todos los campos son opcionales, igual que antes. '
        'No cambia nada hasta que se active manualmente.'
    )

    pdf.how_to_verify([
        'Ir a Configuración > Vehículos > pestaña "Documentación".',
        'Activar por ejemplo "Revisión Técnica".',
        'Ir a agregar un vehículo nuevo.',
        'En la sección "Documentación", el campo "Venc. Revisión Técnica" ahora tiene asterisco rojo.',
        'Intentar guardar sin completarlo: aparecerá un error indicando que falta.',
    ])

    # ─── 3. Tareas: Ver descripción ───
    pdf.section_title(3, 'Descripción Visible en Tarjetas de Tareas')
    pdf.body_text(
        'Antes, las tarjetas de tareas en el tablero Kanban solo mostraban el título. '
        'Para ver la descripción había que hacer click y abrir el detalle. '
        'Ahora la descripción se muestra directamente en la tarjeta (máximo 2 líneas), '
        'tanto en desktop como en celular.'
    )

    pdf.how_to_verify([
        'Ir a la página "Tareas".',
        'Crear una tarea con título y descripción.',
        'Verificar que la descripción aparece debajo del título en la tarjeta, sin necesidad de abrirla.',
    ])

    # ─── 4. Workflow de Aprobación ───
    pdf.section_title(4, 'Aprobación de Tareas Operativas')
    pdf.body_text(
        'Las tareas ahora tienen un flujo de aprobación para tareas operativas '
        '(las que NO están vinculadas a un vehículo de la plataforma).'
    )
    pdf.sub_title('Como funciona')
    pdf.bullet('Tarea vinculada a un vehículo (ej: "Subir documentos del Toyota Corolla"): cualquier usuario puede completarla directamente.')
    pdf.bullet('Tarea operativa sin vehículo (ej: "Instalar cuadro en el baño"): cuando un vendedor la marca como completada, pasa a la columna "Por Aprobar" en vez de "Completada".')
    pdf.bullet('El administrador recibe una notificación y puede aprobarla (moverla a "Completada") o rechazarla.')
    pdf.bullet('Los usuarios con permiso "Gestionar Tareas" pueden completar cualquier tarea directamente.')

    pdf.body_text(
        'En el tablero Kanban aparece una nueva columna color violeta llamada "Por Aprobar" '
        'entre "En Progreso" y "Completadas".'
    )

    pdf.how_to_verify([
        'Crear una tarea SIN vehículo vinculado (operativa).',
        'Con un usuario vendedor, intentar moverla a "Completada".',
        'Verificar que se mueve a "Por Aprobar" en vez de "Completada".',
        'Con un usuario administrador, moverla de "Por Aprobar" a "Completada".',
    ])

    # ─── 5. Excel con Estado ───
    pdf.section_title(5, 'Excel de Vehículos con Columna de Estado')
    pdf.body_text(
        'La exportación de vehículos a Excel ahora incluye TODOS los vehículos '
        '(disponibles, vendidos y archivados) con su columna de estado visible.'
    )
    pdf.body_text(
        'Antes solo se exportaban los vehículos en stock. Ahora se exportan todos, '
        'permitiendo ver el estado de cada uno (Publicado, Vendido, Revisión Mecánica, etc.).'
    )

    pdf.how_to_verify([
        'Ir a la página "Vehículos".',
        'Hacer click en el botón de exportar Excel.',
        'Abrir el archivo descargado.',
        'Verificar que aparece la columna "Estado" y que incluye vehículos vendidos.',
    ])

    # ─── 6. Notificación Vehículo Publicado ───
    pdf.section_title(6, 'Notificación al Publicar un Vehículo')
    pdf.body_text(
        'Se agregó una notificación automática cuando un vehículo cambia al estado "Publicado". '
        'Todos los usuarios del equipo reciben una notificación in-app y push con el detalle '
        'del vehículo publicado.'
    )

    pdf.how_to_verify([
        'Cambiar el estado de un vehículo a "Publicado".',
        'Verificar que aparece una notificación en la campana de notificaciones.',
        'La notificación dice "Vehículo publicado" con la marca, modelo y año.',
    ])

    # Save
    output_path = os.path.join(os.path.dirname(__file__), 'Actualizacion_GoAuto_19-03-2026.pdf')
    pdf.output(output_path)
    print(f'PDF generado: {output_path}')

if __name__ == '__main__':
    generate()
