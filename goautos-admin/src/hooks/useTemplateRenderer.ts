
import { useState } from 'react';
import { useDocumentTemplates, TemplateType } from '@/hooks/useDocumentTemplates';
import { useAuth } from '@/contexts/AuthContext';
import { getPaymentMethodLabel } from '@/utils/paymentMethods';

export const useTemplateRenderer = (type: TemplateType) => {
  const [rendering, setRendering] = useState(false);
  const { templates, loading: templatesLoading } = useDocumentTemplates();
  const { client } = useAuth();

  const getTemplateData = () => {
    if (!templates) return null;
    
    switch (type) {
      case 'sale':
        return templates.sale_template;
      case 'purchase':
        return templates.purchase_template;
      case 'consignment':
        return templates.consignment_template;
      case 'reservation':
        return templates.reservation_template;
      case 'quotation':
        return templates.quotation_template;
      default:
        return null;
    }
  };
  
  const renderDocumentHtml = (documentData: any) => {
    setRendering(true);
    try {
      const templateData = getTemplateData();
      if (!templateData) {
        throw new Error("Template not found");
      }
      
      // Generate HTML based on template configuration and document data
      const html = generateDocumentHtml(templateData, documentData, client);
      
      setRendering(false);
      return html;
    } catch (error) {
      console.error("Error rendering document:", error);
      setRendering(false);
      return null;
    }
  };
  
  // Generate printable HTML document
  const generateDocumentHtml = (template: any, data: any, clientInfo: any) => {
    // This is a simplified implementation
    // In a real app, this would be more complex and generate complete HTML
    const logoUrl = clientInfo?.logo || '';
    const companyName = clientInfo?.name || 'Automotora';
    
    const logoPositionClass = getLogoPositionClass(template.logo_position);
    
    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${getDocumentTitle(type)}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 40px; }
          .header { margin-bottom: 30px; }
          .logo-container { display: flex; ${logoPositionClass} margin-bottom: 20px; }
          .logo { max-height: 70px; max-width: 200px; }
          .header-text { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
          .document-title { font-size: 28px; font-weight: bold; margin-bottom: 20px; text-align: center; }
          .section { margin-bottom: 30px; }
          .section-title { font-size: 18px; font-weight: bold; margin-bottom: 10px; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
          .footer { margin-top: 50px; border-top: 1px solid #ddd; padding-top: 20px; font-size: 14px; color: #666; }
          .signatures { display: flex; justify-content: space-between; margin-top: 70px; }
          .signature-line { border-top: 1px solid #000; width: 200px; text-align: center; padding-top: 5px; }
          table { width: 100%; border-collapse: collapse; }
          td { padding: 8px; border-bottom: 1px solid #eee; }
          td:first-child { font-weight: bold; width: 40%; }
          ${template.custom_css || ''}
        </style>
      </head>
      <body>
        <div class="header">
          ${logoUrl ? `
            <div class="logo-container">
              <img src="${logoUrl}" alt="${companyName}" class="logo">
            </div>
          ` : ''}
          <div class="header-text">${template.header_text || getDocumentTitle(type)}</div>
        </div>
        
        <div class="document-title">${getDocumentTitle(type)}</div>
    `;
    
    // Add document-specific content based on data and template type
    html += generateSpecificContent(type, template, data);
    
    // Add company details if configured
    if (template.include_company_details && clientInfo) {
      html += `
        <div class="section">
          <div class="section-title">Datos de la Empresa</div>
          <table>
            <tr>
              <td>Nombre:</td>
              <td>${clientInfo.name || ''}</td>
            </tr>
            ${clientInfo.contact?.address ? `
            <tr>
              <td>Dirección:</td>
              <td>${clientInfo.contact.address}</td>
            </tr>
            ` : ''}
            ${clientInfo.contact?.email ? `
            <tr>
              <td>Email:</td>
              <td>${clientInfo.contact.email}</td>
            </tr>
            ` : ''}
            ${clientInfo.contact?.phone ? `
            <tr>
              <td>Teléfono:</td>
              <td>${clientInfo.contact.phone}</td>
            </tr>
            ` : ''}
          </table>
        </div>
      `;
    }
    
    // Add legal text if configured
    if (template.include_legal_text) {
      html += `
        <div class="section">
          <div class="section-title">Condiciones Legales</div>
          <p>${getLegalText(type, template)}</p>
        </div>
      `;
    }
    
    // Add signatures if configured
    if (template.show_signature_lines) {
      html += `
        <div class="signatures">
          <div class="signature-line">Cliente</div>
          <div class="signature-line">Representante ${companyName}</div>
        </div>
      `;
    }
    
    // Add footer
    html += `
        <div class="footer">
          ${template.footer_text || `© ${new Date().getFullYear()} ${companyName}`}
        </div>
      </body>
      </html>
    `;
    
    return html;
  };
  
  return {
    renderDocumentHtml,
    rendering,
    templatesLoading
  };
};

// Helper function to get document title based on type
function getDocumentTitle(type: TemplateType): string {
  switch (type) {
    case 'sale': return 'NOTA DE VENTA';
    case 'purchase': return 'NOTA DE COMPRA';
    case 'consignment': return 'ACTA DE CONSIGNACIÓN';
    case 'reservation': return 'ACTA DE RESERVACIÓN';
    case 'quotation': return 'COTIZACIÓN';
    default: return 'DOCUMENTO';
  }
}

// Helper function to get logo position CSS
function getLogoPositionClass(position: string): string {
  switch (position) {
    case 'left': return 'justify-content: flex-start;';
    case 'center': return 'justify-content: center;';
    case 'right': return 'justify-content: flex-end;';
    default: return 'justify-content: flex-start;';
  }
}

// Generate specific content based on template type
function generateSpecificContent(type: TemplateType, template: any, data: any): string {
  let html = '';
  
  // Common sections - customer and vehicle
  if (data.customer) {
    html += `
      <div class="section">
        <div class="section-title">Datos del Cliente</div>
        <table>
          ${data.customer.first_name ? `
          <tr>
            <td>Nombre:</td>
            <td>${data.customer.first_name} ${data.customer.last_name || ''}</td>
          </tr>
          ` : ''}
          ${data.customer.rut ? `
          <tr>
            <td>RUT:</td>
            <td>${data.customer.rut}</td>
          </tr>
          ` : ''}
          ${data.customer.email ? `
          <tr>
            <td>Email:</td>
            <td>${data.customer.email}</td>
          </tr>
          ` : ''}
          ${data.customer.phone ? `
          <tr>
            <td>Teléfono:</td>
            <td>${data.customer.phone}</td>
          </tr>
          ` : ''}
          ${data.customer.address ? `
          <tr>
            <td>Dirección:</td>
            <td>${data.customer.address}</td>
          </tr>
          ` : ''}
        </table>
      </div>
    `;
  }
  
  if (data.vehicle) {
    html += `
      <div class="section">
        <div class="section-title">Datos del Vehículo</div>
        <table>
          <tr>
            <td>Marca:</td>
            <td>${data.vehicle.brand?.name || 'No especificado'}</td>
          </tr>
          <tr>
            <td>Modelo:</td>
            <td>${data.vehicle.model?.name || 'No especificado'}</td>
          </tr>
          <tr>
            <td>Año:</td>
            <td>${data.vehicle.year || 'No especificado'}</td>
          </tr>
          <tr>
            <td>Color:</td>
            <td>${data.vehicle.color?.name || 'No especificado'}</td>
          </tr>
          <tr>
            <td>Kilometraje:</td>
            <td>${data.vehicle.mileage ? `${data.vehicle.mileage.toLocaleString()} km` : 'No especificado'}</td>
          </tr>
          <tr>
            <td>Patente:</td>
            <td>${data.vehicle.license_plate || 'No especificado'}</td>
          </tr>
        </table>
      </div>
    `;
  }
  
  // Type-specific content
  switch (type) {
    case 'sale':
      if (template.show_price_breakdown && data.totals) {
        html += `
          <div class="section">
            <div class="section-title">Desglose de Precio</div>
            <table>
              <tr>
                <td>Precio Base:</td>
                <td>$${formatNumber(data.totals.vehiclePrice)}</td>
              </tr>
              ${data.totals.additionalIncome > 0 ? `
              <tr>
                <td>Servicios Adicionales:</td>
                <td>$${formatNumber(data.totals.additionalIncome)}</td>
              </tr>
              ` : ''}
              ${data.totals.additionalExpenses > 0 ? `
              <tr>
                <td>Descuentos:</td>
                <td>-$${formatNumber(data.totals.additionalExpenses)}</td>
              </tr>
              ` : ''}
              <tr>
                <td><strong>Precio Total:</strong></td>
                <td><strong>$${formatNumber(data.totals.grandTotal)}</strong></td>
              </tr>
            </table>
          </div>
        `;
      }
      
      if (template.show_payment_details && data.saleData) {
        html += `
          <div class="section">
            <div class="section-title">Detalles del Pago</div>
            <table>
              <tr>
                <td>Método de Pago:</td>
                <td>${getPaymentMethodLabel(data.saleData.payment_method) || 'No especificado'}</td>
              </tr>
              <tr>
                <td>Fecha de Venta:</td>
                <td>${data.saleData.sale_date ? new Date(data.saleData.sale_date).toLocaleDateString() : 'No especificada'}</td>
              </tr>
            </table>
          </div>
        `;
      }
      break;
      
    case 'purchase':
      if (template.show_seller_details && data.customerData) {
        html += `
          <div class="section">
            <div class="section-title">Detalles del Vendedor</div>
            <p>El vehículo fue adquirido de ${data.customerData.first_name} ${data.customerData.last_name || ''} con RUT ${data.customerData.rut || 'no especificado'}.</p>
          </div>
        `;
      }
      
      if (template.show_purchase_conditions && data.purchaseData) {
        html += `
          <div class="section">
            <div class="section-title">Condiciones de Compra</div>
            <table>
              <tr>
                <td>Precio de Compra:</td>
                <td>$${formatNumber(data.purchaseData.purchase_price)}</td>
              </tr>
              <tr>
                <td>Fecha de Compra:</td>
                <td>${data.purchaseData.purchase_date ? new Date(data.purchaseData.purchase_date).toLocaleDateString() : 'No especificada'}</td>
              </tr>
              <tr>
                <td>Método de Pago:</td>
                <td>${getPaymentMethodLabel(data.purchaseData.payment_method) || 'No especificado'}</td>
              </tr>
            </table>
          </div>
        `;
      }
      break;
    
    case 'consignment':
      if (template.show_pricing_details && data.consignmentData) {
        html += `
          <div class="section">
            <div class="section-title">Detalles de la Consignación</div>
            <table>
              <tr>
                <td>Precio Acordado:</td>
                <td>$${formatNumber(data.consignmentData.agreed_price)}</td>
              </tr>
              <tr>
                <td>Fecha de Consignación:</td>
                <td>${data.documentData?.created_at ? new Date(data.documentData.created_at).toLocaleDateString() : 'No especificada'}</td>
              </tr>
            </table>
          </div>
        `;
      }
      
      if (template.show_commission_structure) {
        html += `
          <div class="section">
            <div class="section-title">Estructura de Comisiones</div>
            <p>La empresa cobrará una comisión sobre el precio final de venta según los términos acordados.</p>
          </div>
        `;
      }
      break;
      
    case 'reservation':
      if (template.show_expiration_details && data.reservationData) {
        html += `
          <div class="section">
            <div class="section-title">Detalles de la Reserva</div>
            <table>
              <tr>
                <td>Monto de Reserva:</td>
                <td>$${formatNumber(data.reservationData.reservation_amount)}</td>
              </tr>
              <tr>
                <td>Fecha de Reserva:</td>
                <td>${data.reservationData.reservation_date ? new Date(data.reservationData.reservation_date).toLocaleDateString() : 'No especificada'}</td>
              </tr>
              <tr>
                <td>Fecha de Expiración:</td>
                <td>${data.reservationData.expiration_date ? new Date(data.reservationData.expiration_date).toLocaleDateString() : 'No especificada'}</td>
              </tr>
            </table>
          </div>
        `;
      }
      
      if (template.show_payment_instructions) {
        html += `
          <div class="section">
            <div class="section-title">Instrucciones de Pago</div>
            <p>El pago de la reserva debe ser realizado según las instrucciones proporcionadas. El saldo restante deberá ser pagado al momento de completar la compra.</p>
          </div>
        `;
      }
      break;
      
    case 'quotation':
      if (data.quotationData) {
        html += `
          <div class="section">
            <div class="section-title">Cotización</div>
            <table>
              <tr>
                <td>Precio Estimado:</td>
                <td>$${formatNumber(data.quotationData.estimated_price)}</td>
              </tr>
              <tr>
                <td>Fecha de Cotización:</td>
                <td>${data.quotationData.quotation_date ? new Date(data.quotationData.quotation_date).toLocaleDateString() : 'No especificada'}</td>
              </tr>
            </table>
          </div>
        `;
      }
      
      if (template.show_validity_period && data.quotationData) {
        html += `
          <div class="section">
            <div class="section-title">Validez de la Cotización</div>
            <p>Esta cotización tiene validez de ${data.quotationData.validity_period || '15 días'} a partir de la fecha de emisión.</p>
          </div>
        `;
      }
      
      if (template.show_payment_options) {
        html += `
          <div class="section">
            <div class="section-title">Opciones de Pago</div>
            <p>Ofrecemos varias opciones de financiamiento y formas de pago. Consulte con nuestro equipo de ventas para más detalles.</p>
          </div>
        `;
      }
      break;
  }
  
  // Add notes if available
  if (data.documentData?.notes) {
    html += `
      <div class="section">
        <div class="section-title">Notas</div>
        <p>${data.documentData.notes}</p>
      </div>
    `;
  }
  
  return html;
}

// Helper to get legal text
function getLegalText(type: TemplateType, template: any): string {
  switch (type) {
    case 'sale':
      return template.terms_and_conditions || 'Los términos y condiciones generales de venta aplican a esta transacción.';
    case 'purchase':
      return template.purchase_terms || 'Los términos y condiciones generales de compra aplican a esta transacción.';
    case 'consignment':
      return template.consignment_terms || 'Los términos y condiciones generales de consignación aplican a este acuerdo.';
    case 'reservation':
      return template.reservation_terms || 'Los términos y condiciones generales de reserva aplican a este acuerdo.';
    case 'quotation':
      return template.quotation_terms || 'Esta cotización está sujeta a cambios sin previo aviso y a disponibilidad de inventario.';
    default:
      return 'Términos y condiciones generales aplicables.';
  }
}

// Number formatter
function formatNumber(num: number | string | undefined): string {
  if (num === undefined || num === null) return '0';
  const numValue = typeof num === 'string' ? parseFloat(num) : num;
  return numValue.toLocaleString('es-CL');
}
