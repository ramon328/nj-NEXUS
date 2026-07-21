interface MediaResponse {
  id?: string;
  error?: any;
}

interface CarouselResponse {
  id?: string;
  error?: any;
}

interface StatusResponse {
  status_code?: string;
  error?: any;
}

interface TokenResponse {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  error?: any;
}

export async function exchangeToken(
  shortLivedToken: string,
  appSecret: string
): Promise<TokenResponse> {
  console.log('Exchanging short-lived token for long-lived token');

  // Instagram Platform API uses graph.instagram.com for token exchange
  const url = `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${appSecret}&access_token=${shortLivedToken}`;
  console.log('Trying token exchange URL: https://graph.instagram.com/access_token');

  const response = await fetch(url);
  const data = await response.json();
  console.log('Exchange token response:', response.status, JSON.stringify(data));

  return data;
}

export async function createMediaContainer(
  accountId: string,
  imageUrl: string,
  accessToken: string,
  caption?: string,
  isCarouselItem = false
): Promise<MediaResponse> {
  console.log('Creating media container for image:', imageUrl);
  console.log('Account ID:', accountId, 'isCarouselItem:', isCarouselItem);

  const MAX_RETRIES = 3;
  const RETRY_DELAY_MS = 3000;

  // Instagram Platform API (Instagram Business Login) uses graph.instagram.com
  const urls = [
    `https://graph.instagram.com/v21.0/${accountId}/media`,
    `https://graph.instagram.com/v20.0/${accountId}/media`,
  ];

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    for (const url of urls) {
      console.log(`Trying URL (attempt ${attempt}/${MAX_RETRIES}):`, url);

      const formData = new URLSearchParams();
      formData.append('image_url', imageUrl);
      formData.append('access_token', accessToken);
      if (caption) {
        formData.append('caption', caption);
      }
      if (isCarouselItem) {
        formData.append('is_carousel_item', 'true');
      }

      console.log('Request body:', formData.toString().substring(0, 200) + '...');

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: formData.toString(),
        });

        const responseText = await response.text();
        console.log('Raw response from', url, ':', response.status, responseText);

        let data;
        try {
          data = JSON.parse(responseText);
        } catch {
          data = { error: { message: responseText } };
        }
        console.log('Parsed response:', JSON.stringify(data));

        // If we got a valid response (even an error), check if it's not "Unsupported request"
        if (!data.error || !data.error.message?.includes('Unsupported request')) {
          // Retry on transient errors from Instagram (code 2, is_transient: true)
          if (data.error?.is_transient && attempt < MAX_RETRIES) {
            console.warn(`Transient error from Instagram (attempt ${attempt}/${MAX_RETRIES}), retrying in ${RETRY_DELAY_MS}ms...`);
            await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
            break; // Break inner URL loop to retry from first URL
          }
          return data;
        }
      } catch (e) {
        console.error('Error with URL', url, ':', e.message);
      }
    }
  }

  // If all URLs failed, return the last error
  return { error: { message: 'All API URL formats failed with Unsupported request error' } };
}

// Publish a single image post (when only 1 image is available)
export async function publishSingleImage(
  accountId: string,
  creationId: string,
  accessToken: string
): Promise<MediaResponse> {
  console.log('Publishing single image with creation ID:', creationId);

  const formData = new URLSearchParams();
  formData.append('creation_id', creationId);
  formData.append('access_token', accessToken);

  // Instagram Platform API uses graph.instagram.com
  const urls = [
    `https://graph.instagram.com/v21.0/${accountId}/media_publish`,
    `https://graph.instagram.com/v20.0/${accountId}/media_publish`,
  ];

  for (const url of urls) {
    console.log('Trying publish URL:', url);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });

      const data = await response.json();
      console.log('Response from', url, ':', response.status, JSON.stringify(data));

      if (!data.error || !data.error.message?.includes('Unsupported request')) {
        return data;
      }
    } catch (e) {
      console.error('Error with URL', url, ':', e.message);
    }
  }

  return { error: { message: 'All publish URL formats failed' } };
}

export async function createCarouselContainer(
  accountId: string,
  caption: string,
  childrenIds: string[],
  accessToken: string
): Promise<CarouselResponse> {
  console.log('Creating carousel container with children:', childrenIds);

  const formData = new URLSearchParams();
  formData.append('media_type', 'CAROUSEL');
  formData.append('caption', caption);
  formData.append('children', childrenIds.join(','));
  formData.append('access_token', accessToken);

  // Instagram Platform API uses graph.instagram.com
  const urls = [
    `https://graph.instagram.com/v21.0/${accountId}/media`,
    `https://graph.instagram.com/v20.0/${accountId}/media`,
  ];

  for (const url of urls) {
    console.log('Trying carousel container URL:', url);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });

      const data = await response.json();
      console.log('Response from', url, ':', response.status, JSON.stringify(data));

      if (!data.error || !data.error.message?.includes('Unsupported request')) {
        return data;
      }
    } catch (e) {
      console.error('Error with URL', url, ':', e.message);
    }
  }

  return { error: { message: 'All carousel container URL formats failed' } };
}

export async function checkContainerStatus(
  containerId: string,
  accessToken: string
): Promise<StatusResponse> {
  // Instagram Platform API uses graph.instagram.com
  const urls = [
    `https://graph.instagram.com/v21.0/${containerId}?fields=status_code&access_token=${accessToken}`,
    `https://graph.instagram.com/v20.0/${containerId}?fields=status_code&access_token=${accessToken}`,
  ];

  for (const url of urls) {
    try {
      console.log('Checking container status with URL:', url.split('?')[0]);
      const response = await fetch(url);
      const data = await response.json();

      if (!data.error) {
        return data;
      }

      // If "Unsupported request", try next URL
      if (data.error.message?.includes('Unsupported request')) {
        continue;
      }

      // Other errors - assume FINISHED
      console.warn('Could not check container status, assuming FINISHED:', data.error);
      return { status_code: 'FINISHED' };
    } catch (error) {
      console.warn('Error checking container status:', error.message);
    }
  }

  // If all URLs failed, assume FINISHED
  console.warn('All status check URLs failed, assuming FINISHED');
  return { status_code: 'FINISHED' };
}

export async function publishCarousel(
  accountId: string,
  creationId: string,
  accessToken: string
): Promise<MediaResponse> {
  console.log('Publishing carousel with creation ID:', creationId);

  const formData = new URLSearchParams();
  formData.append('creation_id', creationId);
  formData.append('access_token', accessToken);

  // Instagram Platform API uses graph.instagram.com
  const urls = [
    `https://graph.instagram.com/v21.0/${accountId}/media_publish`,
    `https://graph.instagram.com/v20.0/${accountId}/media_publish`,
  ];

  for (const url of urls) {
    console.log('Trying carousel publish URL:', url);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });

      const data = await response.json();
      console.log('Response from', url, ':', response.status, JSON.stringify(data));

      if (!data.error || !data.error.message?.includes('Unsupported request')) {
        return data;
      }
    } catch (e) {
      console.error('Error with URL', url, ':', e.message);
    }
  }

  return { error: { message: 'All carousel publish URL formats failed' } };
}

// Orquesta el flujo completo de publicación (single o carrusel) y devuelve el id
// del post publicado, o lanza Error con el mensaje. Reutilizado por la edge
// function on-demand (create-instagram-post) y por el procesador programado
// (process-scheduled-instagram). Máximo 10 imágenes.
export async function publishToInstagram(
  accountId: string,
  accessToken: string,
  imageUrls: string[],
  description: string
): Promise<{ id: string }> {
  const urls = (imageUrls || []).slice(0, 10);
  if (urls.length === 0) {
    throw new Error('No hay imágenes para publicar');
  }

  let publishData: MediaResponse;

  if (urls.length === 1) {
    const media = await createMediaContainer(accountId, urls[0], accessToken, description);
    if (media.error || !media.id) {
      throw new Error(media.error?.message || 'No se pudo crear el contenedor de la imagen');
    }
    const status = await checkContainerStatus(media.id, accessToken);
    if (status.status_code && status.status_code !== 'FINISHED') {
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
    publishData = await publishSingleImage(accountId, media.id, accessToken);
  } else {
    const children = await Promise.all(
      urls.map((u) => createMediaContainer(accountId, u, accessToken, undefined, true))
    );
    const failed = children.find((c) => c.error || !c.id);
    if (failed) {
      throw new Error(failed.error?.message || 'No se pudo crear el contenedor del carrusel');
    }
    const childrenIds = children.map((c) => c.id as string);
    const carousel = await createCarouselContainer(accountId, description, childrenIds, accessToken);
    if (carousel.error || !carousel.id) {
      throw new Error(carousel.error?.message || 'No se pudo crear el carrusel');
    }
    const status = await checkContainerStatus(carousel.id, accessToken);
    if (status.status_code && status.status_code !== 'FINISHED') {
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
    publishData = await publishCarousel(accountId, carousel.id, accessToken);
  }

  if (publishData.error || !publishData.id) {
    throw new Error(publishData.error?.message || 'No se pudo publicar la publicación');
  }
  return { id: publishData.id };
}
