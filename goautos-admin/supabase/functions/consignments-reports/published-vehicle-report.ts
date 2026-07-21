// @ts-ignore: Import types but ignore TS errors for Deno environment
import { Vehicle } from '../_shared/types.ts';
// Assuming formatNumber will be in a utils.ts

export function generatePublishedVehicleHtml(
  vehicle: Vehicle,
  consignment: any, // Debería ser VehicleConsignment pero simplificando por ahora
  vehicleName: string
): string {
  return `
    <div style="background-color: #e8f5e9; padding: 15px; border-radius: 5px; margin-top: 15px;">
      <h3 style="color: #2e7d32; margin-top: 0;">¡Tu vehículo está publicado!</h3>
      <p>Tu vehículo ha sido visto <strong>${
        vehicle.views || 0
      }</strong> veces desde su publicación.</p>
      <p>Estamos trabajando activamente para encontrar compradores interesados.</p>
      ${
        vehicle.main_image
          ? `<div style="text-align: center; margin-top: 10px;">
          <img src="${vehicle.main_image}" alt="${vehicleName}" style="max-width: 100%; border-radius: 5px;" />
        </div>`
          : ''
      }
    </div>
  `;
}
