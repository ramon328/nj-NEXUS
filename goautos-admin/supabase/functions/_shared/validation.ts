export function validateRequest(
  vehicle: any | null,
  description: string | null,
  clientId: string | null
): string | null {
  if (!vehicle || !description || !clientId) {
    return "Missing required fields";
  }

  const hasMainImage = !!vehicle.main_image;
  const hasGalleryImages = vehicle.gallery && vehicle.gallery.length > 0;

  if (!hasMainImage && !hasGalleryImages) {
    return "Vehicle must have at least one image to post to Instagram";
  }

  return null;
}

