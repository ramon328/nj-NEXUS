import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { PDFDocument } from 'pdf-lib';
import { Download, Loader2, Printer } from 'lucide-react';
import { useState } from 'react';

interface DownloadButtonComponentProps {
  onClick?: () => void;
  documentId?: string | number;
  documentType?: string;
  compact?: boolean;
  fullWidth?: boolean;
  isPrintButton?: boolean;
}

const DownloadButtonComponent = ({
  onClick,
  documentId = 'documento',
  documentType = 'documento',
  compact = false,
  fullWidth = false,
  isPrintButton = false,
}: DownloadButtonComponentProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const { t } = useTranslation('vehicleDocuments');

  // Función para capturar el documento y crear un PDF
  const generatePdf = async () => {
    try {
      setIsProcessing(true);

      // Detectar si el navegador/cliente puede tener problemas
      const isSlowDevice =
        navigator.hardwareConcurrency < 4 ||
        navigator.deviceMemory < 4 ||
        /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent
        );

      // Detectar marcas problemáticas (Lenovo, Toshiba)
      const isProblematicBrand =
        /lenovo|toshiba/i.test(navigator.userAgent) ||
        /lenovo|toshiba/i.test(navigator.platform);

      // Detectar Intel Graphics problemáticos (solo en Windows, no en Mac)
      const isProblematicIntelGraphics =
        /intel/i.test(navigator.userAgent) &&
        /windows/i.test(navigator.userAgent) &&
        !/macintosh/i.test(navigator.userAgent);

      if (isSlowDevice || isProblematicBrand || isProblematicIntelGraphics) {
        console.log('Dispositivo con problemas conocidos detectado:', {
          isSlowDevice,
          isProblematicBrand,
          isProblematicIntelGraphics,
          userAgent: navigator.userAgent,
        });
      }

      // Esperar un poco para asegurar que el DOM está listo
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Encontrar el documento con selectores más específicos para cada tipo
      let documentContainer;

      // Buscar por tipo de documento específico primero
      if (documentType === 'consignacion') {
        documentContainer = document.querySelector(
          '.consignment-note-document'
        );
      } else if (documentType === 'nota_venta') {
        documentContainer = document.querySelector('.sale-note-document');
      } else if (documentType === 'reserva') {
        documentContainer = document.querySelector(
          '.reservation-note-document'
        );
      } else if (documentType === 'nota_compra') {
        documentContainer = document.querySelector('.purchase-note-document');
      } else if (documentType === 'cotizacion') {
        documentContainer = document.querySelector('.quotation-note-document');
      } else if (documentType === 'liquidacion_venta') {
        documentContainer = document.querySelector(
          '.close-business-deal-document'
        );
      }

      // Si no se encontró con el tipo específico, buscar cualquier documento
      if (!documentContainer) {
        documentContainer =
          document.querySelector('.consignment-note-document') ||
          document.querySelector('.sale-note-document') ||
          document.querySelector('.reservation-note-document') ||
          document.querySelector('.purchase-note-document') ||
          document.querySelector('.quotation-note-document') ||
          document.querySelector('.close-business-deal-document');
      }

      // Si aún no se encuentra, buscar en contenedores genéricos
      if (!documentContainer) {
        documentContainer =
          document.querySelector('.print-container')?.firstElementChild;
      }

      // Último recurso: buscar cualquier contenedor que pueda tener el documento
      if (!documentContainer) {
        documentContainer =
          document.querySelector('.print-container') ||
          document.querySelector('[role="dialog"]')?.querySelector('.bg-white');
      }

      if (!documentContainer) {
        console.error('No document found to process', {
          documentType,
          documentId,
          available: document.querySelectorAll(
            '.print-container, [role="dialog"]'
          ).length,
        });
        alert(t('download.errors.notFound'));
        setIsProcessing(false);
        return null;
      }

      // PRE-CARGAR todas las imágenes del documento ANTES de clonar
      // Esto asegura que las imágenes (especialmente el logo) estén disponibles
      const originalImages = documentContainer.querySelectorAll('img');
      const preloadPromises: Promise<void>[] = [];

      for (const img of Array.from(originalImages)) {
        if (img instanceof HTMLImageElement && img.src) {
          if (!img.complete || img.naturalHeight === 0) {
            console.log('[DownloadButtonComponent] Pre-cargando imagen:', img.src.substring(0, 80) + '...');
            preloadPromises.push(
              new Promise((resolve) => {
                const timeout = setTimeout(() => {
                  console.warn('[DownloadButtonComponent] Timeout pre-cargando imagen:', img.src.substring(0, 80));
                  resolve();
                }, 8000);

                img.onload = () => {
                  clearTimeout(timeout);
                  console.log('[DownloadButtonComponent] Imagen pre-cargada exitosamente');
                  resolve();
                };
                img.onerror = () => {
                  clearTimeout(timeout);
                  console.error('[DownloadButtonComponent] Error pre-cargando imagen:', img.src.substring(0, 80));
                  resolve();
                };

                // Forzar recarga si es necesario
                if (img.complete && img.naturalHeight === 0) {
                  const currentSrc = img.src;
                  img.src = '';
                  img.src = currentSrc;
                }
              })
            );
          }
        }
      }

      if (preloadPromises.length > 0) {
        console.log(`[DownloadButtonComponent] Esperando ${preloadPromises.length} imágenes...`);
        await Promise.all(preloadPromises);
        // Pequeña espera adicional para asegurar que el DOM se actualice
        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      // Ocultar elementos que no deben aparecer en el PDF
      const printHiddenElements = document.querySelectorAll(
        '.print\\:hidden, .no-print'
      );
      printHiddenElements.forEach((el) => {
        (el as HTMLElement).style.display = 'none';
      });

      // Crear un PDF A4
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      // Configuración de página
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      // Márgenes normales para que el contenido respire
      const marginX = 10; // mm
      const marginY = 10; // mm

      // Función para convertir imagen a base64 via fetch (evita tainted canvas)
      const imageToBase64 = async (imgElement: HTMLImageElement): Promise<string | null> => {
        try {
          if (imgElement.src.startsWith('data:')) {
            return imgElement.src;
          }

          // Descargar la imagen como blob para evitar CORS/tainted canvas
          const response = await fetch(imgElement.src);
          if (!response.ok) {
            console.warn('[DownloadButtonComponent] Fetch imagen falló:', response.status, imgElement.src.substring(0, 80));
            return null;
          }
          const blob = await response.blob();
          return await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = () => resolve('');
            reader.readAsDataURL(blob);
          }) || null;
        } catch (error) {
          console.error('[DownloadButtonComponent] Error convirtiendo imagen:', error);
          return null;
        }
      };

      // Crear un clon del documento para manipularlo
      const docClone = documentContainer.cloneNode(true) as HTMLElement;

      // Crear un contenedor temporal con el MISMO ancho que la vista previa
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';
      tempContainer.style.width = '794px'; // Ancho A4 en px (210mm * 96dpi / 25.4)
      tempContainer.style.backgroundColor = 'white';
      tempContainer.style.overflow = 'visible';
      tempContainer.appendChild(docClone);
      document.body.appendChild(tempContainer);

      // NO modificar estilos - dejar que se renderice exactamente como en pantalla
      docClone.style.width = '100%';
      docClone.style.backgroundColor = 'white';

      // SOLO arreglar elementos con border-top que puedan tapar texto
      const elementsWithBorderTop = docClone.querySelectorAll('.border-t');
      elementsWithBorderTop.forEach((el: Element) => {
        if (el instanceof HTMLElement) {
          // Añadir un padding-top y margin-top mínimo para que el borde no tape el texto
          const computedStyle = window.getComputedStyle(el);
          const currentPaddingTop = parseFloat(computedStyle.paddingTop) || 0;
          const currentMarginTop = parseFloat(computedStyle.marginTop) || 0;

          if (currentPaddingTop < 8) {
            el.style.paddingTop = '8px';
          }
          if (currentMarginTop < 12) {
            el.style.marginTop = '12px'; // Margen arriba del borde
          }
        }
      });

      // Convertir todas las imágenes a base64 para evitar problemas de CORS
      const images = docClone.querySelectorAll('img');
      const imageConversionPromises: Promise<void>[] = [];

      for (const img of Array.from(images)) {
        if (img instanceof HTMLImageElement && img.src) {
          img.style.maxWidth = '100%';

          // Convertir la imagen a base64 usando la imagen original
          const originalImg = Array.from(originalImages).find(
            (origImg) => origImg instanceof HTMLImageElement && origImg.src === img.src
          ) as HTMLImageElement | undefined;

          if (originalImg) {
            imageConversionPromises.push(
              (async () => {
                const base64 = await imageToBase64(originalImg);
                if (base64) {
                  img.src = base64;
                  console.log('[DownloadButtonComponent] Imagen convertida a base64');
                }
              })()
            );
          }
        }
      }

      // Esperar a que TODAS las conversiones se completen
      if (imageConversionPromises.length > 0) {
        console.log(`[DownloadButtonComponent] Convirtiendo ${imageConversionPromises.length} imágenes a base64...`);
        await Promise.all(imageConversionPromises);
        console.log('[DownloadButtonComponent] Todas las imágenes convertidas');
      }

      // Esperar a que los estilos se apliquen
      await new Promise((resolve) => setTimeout(resolve, 300));

      // --- PAGE BREAK LOGIC START ---
      // Split docClone into sections at .pdf-page-break
      const sections = [];
      let currentSection = document.createElement('div');
      currentSection.style.background = 'white';
      // Move all children into sections, splitting at .pdf-page-break
      Array.from(docClone.childNodes).forEach((node) => {
        if (
          node instanceof HTMLElement &&
          node.classList.contains('pdf-page-break')
        ) {
          if (currentSection.childNodes.length > 0) {
            sections.push(currentSection);
            currentSection = document.createElement('div');
            currentSection.style.background = 'white';
          }
        } else {
          currentSection.appendChild(node.cloneNode(true));
        }
      });
      if (currentSection.childNodes.length > 0) {
        sections.push(currentSection);
      }

      // Filter out empty sections that would create blank pages
      const nonEmptySections = sections.filter((section) => {
        // Check if section has meaningful content (not just whitespace)
        const hasTextContent = section.textContent?.trim().length > 0;
        const hasImages = section.querySelectorAll('img').length > 0;
        return hasTextContent || hasImages;
      });

      console.log(`Sections found: ${sections.length}, Non-empty: ${nonEmptySections.length}`);

      // Si no hay secciones con contenido, no generar PDF
      if (nonEmptySections.length === 0) {
        console.error('No hay contenido para generar PDF');
        alert(t('download.errors.noContent'));
        setIsProcessing(false);
        return null;
      }

      // --- PAGE BREAK LOGIC END ---

      // Limpiar el contenedor temporal (lo volveremos a usar para cada sección)
      document.body.removeChild(tempContainer);

      // Restaurar visibilidad de elementos ocultos
      printHiddenElements.forEach((el) => {
        (el as HTMLElement).style.display = '';
      });

      // Render each section as a separate page
      let pagesAdded = 0; // Contador de páginas realmente agregadas
      for (let i = 0; i < nonEmptySections.length; i++) {
        // Crear un contenedor temporal para la sección
        const sectionContainer = document.createElement('div');
        sectionContainer.style.position = 'absolute';
        sectionContainer.style.left = '-9999px';
        sectionContainer.style.width = '210mm';
        sectionContainer.style.backgroundColor = 'white';
        sectionContainer.style.overflow = 'hidden';
        sectionContainer.appendChild(nonEmptySections[i]);
        document.body.appendChild(sectionContainer);

        // Esperar a que los estilos se apliquen
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Capturar la sección con timeout y retry
        let canvas: any;
        let retryCount = 0;
        const maxRetries = 3;

        while (retryCount < maxRetries) {
          try {
            // Configuración de html2canvas - captura EXACTA como vista previa
            const canvasOptions = {
              scale: 1.5, // Escala reducida para menor peso
              useCORS: true,
              allowTaint: false, // Las imágenes ya se convirtieron a base64
              logging: false, // Desactivar logging
              backgroundColor: '#FFFFFF',
              imageTimeout: 15000,
              removeContainer: false,
              foreignObjectRendering: false,
              onclone: (clonedDoc: Document) => {
                // Asegurar que las imágenes se vean bien y tengan CORS
                const clonedImages = clonedDoc.querySelectorAll('img');
                clonedImages.forEach((img: Element) => {
                  if (img instanceof HTMLImageElement) {
                    img.style.maxWidth = '100%';
                    img.style.height = 'auto';
                    // Forzar crossOrigin para CORS
                    if (!img.crossOrigin) {
                      img.crossOrigin = 'anonymous';
                    }
                  }
                });
              },
            };

            canvas = await Promise.race([
              html2canvas(nonEmptySections[i], canvasOptions),
              new Promise(
                (_, reject) =>
                  setTimeout(() => reject(new Error('Timeout')), 30000) // 30 segundos total
              ),
            ]);
            break; // Si llegamos aquí, fue exitoso
          } catch (error) {
            retryCount++;
            console.warn(`Intento ${retryCount} falló:`, error);
            if (retryCount < maxRetries) {
              await new Promise((resolve) => setTimeout(resolve, 2000)); // Esperar 2 segundos
            } else {
              throw new Error(
                `No se pudo generar el PDF después de ${maxRetries} intentos`
              );
            }
          }
        }

        // Limpiar el contenedor temporal de la sección
        document.body.removeChild(sectionContainer);

        // Verificar que el canvas no esté vacío
        const ctx = canvas.getContext('2d');
        const imageData = ctx?.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = imageData?.data || [];

        // Verificar si hay contenido real (no solo píxeles blancos o casi blancos)
        let nonWhitePixels = 0;
        const threshold = 250; // Umbral para considerar "casi blanco"
        const sampleStep = 100; // Muestrear cada 100 píxeles para eficiencia

        for (let p = 0; p < pixels.length; p += sampleStep * 4) {
          const r = pixels[p];
          const g = pixels[p + 1];
          const b = pixels[p + 2];
          // Contar píxeles que NO sean blancos o casi blancos
          if (r < threshold || g < threshold || b < threshold) {
            nonWhitePixels++;
          }
        }

        // Calcular porcentaje de píxeles con contenido
        const totalSampledPixels = Math.ceil(pixels.length / (sampleStep * 4));
        const contentPercentage = (nonWhitePixels / totalSampledPixels) * 100;

        console.log(`Sección ${i}: ${nonWhitePixels} píxeles con contenido de ${totalSampledPixels} muestreados (${contentPercentage.toFixed(2)}%)`);

        // Si hay menos del 1% de contenido o el canvas es muy pequeño, saltar
        if (contentPercentage < 1 || canvas.height < 20) {
          console.log(`⚠️ Saltando sección ${i} (muy poco contenido o muy pequeña)`);
          continue;
        }

        // Calcular el ratio para mantener la proporción
        const availableWidth = pageWidth - marginX * 2;
        const availableHeight = pageHeight - marginY * 2;
        const imgWidth = availableWidth;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        // Si la imagen cabe en una sola página
        if (imgHeight <= availableHeight) {
          if (pagesAdded > 0) pdf.addPage();
          const imgData = canvas.toDataURL('image/jpeg', 0.85); // JPEG con 85% calidad para menor peso
          pdf.addImage(imgData, 'JPEG', marginX, marginY, imgWidth, imgHeight);
          pagesAdded++;
        } else {
          // Si la sección es más larga que una página, dividirla en varias páginas
          const contentHeight = pageHeight - marginY * 2;
          const scaledCanvasHeight =
            (canvas.height * availableWidth) / canvas.width;
          const pagesNeeded = Math.ceil(scaledCanvasHeight / contentHeight);
          for (let j = 0; j < pagesNeeded; j++) {
            const sourceY =
              (j * (contentHeight * canvas.width)) / availableWidth;
            const sourceHeight = Math.min(
              (contentHeight * canvas.width) / availableWidth,
              canvas.height - sourceY
            );
            if (sourceHeight <= 0) break;
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = canvas.width;
            tempCanvas.height = sourceHeight;
            const ctx = tempCanvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(
                canvas,
                0,
                sourceY,
                canvas.width,
                sourceHeight,
                0,
                0,
                canvas.width,
                sourceHeight
              );

              // Verificar si esta parte del canvas tiene contenido
              const partImageData = ctx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
              const partPixels = partImageData.data;
              let partNonWhitePixels = 0;
              const partThreshold = 250;
              const partSampleStep = 100;

              for (let p = 0; p < partPixels.length; p += partSampleStep * 4) {
                const r = partPixels[p];
                const g = partPixels[p + 1];
                const b = partPixels[p + 2];
                if (r < partThreshold || g < partThreshold || b < partThreshold) {
                  partNonWhitePixels++;
                }
              }

              const partTotalSampled = Math.ceil(partPixels.length / (partSampleStep * 4));
              const partContentPercentage = (partNonWhitePixels / partTotalSampled) * 100;

              console.log(`  Parte ${j}: ${partContentPercentage.toFixed(2)}% de contenido`);

              // Solo agregar si tiene > 1% de contenido
              if (partContentPercentage > 1) {
                if (pagesAdded > 0) pdf.addPage();
                const imgData = tempCanvas.toDataURL('image/jpeg', 0.85);
                const partHeight = (sourceHeight * availableWidth) / canvas.width;
                pdf.addImage(
                  imgData,
                  'JPEG',
                  marginX,
                  marginY,
                  availableWidth,
                  partHeight
                );
                pagesAdded++;
              } else {
                console.log(`  ⚠️ Saltando parte ${j} (muy poco contenido: ${partContentPercentage.toFixed(2)}%)`);
              }
            }
          }
        }
      }

      console.log(`PDF generado con ${pagesAdded} páginas`);

      // Verificar que se haya agregado al menos una página
      if (pagesAdded === 0) {
        console.error('No se generó ninguna página con contenido');
        alert(t('download.errors.noContent'));
        setIsProcessing(false);
        return null;
      }

      setIsProcessing(false);
      return pdf;
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert(t('download.errors.generate'));
      setIsProcessing(false);
      return null;
    }
  };

  // Function to combine main PDF with extra PDFs
  const combinePdfsWithExtras = async (mainPdf: jsPDF): Promise<Uint8Array> => {
    try {
      // Check if there are extra PDF files marked in the document
      const extraPdfMarker = document.querySelector('.extra-pdf-files-marker');

      if (!extraPdfMarker) {
        // No extra PDFs, return main PDF as is
        return new Uint8Array(mainPdf.output('arraybuffer'));
      }

      const pdfUrlsAttr = extraPdfMarker.getAttribute('data-pdf-urls');
      if (!pdfUrlsAttr) {
        return new Uint8Array(mainPdf.output('arraybuffer'));
      }

      const pdfUrls: string[] = JSON.parse(pdfUrlsAttr);

      if (pdfUrls.length === 0) {
        return new Uint8Array(mainPdf.output('arraybuffer'));
      }

      console.log('Found extra PDFs to merge:', pdfUrls);

      // Convert main PDF to PDFDocument
      const mainPdfBytes = mainPdf.output('arraybuffer');
      const mainPdfDoc = await PDFDocument.load(mainPdfBytes);

      const initialPageCount = mainPdfDoc.getPageCount();
      console.log(`PDF principal tiene ${initialPageCount} páginas antes de agregar extras`);

      // Download and merge each extra PDF
      for (const url of pdfUrls) {
        try {
          console.log('Fetching extra PDF:', url);
          const response = await fetch(url);

          if (!response.ok) {
            console.error(`Failed to fetch PDF from ${url}: ${response.status}`);
            continue;
          }

          const extraPdfBytes = await response.arrayBuffer();
          const extraPdfDoc = await PDFDocument.load(extraPdfBytes);

          // Copy all pages from extra PDF to main PDF
          const copiedPages = await mainPdfDoc.copyPages(
            extraPdfDoc,
            extraPdfDoc.getPageIndices()
          );

          copiedPages.forEach((page) => {
            mainPdfDoc.addPage(page);
          });

          console.log('Successfully merged PDF from:', url);
        } catch (error) {
          console.error('Error merging PDF:', url, error);
          // Continue with other PDFs even if one fails
        }
      }

      // Save combined PDF
      const combinedPdfBytes = await mainPdfDoc.save();
      return combinedPdfBytes;
    } catch (error) {
      console.error('Error combining PDFs:', error);
      // Return main PDF if combination fails
      return new Uint8Array(mainPdf.output('arraybuffer'));
    }
  };

  const handleAction = async () => {
    if (onClick) {
      onClick();
      return;
    }

    if (isProcessing) return;

    try {
      const pdf = await generatePdf();

      if (!pdf) return;

      // Combine with extra PDFs if they exist
      const finalPdfBytes = await combinePdfsWithExtras(pdf);

      if (isPrintButton) {
        // Para imprimir - generar blob y abrir en nueva ventana
        const pdfBlob = new Blob([finalPdfBytes as BlobPart], { type: 'application/pdf' });
        const pdfUrl = URL.createObjectURL(pdfBlob);

        // Crear una nueva ventana para imprimir
        const printWindow = window.open(pdfUrl, '_blank');
        if (printWindow) {
          printWindow.focus();
          // Esperar a que la ventana cargue completamente
          printWindow.onload = () => {
            setTimeout(() => printWindow.print(), 500);
          };
          // Fallback si onload no se dispara
          setTimeout(() => {
            try { printWindow.print(); } catch (e) { /* ya impreso */ }
          }, 2000);
          // Limpiar URL después de impresión
          setTimeout(() => URL.revokeObjectURL(pdfUrl), 30000);
        } else {
          alert(t('download.errors.popupBlocked'));
          // Descargar como alternativa
          const link = document.createElement('a');
          link.href = pdfUrl;
          link.download = `${documentType}_${documentId}.pdf`;
          link.click();
          setTimeout(() => URL.revokeObjectURL(pdfUrl), 5000);
        }
      } else {
        // Para descargar - crear blob y descargar
        const pdfBlob = new Blob([finalPdfBytes as BlobPart], { type: 'application/pdf' });
        const pdfUrl = URL.createObjectURL(pdfBlob);
        const link = document.createElement('a');
        link.href = pdfUrl;
        link.download = `${documentType}_${documentId}.pdf`;
        link.click();

        // Clean up - increased timeout for slow connections
        setTimeout(() => URL.revokeObjectURL(pdfUrl), 5000);
      }
    } catch (error) {
      console.error(error);
      alert(t('download.errors.process'));
      setIsProcessing(false);
    }
  };

  // Configurar clases y textos según el tipo de botón
  const Icon = isProcessing ? Loader2 : isPrintButton ? Printer : Download;
  const text = isProcessing
    ? t('download.preparing')
    : isPrintButton
    ? t('download.print')
    : t('download.download');

  const className = isPrintButton
    ? `bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center text-xs sm:text-sm px-2 sm:px-4 py-1 sm:py-2 ${
        fullWidth ? 'flex-1 sm:flex-initial' : ''
      }`
    : `bg-white text-blue-600 border border-blue-600 hover:bg-gray-100 flex items-center justify-center text-xs sm:text-sm px-2 sm:px-4 py-1 sm:py-2 ${
        fullWidth ? 'flex-1 sm:flex-initial' : ''
      }`;

  return (
    <Button
      onClick={handleAction}
      className={className}
      size='sm'
      disabled={isProcessing}
    >
      <Icon
        className={`h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 ${
          isProcessing ? 'animate-spin' : ''
        }`}
      />
      <span className='sm:inline'>{text}</span>
    </Button>
  );
};

export default DownloadButtonComponent;
