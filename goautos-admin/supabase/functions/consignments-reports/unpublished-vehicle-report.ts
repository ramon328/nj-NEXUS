// @ts-ignore: Import types but ignore TS errors for Deno environment
import { Vehicle, ClientVehicleStatus } from '../_shared/types.ts';

export function generateUnpublishedVehicleHtml(
  vehicle: Vehicle,
  statuses: ClientVehicleStatus[]
): string {
  const currentStatus = vehicle.status || {
    name: 'En proceso',
    id: 0,
    order: 0,
  };

  let html = `
    <div style="background-color: #f9f9fa; padding: 20px; border-radius: 8px; margin-top: 15px;">
      <h3 style="color: #333; margin-top: 0; font-weight: 500; font-size: 16px;">Progreso: <span style="color: #51bde5; font-weight: 600;">${currentStatus.name}</span></h3>
      <p style="color: #666; margin-bottom: 25px; font-size: 14px;">Estamos procesando tu vehículo para su publicación.</p>
      
      <div style="padding-left: 0;">
  `;

  for (const status of statuses) {
    const statusOrder = status.order || 0;
    const currentStatusOrder = (currentStatus as any).order || 0;

    const isCurrentStatus = status.id === currentStatus.id;
    const statusPassed = statusOrder <= currentStatusOrder;

    let textStyle = 'font-size: 14px; margin-bottom: 10px;';
    let statusNameDisplay = status.name;

    if (isCurrentStatus) {
      textStyle += ' color: #51bde5; font-weight: 600;';
      statusNameDisplay = `${status.name} <span style="font-size: 12px; color: #51bde5; background-color: #fff2e6; padding: 1px 8px; border-radius: 10px; font-weight: normal;">actual</span>`;
    } else if (statusPassed) {
      textStyle += ' color: #9e9e9e; text-decoration: line-through;';
    } else {
      textStyle += ' color: #bdbdbd;'; // Gris más claro para futuros
    }

    html += `
      <div style="${textStyle}">
        ${statusNameDisplay}
      </div>
    `;
  }

  html += `
      </div>
    </div>
  `;
  return html;
}
