"""Genera la guía funcional de Rendo beta a partir de recorridos verificados en código.

La guía describe affordances de la interfaz; no sustituye pruebas end-to-end
con cuentas reales en el despliegue beta.
"""

from pathlib import Path
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    HRFlowable,
    KeepTogether,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


OUT = Path(__file__).with_name("Rendo - Guia funcional beta.pdf")
BLUE = colors.HexColor("#131F3C")
DEEP = colors.HexColor("#0B1428")
GOLD = colors.HexColor("#B89355")
INK = colors.HexColor("#26334B")
MUTED = colors.HexColor("#667085")
PAPER = colors.HexColor("#F7F5F0")
LINE = colors.HexColor("#DDD7C9")

FONT_DIR = Path("C:/Windows/Fonts")
pdfmetrics.registerFont(TTFont("Rendo", str(FONT_DIR / "segoeui.ttf")))
pdfmetrics.registerFont(TTFont("Rendo-Bold", str(FONT_DIR / "segoeuib.ttf")))
pdfmetrics.registerFontFamily("Rendo", normal="Rendo", bold="Rendo-Bold")

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name="CoverKicker", fontName="Rendo-Bold", fontSize=10, leading=14, textColor=GOLD, spaceAfter=13))
styles.add(ParagraphStyle(name="CoverTitle", fontName="Rendo-Bold", fontSize=31, leading=36, textColor=BLUE, spaceAfter=12))
styles.add(ParagraphStyle(name="CoverSub", fontName="Rendo", fontSize=13, leading=19, textColor=INK, spaceAfter=18))
styles.add(ParagraphStyle(name="SectionTitleR", fontName="Rendo-Bold", fontSize=17, leading=22, textColor=BLUE, spaceBefore=15, spaceAfter=6))
styles.add(ParagraphStyle(name="SectionDescR", fontName="Rendo", fontSize=9, leading=14, textColor=MUTED, spaceAfter=12))
styles.add(ParagraphStyle(name="ActionTitleR", fontName="Rendo-Bold", fontSize=11, leading=15, textColor=BLUE, spaceBefore=10, spaceAfter=6))
styles.add(ParagraphStyle(name="LabelR", fontName="Rendo-Bold", fontSize=8, leading=11, textColor=GOLD, spaceBefore=5, spaceAfter=3))
styles.add(ParagraphStyle(name="BodyR", fontName="Rendo", fontSize=9, leading=14, textColor=INK, spaceAfter=4))
styles.add(ParagraphStyle(name="SmallR", fontName="Rendo", fontSize=8, leading=12, textColor=MUTED, spaceAfter=7))
styles.add(ParagraphStyle(name="NumR", fontName="Rendo-Bold", fontSize=8, leading=13, textColor=GOLD))


SECTIONS = [
    (
        "01  ·  Público y buscador",
        "Acciones disponibles desde la web pública. Las fichas y el contacto necesitan unidades publicadas; la base beta está vacía al momento de redactar esta guía.",
        [
            ("Explorar los alquileres", ["Abrí https://rendo-beta-web.vercel.app/es.", "Entrá en «Explorar» o en el catálogo de «Unidades».", "Recorré las tarjetas de inmuebles disponibles."], "El catálogo muestra únicamente unidades públicas. En esta beta, si no hay publicaciones, verás un estado vacío y no anuncios ficticios."),
            ("Buscar y aplicar filtros", ["Entrá en «Unidades».", "Escribí una zona o palabra clave; si corresponde, elegí categoría, zona y rango de precios.", "Pulsá «Aplicar Filtros». Para volver al listado general, usá «Limpiar»."], "La lista se actualiza con las unidades que coinciden; si no hay resultados, aparece un mensaje para ajustar la búsqueda."),
            ("Consultar una unidad", ["Desde el catálogo, abrí una tarjeta de unidad.", "Revisá descripción, imágenes, ubicación aproximada, características y tarifas visibles."], "Se abre la ficha de la unidad seleccionada. No implica una reserva ni un pago dentro de Rendo."),
            ("Contactar por WhatsApp", ["Abrí la ficha de una unidad publicada.", "Si el gestor cargó un contacto, pulsá «Contactar por WhatsApp».", "Continuá la conversación en WhatsApp."], "Se abre WhatsApp con el contacto disponible. Si la unidad no tiene contacto habilitado, la ficha indica que no está disponible."),
            ("Crear una cuenta de buscador", ["En la web, pulsá «Registrarse» y elegí el acceso de buscador/marketplace.", "Completá nombre, correo y contraseña; enviá el formulario.", "Iniciá sesión si la app no te dirige automáticamente."], "La cuenta se crea para explorar y guardar favoritos. En la beta, según la configuración informada de Supabase, no es obligatorio confirmar el email; el alta real aún necesita una prueba publicada con cuenta de prueba."),
            ("Iniciar o cerrar sesión", ["Pulsá «Iniciar sesión» e ingresá correo y contraseña.", "Para salir, abrí el menú de tu cuenta y elegí «Cerrar sesión»."], "La interfaz muestra las opciones de tu rol al entrar; al salir deja de mostrar tus datos privados."),
            ("Guardar o quitar favoritos", ["Iniciá sesión con tu cuenta de buscador.", "En una tarjeta o ficha de unidad, pulsá el botón con corazón para guardar; pulsalo otra vez para quitar.", "Abrí «Mis Favoritos» desde el menú de la cuenta para ver los guardados."], "El estado del corazón cambia y la unidad figura —o deja de figurar— en Favoritos. Requiere publicaciones reales."),
            ("Reportar una publicación", ["Iniciá sesión y abrí la ficha de una unidad publicada.", "Pulsá «Reportar», completá el motivo y enviá el reporte."], "La app confirma el envío para revisión. Reportar no elimina la unidad inmediatamente."),
            ("Cambiar idioma y apariencia", ["En la barra superior, abrí el selector de idioma para elegir Español, English o Português.", "Usá el control de tema para alternar entre claro y oscuro."], "La interfaz cambia de idioma o apariencia; los datos del inmueble no se modifican."),
            ("Consultar términos y privacidad", ["Desde la web pública, abrí «Términos» o «Privacidad» en los enlaces disponibles."], "Se muestra la información legal y de tratamiento de datos sin necesidad de iniciar sesión."),
        ],
    ),
    (
        "02  ·  Gestor",
        "Recorridos del panel operativo. Se describen controles presentes en el código; el despliegue aún no superó una prueba integral con un gestor real y datos persistidos.",
        [
            ("Activar el perfil de gestor", ["Creá una cuenta o iniciá sesión como buscador.", "Entrá en «Publicar» o en el acceso para convertirte en gestor.", "En el onboarding, pulsá «Convertirme en Gestor y Activar Cupo Beta»."], "Si el servicio acepta el cambio, se abre el Dashboard con un cupo beta gratuito de hasta 10 unidades no archivadas. El alta completa aún debe probarse con una cuenta real de prueba."),
            ("Consultar el panel principal", ["Iniciá sesión como gestor.", "Abrí «Dashboard» desde el menú lateral.", "Revisá los resúmenes y accesos directos de tu espacio."], "Se ve el estado operativo del propio espacio. Una cuenta nueva puede mostrar métricas en cero."),
            ("Crear un grupo", ["En el panel, abrí «Inventario &amp; Grupos» / «Mis Unidades».", "Pulsá «Nuevo Grupo».", "Ingresá el nombre y, si querés, una descripción; pulsá «Guardar»."], "El grupo aparece en el inventario y sirve para organizar varias unidades."),
            ("Definir una seña predeterminada para un grupo", ["Al crear el grupo, activá «Configurar Seña Predeterminada».", "Elegí porcentaje o monto fijo e ingresá un valor positivo; si es porcentaje, no puede superar el 100 %.", "Guardá el grupo."], "Al crear alquileres de unidades asociadas, podrás optar por heredar esa seña; sigue siendo opcional en cada alquiler."),
            ("Registrar una unidad", ["Entrá en «Mis Unidades» y pulsá «Nueva Unidad» o «Registrar Unidad».", "Completá los datos básicos, elegí el grupo si corresponde y configurá tarifas, fotos y ubicación.", "Pulsá «Guardar Unidad»."], "La unidad queda en tu inventario. No se debe asumir que aparece en el marketplace de inmediato: allí solo se muestran unidades publicadas."),
            ("Configurar alquiler mensual, diario o por hora de una unidad", ["Al crear o editar una unidad, entrá en «Tarifas &amp; Precios».", "Agregá la modalidad que corresponda —mes, día/noche u hora— y su precio.", "Guardá la unidad."], "La unidad conserva las tarifas configuradas para cada modalidad. No se mezclan períodos mensuales, diarios y horarios."),
            ("Cargar fotos y fijar ubicación", ["En el formulario de la unidad, abrí «Galería Fotos» y cargá las imágenes.", "En «Ubicación &amp; GPS», buscá una dirección o fijá un punto en el mapa.", "Confirmá la ubicación y guardá la unidad."], "La ficha conserva fotos y coordenadas si los servicios de almacenamiento y mapa responden correctamente."),
            ("Editar una unidad", ["En «Mis Unidades», localizá la unidad y abrí su acción de edición.", "Modificá los datos, tarifas, fotos o ubicación necesarios.", "Pulsá «Guardar Unidad»."], "Los cambios quedan asociados a esa unidad y se reflejan en el inventario; una ficha pública actualizada depende de que la unidad esté publicada."),
            ("Registrar un inquilino", ["En el menú lateral, entrá en «Inquilinos».", "Pulsá «Nuevo Inquilino» y completá nombre y datos de contacto o documento disponibles.", "Si el formulario solicita consentimiento o garante, completá esa etapa y guardá."], "El inquilino aparece en el listado y puede seleccionarse al registrar un alquiler."),
            ("Registrar un alquiler mensual", ["Abrí «Alquileres» y pulsá «Nuevo Alquiler».", "Elegí «Mensual», una unidad y un inquilino.", "Indicá fechas, monto total, opción de seña y estado del cobro inicial; guardá."], "El alquiler mensual aparece en la lista con período, monto, seña —si se eligió— y estado. El sistema debe rechazar conflictos de disponibilidad."),
            ("Registrar un alquiler diario", ["Abrí «Alquileres» y pulsá «Nuevo Alquiler».", "Elegí «Diario», unidad e inquilino.", "Seleccioná ingreso y salida, completá monto y cobro inicial; guardá."], "El alquiler se registra por fechas/días, separado de la lógica mensual. No debe aceptar fechas superpuestas de la misma unidad."),
            ("Registrar un alquiler por hora", ["Abrí «Alquileres» y pulsá «Nuevo Alquiler».", "Elegí «Por Hora», la unidad y el inquilino.", "Indicá fecha, hora de inicio y fin, monto y cobro inicial; guardá."], "El turno aparece en Alquileres y no debe superponerse con otro turno de la misma unidad."),
            ("Elegir la seña de un alquiler", ["Dentro de «Nuevo Alquiler», completá unidad y monto total.", "Elegí «Sin seña», «Heredar del grupo» —si esa unidad pertenece a un grupo con seña activa— o «Personalizada».", "Para una seña personalizada, elegí monto fijo o porcentaje y comprobá la vista previa antes de guardar."], "El alquiler guarda exactamente la elección y el importe indicado. La seña no es obligatoria y no puede superar el total."),
            ("Registrar el cobro inicial y adjuntar un contrato", ["En «Nuevo Alquiler», indicá depósito en garantía si corresponde.", "Elegí «Pendiente de Cobro», «Seña / Anticipo Cobrado» o «Cobrado Totalmente» según lo ocurrido.", "Opcionalmente, subí un contrato PDF de hasta 10 MB y guardá."], "El desglose muestra total, cobrado al iniciar, saldo y garantía; el contrato queda asociado si la carga se completa. Registrar un estado no ejecuta un cobro automático."),
            ("Consultar alquileres", ["Entrá en «Alquileres» desde el menú lateral.", "Revisá unidad, inquilino, modalidad, período, monto, seña y estado en la tabla o las tarjetas móviles."], "Aparecen los alquileres del ámbito autorizado. La vista móvil web presenta tarjetas; no es todavía una app Android nativa."),
            ("Invitar a un delegado", ["Entrá en «Equipo y Delegados».", "Pulsá «Invitar Delegado», ingresá el correo de una cuenta ya registrada en Rendo y enviá la invitación."], "La invitación queda pendiente hasta que la otra persona la acepte. En esta beta, no uses correos ajenos ni datos sensibles: la confirmación del email está desactivada."),
            ("Asignar alcance y permiso a un delegado", ["En «Equipo y Delegados», abrí «Configurar Permisos» para el colaborador.", "Elegí «Ver» o «Gestionar» y el alcance: toda la cuenta, un grupo o unidades específicas.", "Confirmá los cambios."], "El delegado solo debería ver o gestionar los elementos autorizados. Facturación, datos fiscales y administración de delegados siguen reservados al gestor titular; falta verificarlo con cuentas reales en la beta."),
            ("Revocar acceso o cancelar una invitación", ["En «Equipo y Delegados», buscá una delegación activa o invitación pendiente.", "Usá «Revocar» para quitar acceso, o «Cancelar Invitación» si aún no fue aceptada.", "Confirmá la operación."], "El colaborador deja de tener acceso o la invitación deja de poder aceptarse, según el caso."),
            ("Consultar métricas y registro de actividad", ["Como gestor titular, abrí «Métricas» o «Registro de Actividad» en el menú lateral.", "Revisá los datos del espacio y los eventos disponibles."], "Se muestran indicadores y registros asociados a tu espacio. Un espacio nuevo puede no tener eventos ni métricas de uso."),
        ],
    ),
    (
        "03  ·  Delegado",
        "El gestor define tanto el alcance como el nivel de permiso. Esta separación es parte del diseño, pero los escenarios hospedados de seguridad entre cuentas todavía requieren validación.",
        [
            ("Aceptar o rechazar una invitación", ["Iniciá sesión con la cuenta invitada.", "Abrí «Invitaciones de Colaboración» desde tu cuenta.", "Elegí «Aceptar» para colaborar o «Rechazar» para declinar."], "Si aceptás, podés entrar al espacio asignado según los permisos concedidos; si rechazás, la invitación no activa acceso."),
            ("Trabajar con permiso de solo lectura", ["Entrá al panel del gestor que te invitó.", "Abrí unidades, inquilinos o alquileres dentro de tu alcance.", "Consultá los datos sin modificar registros."], "La interfaz muestra «Modo Solo Lectura» y no debería ofrecer acciones de alta o edición. La verificación de permisos hospedados sigue pendiente."),
            ("Trabajar con permiso de gestión", ["Aceptá la invitación y entrá al panel del espacio asignado.", "Usá «Mis Unidades», «Inquilinos» o «Alquileres» según el alcance otorgado por el gestor.", "Creá o editá únicamente registros permitidos por ese alcance."], "Los cambios deben quedar limitados a cuenta, grupo o unidades autorizadas. El delegado no administra facturación, AFIP, métricas privadas ni permisos de otros delegados."),
        ],
    ),
]


def safe(text: str) -> str:
    # Preserve intentional inline emphasis/entities in authored strings.
    return escape(text).replace("&amp;amp;", "&amp;")


def page_chrome(canvas, doc):
    canvas.saveState()
    width, height = A4
    canvas.setFillColor(DEEP)
    canvas.rect(0, height - 17 * mm, width, 17 * mm, stroke=0, fill=1)
    canvas.setFillColor(GOLD)
    canvas.rect(0, height - 17 * mm, 7 * mm, 17 * mm, stroke=0, fill=1)
    canvas.setFont("Rendo-Bold", 9)
    canvas.setFillColor(colors.white)
    canvas.drawString(17 * mm, height - 10.8 * mm, "RENDO  /  GUÍA FUNCIONAL BETA")
    canvas.setStrokeColor(LINE)
    canvas.line(16 * mm, 17 * mm, width - 16 * mm, 17 * mm)
    canvas.setFont("Rendo", 8)
    canvas.setFillColor(MUTED)
    canvas.drawString(16 * mm, 11 * mm, "Web beta · 30 de septiembre de 2026")
    canvas.drawRightString(width - 16 * mm, 11 * mm, str(doc.page))
    canvas.restoreState()


def action_block(number, title, steps, expected):
    head = Table(
        [[Paragraph(f"{number:02d}", styles["NumR"]), Paragraph(safe(title), styles["ActionTitleR"])]],
        colWidths=[12 * mm, 169 * mm],
        hAlign="LEFT",
    )
    head.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 0), ("TOPPADDING", (0, 0), (-1, -1), 0), ("BOTTOMPADDING", (0, 0), (-1, -1), 0)]))
    parts = [head, Paragraph("PASO A PASO", styles["LabelR"])]
    for idx, step in enumerate(steps, 1):
        parts.append(Paragraph(f"<b>{idx}.</b> {safe(step)}", styles["BodyR"]))
    parts += [Paragraph("RESULTADO ESPERADO", styles["LabelR"]), Paragraph(safe(expected), styles["BodyR"]), Spacer(1, 3 * mm), HRFlowable(width="100%", thickness=0.6, color=LINE)]
    return KeepTogether(parts)


def build():
    doc = SimpleDocTemplate(
        str(OUT),
        pagesize=A4,
        rightMargin=16 * mm,
        leftMargin=16 * mm,
        topMargin=24 * mm,
        bottomMargin=23 * mm,
        title="Rendo — Guía funcional beta",
        author="Rendo",
        subject="Acciones, pasos y resultados esperados por rol",
    )
    story = [
        Spacer(1, 11 * mm),
        Paragraph("MANUAL DE USO  ·  VERSIÓN BETA", styles["CoverKicker"]),
        Paragraph("Todo lo que podés hacer<br/>en Rendo", styles["CoverTitle"]),
        Paragraph("Guía paso a paso por perfil: público, gestor y delegado. Cada recorrido indica el resultado que debería observarse al completar la acción.", styles["CoverSub"]),
    ]
    notice = Table([[Paragraph("ALCANCE ACTUAL", styles["LabelR"]), Paragraph("La web está publicada, pero la base beta aún no tiene unidades. Las acciones privadas se documentan a partir de los controles y flujos presentes en el proyecto; su funcionamiento completo en el entorno publicado todavía requiere pruebas con cuentas reales. No se documentan como operativas las reservas o pagos públicos, la facturación y la emisión fiscal, porque no están habilitados para esta beta.", styles["BodyR"])]], colWidths=[33 * mm, 148 * mm], hAlign="LEFT")
    notice.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), PAPER), ("BOX", (0, 0), (-1, -1), 0.7, LINE), ("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 9), ("RIGHTPADDING", (0, 0), (-1, -1), 9), ("TOPPADDING", (0, 0), (-1, -1), 8), ("BOTTOMPADDING", (0, 0), (-1, -1), 8)]))
    story += [notice, Spacer(1, 10 * mm)]
    action_number = 1
    for section_title, section_desc, actions in SECTIONS:
        story += [Paragraph(safe(section_title), styles["SectionTitleR"]), Paragraph(safe(section_desc), styles["SectionDescR"]), HRFlowable(width="100%", thickness=1.1, color=GOLD), Spacer(1, 3 * mm)]
        for title, steps, expected in actions:
            story.append(action_block(action_number, title, steps, expected))
            action_number += 1
    story += [
        Spacer(1, 7 * mm),
        Paragraph("Límites importantes de esta beta", styles["SectionTitleR"]),
        Paragraph("• El marketplace solo muestra unidades publicadas; guardar una unidad no garantiza publicación inmediata.<br/>• Contactar por WhatsApp no crea una reserva ni cobra dinero.<br/>• La confirmación del email no es obligatoria según la configuración indicada por el titular. La recuperación por correo continúa permitida por el servicio, pero no tiene un acceso visible en la app.<br/>• Facturación, pagos automáticos y emisión fiscal están deshabilitados en el despliegue beta.<br/>• La experiencia móvil descrita es web adaptable, no una aplicación Android nativa.<br/>• Antes de invitar testers de gestor o delegado faltan pruebas reales de alta, permisos y aislamiento entre cuentas.", styles["BodyR"]),
        Spacer(1, 4 * mm),
        Paragraph("Fuente: interfaz y código del proyecto Rendo, contrastados con la evidencia de despliegue del 30/09/2026. Esta guía refleja la beta actual y debe actualizarse cuando cambien sus recorridos o se completen las verificaciones pendientes.", styles["SmallR"]),
    ]
    doc.build(story, onFirstPage=page_chrome, onLaterPages=page_chrome)
    print(OUT)
    print(f"actions={action_number - 1}")


if __name__ == "__main__":
    build()
