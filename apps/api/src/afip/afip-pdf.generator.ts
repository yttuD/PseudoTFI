import PDFDocument from 'pdfkit';

export interface AfipComprobanteData {
  id: string;
  tipo_comprobante: string;
  tipo_comprobante_codigo: number;
  punto_venta: number;
  numero_comprobante: number;
  concepto: number;
  cuit_emisor: string;
  gestor_nombre?: string;
  razon_social?: string;
  domicilio_fiscal?: string;
  condicion_iva?: string;
  iibb?: string;
  inicio_actividades?: string;
  receptor_nombre: string;
  receptor_doc_tipo: string;
  receptor_doc_nro: string;
  fecha_emision: string;
  periodo_desde: string;
  periodo_hasta: string;
  importe_total: number;
  cae: string;
  cae_vencimiento: string;
}

export function generateAfipPdfBuffer(data: AfipComprobanteData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 36, // 0.5 inch
        info: {
          Title: `${data.tipo_comprobante} - ${String(data.punto_venta).padStart(5, '0')}-${String(data.numero_comprobante).padStart(8, '0')}`,
          Author: 'Rendo Real Estate Platform - AFIP WSFE Engine',
        },
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      const letra = data.tipo_comprobante_codigo === 6 ? 'B' : 'C';
      const codigoStr = `COD. ${String(data.tipo_comprobante_codigo).padStart(3, '0')}`;
      const formatNumber = (num: number) =>
        new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);

      const formatDate = (dStr: string) => {
        if (!dStr) return '';
        const parts = dStr.split('-');
        if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
        return dStr;
      };

      const formatCuit = (cuit: string) => {
        if (!cuit) return '';
        const clean = cuit.replace(/\D/g, '');
        if (clean.length === 11) {
          return `${clean.slice(0, 2)}-${clean.slice(2, 10)}-${clean.slice(10)}`;
        }
        return cuit;
      };

      const startX = 36;
      const startY = 36;
      const pageWidth = 595.28 - 72; // A4 width minus margins = 523.28

      // ==========================================
      // 1. RECUADRO SUPERIOR (CABECERA AFIP)
      // ==========================================
      const headerHeight = 150;
      doc.lineWidth(1).strokeColor('#333333');
      doc.rect(startX, startY, pageWidth, headerHeight).stroke();

      // Línea divisoria vertical central
      const midX = startX + pageWidth / 2;
      doc.moveTo(midX, startY + 38).lineTo(midX, startY + headerHeight).stroke();

      // Casillero Letra Central (Ej. [ C ])
      const boxW = 34;
      const boxH = 34;
      const boxX = midX - boxW / 2;
      doc.rect(boxX, startY, boxW, boxH).fillAndStroke('#FFFFFF', '#333333');
      doc.fillColor('#111827').fontSize(22).font('Helvetica-Bold').text(letra, boxX, startY + 4, {
        width: boxW,
        align: 'center',
      });
      doc.fontSize(7).font('Helvetica-Bold').text(codigoStr, boxX - 10, startY + boxH + 4, {
        width: boxW + 20,
        align: 'center',
      });

      // LADO IZQUIERDO: Datos del Emisor
      const razonSocial = data.razon_social || data.gestor_nombre || 'GESTIÓN INMOBILIARIA RENDO';
      doc.fillColor('#111827').fontSize(13).font('Helvetica-Bold');
      doc.text(razonSocial, startX + 10, startY + 12, {
        width: midX - startX - 30,
      });

      doc.fontSize(8).font('Helvetica');
      doc.text(`Razón Social: ${razonSocial}`, startX + 10, startY + 45);
      doc.text(`Domicilio Comercial: ${data.domicilio_fiscal || 'Mariano I. Loza 450, Goya, Corrientes'}`, startX + 10, startY + 60);

      const condicionIvaLabel = data.condicion_iva === 'monotributo'
        ? 'Responsable Monotributo'
        : data.condicion_iva === 'responsable_inscripto'
        ? 'IVA Responsable Inscripto'
        : data.condicion_iva === 'exento'
        ? 'IVA Exento'
        : data.condicion_iva || 'Responsable Monotributo';

      doc.text(`Condición frente al IVA: ${condicionIvaLabel}`, startX + 10, startY + 75);
      doc.text('Sistema Operativo: Rendo Terminal Locativo Oficial', startX + 10, startY + 90);

      // LADO DERECHO: Datos del Comprobante
      doc.fillColor('#111827').fontSize(14).font('Helvetica-Bold');
      doc.text(data.tipo_comprobante.toUpperCase(), midX + 25, startY + 12, {
        width: pageWidth / 2 - 35,
        align: 'left',
      });

      doc.fontSize(9).font('Helvetica-Bold');
      doc.text(
        `Punto de Venta: ${String(data.punto_venta).padStart(5, '0')}   Comp. Nro: ${String(data.numero_comprobante).padStart(8, '0')}`,
        midX + 25,
        startY + 45
      );
      doc.font('Helvetica');
      doc.text(`Fecha de Emisión: ${formatDate(data.fecha_emision)}`, midX + 25, startY + 62);
      doc.text(`CUIT: ${formatCuit(data.cuit_emisor || '20-33445566-7')}`, midX + 25, startY + 78);
      doc.text(`Ingresos Brutos: ${data.iibb || 'Régimen Simplificado Corrientes'}`, midX + 25, startY + 94);
      doc.text(`Fecha de Inicio de Actividades: ${formatDate(data.inicio_actividades || '2024-01-01')}`, midX + 25, startY + 110);

      // ==========================================
      // 2. PERÍODO FACTURADO
      // ==========================================
      const periodY = startY + headerHeight + 6;
      const periodH = 26;
      doc.rect(startX, periodY, pageWidth, periodH).stroke();

      doc.fontSize(8).font('Helvetica-Bold').fillColor('#374151');
      doc.text(`Período Facturado Desde: `, startX + 10, periodY + 8, { continued: true });
      doc.font('Helvetica').text(`${formatDate(data.periodo_desde)}    `, { continued: true });
      doc.font('Helvetica-Bold').text(`Hasta: `, { continued: true });
      doc.font('Helvetica').text(`${formatDate(data.periodo_hasta)}    `, { continued: true });
      doc.font('Helvetica-Bold').text(`Fecha de Vto. para el pago: `, { continued: true });
      doc.font('Helvetica').text(`${formatDate(data.cae_vencimiento)}`);

      // ==========================================
      // 3. DATOS DEL RECEPTOR (INQUILINO)
      // ==========================================
      const receptorY = periodY + periodH + 6;
      const receptorH = 55;
      doc.rect(startX, receptorY, pageWidth, receptorH).stroke();

      doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#111827');
      doc.text(`${data.receptor_doc_tipo}: `, startX + 10, receptorY + 8, { continued: true });
      doc.font('Helvetica').text(`${data.receptor_doc_nro}        `, { continued: true });
      doc.font('Helvetica-Bold').text(`Apellido y Nombre / Razón Social: `, { continued: true });
      doc.font('Helvetica').text(`${data.receptor_nombre}`);

      doc.font('Helvetica-Bold').text(`Condición frente al IVA: `, startX + 10, receptorY + 24, { continued: true });
      doc.font('Helvetica').text(`Consumidor Final        `, { continued: true });
      doc.font('Helvetica-Bold').text(`Domicilio: `, { continued: true });
      doc.font('Helvetica').text(`Goya, Corrientes, Argentina`);

      doc.font('Helvetica-Bold').text(`Condición de venta: `, startX + 10, receptorY + 40, { continued: true });
      doc.font('Helvetica').text(`Contado / Transferencia Inmediata`);

      // ==========================================
      // 4. TABLA DE CONCEPTOS
      // ==========================================
      const tableY = receptorY + receptorH + 8;
      const tableHeaderH = 20;

      doc.rect(startX, tableY, pageWidth, tableHeaderH).fillAndStroke('#F3F4F6', '#333333');
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#111827');
      doc.text('Código', startX + 6, tableY + 6);
      doc.text('Producto / Servicio', startX + 60, tableY + 6);
      doc.text('Cant.', startX + 280, tableY + 6, { width: 35, align: 'right' });
      doc.text('U. Med.', startX + 325, tableY + 6);
      doc.text('Precio Unit.', startX + 375, tableY + 6, { width: 65, align: 'right' });
      doc.text('Subtotal', startX + 445, tableY + 6, { width: 70, align: 'right' });

      const rowY = tableY + tableHeaderH;
      const rowH = 120;
      doc.rect(startX, rowY, pageWidth, rowH).stroke();

      doc.fontSize(8).font('Helvetica').fillColor('#111827');
      doc.text('ALQ-LOC', startX + 6, rowY + 10);
      doc.text(
        `Alquiler de Unidad Inmobiliaria\nPeríodo locativo: ${formatDate(data.periodo_desde)} al ${formatDate(data.periodo_hasta)}\nRegistro formal bajo sistema Rendo`,
        startX + 60,
        rowY + 10,
        { width: 215, lineGap: 3 }
      );
      doc.text('1,00', startX + 280, rowY + 10, { width: 35, align: 'right' });
      doc.text('unidades', startX + 325, rowY + 10);
      doc.text(`$ ${formatNumber(data.importe_total)}`, startX + 375, rowY + 10, { width: 65, align: 'right' });
      doc.text(`$ ${formatNumber(data.importe_total)}`, startX + 445, rowY + 10, { width: 70, align: 'right' });

      // ==========================================
      // 5. TOTALES
      // ==========================================
      const totalsY = rowY + rowH + 6;
      const totalsH = 45;
      doc.rect(startX, totalsY, pageWidth, totalsH).stroke();

      doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#374151');
      doc.text('Subtotal: $ ' + formatNumber(data.importe_total), startX + 340, totalsY + 8, {
        width: 175,
        align: 'right',
      });
      doc.text('Importe Otros Tributos: $ 0,00', startX + 340, totalsY + 20, {
        width: 175,
        align: 'right',
      });
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#111827');
      doc.text(`Importe Total: $ ${formatNumber(data.importe_total)}`, startX + 310, totalsY + 31, {
        width: 205,
        align: 'right',
      });

      // ==========================================
      // 6. PIE REGLAMENTARIO AFIP (CAE + QR)
      // ==========================================
      const footerY = totalsY + totalsH + 8;
      const footerH = 88;
      doc.rect(startX, footerY, pageWidth, footerH).stroke();

      // Logo / Nombre AFIP
      doc.fontSize(16).font('Helvetica-Bold').fillColor('#0D203E');
      doc.text('ARCA / AFIP', startX + 12, footerY + 12);
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#4B5563');
      doc.text('Comprobante Autorizado', startX + 12, footerY + 32);
      doc.fontSize(6.5).font('Helvetica');
      doc.text('Esta Administración Federal no se responsabiliza por los datos ingresados en el comprobante.', startX + 12, footerY + 44, {
        width: 240,
        lineGap: 2,
      });

      // Código de Barras / QR Simulado reglamentario
      const qrBoxX = startX + 260;
      const qrBoxY = footerY + 10;
      const qrBoxSize = 65;
      doc.rect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize).fillAndStroke('#F9FAFB', '#D1D5DB');

      // Dibujo esquemático del código QR reglamentario
      doc.fillColor('#111827');
      doc.rect(qrBoxX + 6, qrBoxY + 6, 16, 16).fill();
      doc.rect(qrBoxX + 8, qrBoxY + 8, 12, 12).fillColor('#FFFFFF').fill();
      doc.rect(qrBoxX + 10, qrBoxY + 10, 8, 8).fillColor('#111827').fill();

      doc.rect(qrBoxX + 43, qrBoxY + 6, 16, 16).fill();
      doc.rect(qrBoxX + 45, qrBoxY + 8, 12, 12).fillColor('#FFFFFF').fill();
      doc.rect(qrBoxX + 47, qrBoxY + 10, 8, 8).fillColor('#111827').fill();

      doc.rect(qrBoxX + 6, qrBoxY + 43, 16, 16).fill();
      doc.rect(qrBoxX + 8, qrBoxY + 45, 12, 12).fillColor('#FFFFFF').fill();
      doc.rect(qrBoxX + 10, qrBoxY + 47, 8, 8).fillColor('#111827').fill();

      // Patrones centrales QR
      doc.rect(qrBoxX + 26, qrBoxY + 14, 10, 8).fill();
      doc.rect(qrBoxX + 26, qrBoxY + 30, 16, 10).fill();
      doc.rect(qrBoxX + 40, qrBoxY + 44, 18, 14).fill();
      doc.rect(qrBoxX + 26, qrBoxY + 48, 8, 10).fill();

      // Datos CAE
      doc.fillColor('#111827').fontSize(9).font('Helvetica-Bold');
      doc.text(`CAE N°: `, startX + 345, footerY + 22, { continued: true });
      doc.font('Helvetica').text(data.cae);

      doc.font('Helvetica-Bold').text(`Fecha de Vto. de CAE: `, startX + 345, footerY + 42, { continued: true });
      doc.font('Helvetica').text(formatDate(data.cae_vencimiento));

      // Finalizar PDF
      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}
