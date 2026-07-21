import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import jsPDF from 'jspdf';
import type { AppraisalResponse } from '@/types/tasador';
import { formatPrice } from './utils';
import posthog from '@/utils/posthog';
import { useAuth } from '@/contexts/AuthContext';

interface ExportAppraisalPDFProps {
  data: AppraisalResponse;
  clientName?: string;
}

// ── GoAuto design tokens — soft, modern ──
const CYAN = { r: 8, g: 185, b: 210 };        // GoAuto cyan
const CYAN_LIGHT = { r: 236, g: 250, b: 252 }; // Very soft cyan bg
const CYAN_SOFT = { r: 210, g: 243, b: 248 };   // Soft cyan for accents
const SLATE_900 = { r: 15, g: 23, b: 42 };
const SLATE_700 = { r: 51, g: 65, b: 85 };
const SLATE_500 = { r: 100, g: 116, b: 139 };
const SLATE_400 = { r: 148, g: 163, b: 184 };
const SLATE_200 = { r: 226, g: 232, b: 240 };
const SLATE_100 = { r: 241, g: 245, b: 249 };
const SLATE_50 = { r: 248, g: 250, b: 252 };
const WHITE = { r: 255, g: 255, b: 255 };
const GREEN = { r: 16, g: 185, b: 129 };
const AMBER = { r: 245, g: 158, b: 11 };
const BLUE = { r: 59, g: 130, b: 246 };

const LOGO_PATH = '/goauto-logo-black.png';

const ExportAppraisalPDF = ({ data, clientName }: ExportAppraisalPDFProps) => {
  const { userId } = useAuth();
  const [exporting, setExporting] = useState(false);

  const generatePDF = async () => {
    setExporting(true);
    try {
      const doc = new jsPDF('p', 'mm', 'letter');
      const pw = doc.internal.pageSize.getWidth();
      const ph = doc.internal.pageSize.getHeight();
      const m = 18;
      const cw = pw - m * 2;
      let y = 0;
      let pageNum = 1;

      const setFill = (c: typeof CYAN) => doc.setFillColor(c.r, c.g, c.b);
      const setText = (c: typeof CYAN) => doc.setTextColor(c.r, c.g, c.b);
      const setDraw = (c: typeof CYAN) => doc.setDrawColor(c.r, c.g, c.b);

      const addFooter = () => {
        setDraw(SLATE_200);
        doc.line(m, ph - 14, pw - m, ph - 14);
        doc.setFontSize(7);
        setText(SLATE_400);
        doc.text('Generado por GoAuto · Tasador GAIA · Los precios son referenciales', m, ph - 10);
        doc.text(`Página ${pageNum}`, pw - m, ph - 10, { align: 'right' });
      };

      const newPage = () => {
        addFooter();
        doc.addPage();
        pageNum++;
        y = 18;
      };

      const checkSpace = (needed: number) => {
        if (y + needed > ph - 20) newPage();
      };

      const sectionHeader = (title: string) => {
        checkSpace(12);
        // Soft rounded header
        setFill(SLATE_50);
        doc.roundedRect(m, y, cw, 9, 1.5, 1.5, 'F');
        // Left accent bar
        setFill(CYAN);
        doc.roundedRect(m, y, 2.5, 9, 1, 1, 'F');

        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'bold');
        setText(SLATE_700);
        doc.text(title, m + 7, y + 6);

        y += 13;
      };

      // ══════════════════════════════════════════
      // HEADER
      // ══════════════════════════════════════════

      // Soft gradient header — white to light cyan
      setFill(WHITE);
      doc.rect(0, 0, pw, 32, 'F');
      // Bottom border
      setDraw(CYAN_SOFT);
      doc.setLineWidth(0.8);
      doc.line(0, 32, pw, 32);
      doc.setLineWidth(0.1);

      // GoAuto logo
      try {
        const logoImg = new Image();
        logoImg.crossOrigin = 'anonymous';
        await new Promise<void>((resolve, reject) => {
          logoImg.onload = () => resolve();
          logoImg.onerror = () => reject();
          logoImg.src = LOGO_PATH;
        });
        doc.addImage(logoImg, 'PNG', m, 8, 38, 12);
      } catch {
        // Fallback text
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        setText(CYAN);
        doc.text('GO', m, 17);
        setText(SLATE_900);
        doc.text('AUTO', m + doc.getTextWidth('GO'), 17);
      }

      // "Tasador GAIA" badge
      const badgeX = pw - m - 32;
      setFill(CYAN_LIGHT);
      doc.roundedRect(badgeX, 7, 32, 8, 3, 3, 'F');
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      setText(CYAN);
      doc.text('TASADOR GAIA', badgeX + 16, 12.5, { align: 'center' });

      // Date
      const dateStr = new Date().toLocaleDateString('es-CL', {
        day: '2-digit', month: '2-digit', year: 'numeric',
      });
      const timeStr = new Date().toLocaleTimeString('es-CL', {
        hour: '2-digit', minute: '2-digit',
      });
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      setText(SLATE_400);
      doc.text(`${dateStr} · ${timeStr}`, pw - m, 22, { align: 'right' });

      if (clientName) {
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        setText(SLATE_500);
        doc.text(clientName, pw - m, 27, { align: 'right' });
      }

      y = 38;

      // ══════════════════════════════════════════
      // VEHICLE TITLE
      // ══════════════════════════════════════════
      const { vehicle_details: vd } = data;
      const title = `${vd?.brand || ''} ${vd?.model || ''} ${vd?.year || ''}`.trim();

      // Clean card with subtle border
      setFill(WHITE);
      doc.roundedRect(m, y, cw, 18, 2, 2, 'F');
      setDraw(SLATE_200);
      doc.roundedRect(m, y, cw, 18, 2, 2, 'S');

      doc.setFontSize(15);
      doc.setFont('helvetica', 'bold');
      setText(SLATE_900);
      doc.text(title, m + 6, y + 8);

      // Details
      const details: string[] = [];
      if (vd?.version) details.push(vd.version);
      if (vd?.transmission) details.push(vd.transmission === 'automatic' ? 'Automático' : 'Manual');
      if (vd?.mileage) details.push(`${vd.mileage.toLocaleString('es-CL')} km`);
      if (vd?.fuel) details.push(vd.fuel);
      if (details.length > 0) {
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        setText(SLATE_500);
        doc.text(details.join('  ·  '), m + 6, y + 14);
      }

      // Confidence on right
      const confLabel = data.confidence === 'high' ? 'Alta confianza' : data.confidence === 'medium' ? 'Confianza media' : 'Datos limitados';
      const confColor = data.confidence === 'high' ? GREEN : data.confidence === 'medium' ? AMBER : SLATE_400;
      setFill(confColor);
      doc.circle(pw - m - 8, y + 7, 2.5, 'F');
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      setText(confColor);
      doc.text(confLabel, pw - m - 13, y + 8, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      setText(SLATE_400);
      doc.text(`${data.sources.length} publicaciones`, pw - m - 6, y + 14, { align: 'right' });

      y += 24;

      // ══════════════════════════════════════════
      // RANGO DE PRECIOS
      // ══════════════════════════════════════════
      if (data.estimated_range) {
        sectionHeader('Rango de precios verificado');

        // Price display — clean centered
        setFill(CYAN_LIGHT);
        doc.roundedRect(m, y, cw, 20, 3, 3, 'F');
        setDraw(CYAN_SOFT);
        doc.roundedRect(m, y, cw, 20, 3, 3, 'S');

        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        setText(SLATE_900);

        const low = formatPrice(data.estimated_range.low);
        const high = formatPrice(data.estimated_range.high);

        if (data.estimated_range.low === data.estimated_range.high) {
          doc.text(low, pw / 2, y + 13, { align: 'center' });
        } else {
          const fullRange = `${low}  —  ${high}`;
          doc.text(fullRange, pw / 2, y + 13, { align: 'center' });
        }

        y += 26;
      }

      // ══════════════════════════════════════════
      // ANÁLISIS ESTADÍSTICO
      // ══════════════════════════════════════════
      const pa = data.price_analysis;
      if (pa && pa.sampleSize > 0) {
        sectionHeader(`Análisis estadístico · ${pa.sampleSize} publicaciones`);

        const stats = [
          { label: 'Mínimo', value: pa.min },
          { label: 'Máximo', value: pa.max },
          { label: 'Promedio', value: pa.average },
          { label: 'Mediana', value: pa.median },
        ].filter((s) => s.value !== null);

        const colW = cw / stats.length;
        const gap = 2;
        stats.forEach((stat, i) => {
          const x = m + i * colW + (i > 0 ? gap / 2 : 0);
          const w = colW - gap;

          setFill(SLATE_50);
          doc.roundedRect(x, y, w, 16, 2, 2, 'F');

          doc.setFontSize(7);
          doc.setFont('helvetica', 'normal');
          setText(SLATE_400);
          doc.text(stat.label, x + w / 2, y + 5.5, { align: 'center' });

          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          setText(SLATE_900);
          doc.text(formatPrice(stat.value!), x + w / 2, y + 12.5, { align: 'center' });
        });

        y += 22;
      }

      // ══════════════════════════════════════════
      // PRECIOS SUGERIDOS
      // ══════════════════════════════════════════
      if (pa && pa.median && data.estimated_range) {
        sectionHeader('Precios sugeridos de publicación');

        const median = pa.median;
        const suggestions = [
          { label: 'Venta rápida', desc: '-7%', value: Math.round(median * 0.93), color: GREEN, bg: { r: 236, g: 253, b: 245 } },
          { label: 'Competitivo', desc: 'Mercado', value: median, color: BLUE, bg: { r: 239, g: 246, b: 255 } },
          { label: 'Maximizar', desc: '+7%', value: Math.round(median * 1.07), color: AMBER, bg: { r: 255, g: 251, b: 235 } },
        ];

        const colW = cw / 3;
        const gap = 3;
        suggestions.forEach((s, i) => {
          const x = m + i * colW + (i > 0 ? gap / 2 : 0);
          const w = colW - gap;

          // Soft colored card
          setFill(s.bg);
          doc.roundedRect(x, y, w, 20, 2, 2, 'F');

          // Label
          doc.setFontSize(7);
          doc.setFont('helvetica', 'bold');
          setText(s.color);
          doc.text(s.label, x + w / 2, y + 5.5, { align: 'center' });

          // Price
          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          setText(SLATE_900);
          doc.text(formatPrice(s.value), x + w / 2, y + 13, { align: 'center' });

          // Desc
          doc.setFontSize(6.5);
          doc.setFont('helvetica', 'normal');
          setText(SLATE_400);
          doc.text(s.desc, x + w / 2, y + 17.5, { align: 'center' });
        });

        y += 26;

        // Purchase price
        setFill(SLATE_50);
        doc.roundedRect(m, y, cw, 11, 2, 2, 'F');

        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        setText(SLATE_500);
        doc.text('Precio de compra sugerido (~18% margen)', m + 5, y + 7);

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        setText(SLATE_900);
        doc.text(formatPrice(Math.round(median * 0.82)), pw - m - 5, y + 7.5, { align: 'right' });

        y += 17;
      }

      // ══════════════════════════════════════════
      // PUBLICACIONES
      // ══════════════════════════════════════════
      if (data.sources.length > 0) {
        sectionHeader(`Publicaciones encontradas · ${data.sources.length} de ${new Set(data.sources.map((s) => s.source)).size} fuentes`);

        const cols = {
          source: m + 4,
          vehicle: m + 33,
          year: m + 110,
          km: m + 124,
          price: pw - m - 4,
        };

        // Header row
        setFill(SLATE_100);
        doc.roundedRect(m, y, cw, 7, 1, 1, 'F');
        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'bold');
        setText(SLATE_500);
        doc.text('FUENTE', cols.source, y + 5);
        doc.text('VEHÍCULO', cols.vehicle, y + 5);
        doc.text('AÑO', cols.year, y + 5);
        doc.text('KM', cols.km, y + 5);
        doc.text('PRECIO', cols.price, y + 5, { align: 'right' });
        y += 9;

        // Rows
        data.sources.forEach((s, idx) => {
          checkSpace(8);

          if (idx % 2 === 1) {
            setFill(SLATE_50);
            doc.rect(m, y, cw, 7, 'F');
          }

          setDraw(SLATE_200);
          doc.line(m, y + 7, pw - m, y + 7);

          doc.setFontSize(7.5);
          doc.setFont('helvetica', 'normal');
          setText(SLATE_500);
          doc.text(s.source.substring(0, 14), cols.source, y + 5);

          setText(SLATE_700);
          const vehicleText = s.vehicle.length > 38 ? s.vehicle.substring(0, 38) + '...' : s.vehicle;
          doc.text(vehicleText, cols.vehicle, y + 5);

          setText(SLATE_500);
          doc.text(s.year ? String(s.year) : '-', cols.year, y + 5);
          doc.text(s.mileage ? s.mileage.toLocaleString('es-CL') : '-', cols.km, y + 5);

          doc.setFont('helvetica', 'bold');
          setText(SLATE_900);
          doc.text(formatPrice(s.price), cols.price, y + 5, { align: 'right' });

          y += 7;
        });

        y += 6;
      }

      // ══════════════════════════════════════════
      // DISCLAIMER
      // ══════════════════════════════════════════
      checkSpace(18);
      setFill(CYAN_LIGHT);
      doc.roundedRect(m, y, cw, 13, 2, 2, 'F');

      // Cyan dot
      setFill(CYAN);
      doc.circle(m + 6, y + 6.5, 2, 'F');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      setText(WHITE);
      doc.text('i', m + 6, y + 7.8, { align: 'center' });

      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'normal');
      setText(SLATE_500);
      const disclaimer = 'Los precios mostrados son referenciales y están basados en publicaciones encontradas al momento de la generación. Pueden variar según condiciones específicas del vehículo, equipamiento, estado mecánico y cosmético.';
      const lines = doc.splitTextToSize(disclaimer, cw - 18);
      doc.text(lines, m + 12, y + 5);

      // Footer
      addFooter();

      // Save
      const fileName = `Tasacion_GAIA_${title.replace(/\s+/g, '_')}_${dateStr.replace(/\//g, '-')}.pdf`;
      doc.save(fileName);
      posthog.capture({
        distinctId: userId || 'anonymous',
        event: 'appraisal_exported_pdf',
        properties: { vehicle: title },
      });
    } catch (err) {
      console.error('Error generating PDF:', err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <button
      onClick={generatePDF}
      disabled={exporting}
      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-primary bg-gray-50 hover:bg-primary/5 rounded-xl transition-all duration-200 disabled:opacity-50"
    >
      {exporting ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Download className="w-4 h-4" />
      )}
      Exportar PDF
    </button>
  );
};

export default ExportAppraisalPDF;
