# API de Vehículos para WordPress

Esta Edge Function proporciona una API REST para que WordPress pueda obtener la lista de vehículos de un concesionario específico.

## URL del Endpoint

```
GET https://tu-proyecto.supabase.co/functions/v1/get-vehicles-wordpress
```

## Parámetros Requeridos

| Parámetro   | Tipo   | Descripción                              |
| ----------- | ------ | ---------------------------------------- |
| `client_id` | number | ID del cliente/concesionario (requerido) |

## Parámetros Opcionales

| Parámetro | Tipo   | Valor por defecto | Descripción                              |
| --------- | ------ | ----------------- | ---------------------------------------- |
| `page`    | number | 1                 | Número de página (mínimo 1)              |
| `limit`   | number | 10                | Cantidad de vehículos por página (1-100) |

## Ejemplo de Uso

```bash
# Obtener la primera página con 10 vehículos
curl "https://tu-proyecto.supabase.co/functions/v1/get-vehicles-wordpress?client_id=123"

# Obtener la segunda página con 20 vehículos
curl "https://tu-proyecto.supabase.co/functions/v1/get-vehicles-wordpress?client_id=123&page=2&limit=20"
```

## Respuesta de la API

### Respuesta exitosa (200)

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "marca": "Toyota",
      "modelo": "Corolla",
      "version": "XEI 1.8",
      "año": 2020,
      "precio": 15000000,
      "kms": 25000,
      "main_image_url": "https://example.com/image.jpg"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 45,
    "totalPages": 5
  }
}
```

### Campos de respuesta

| Campo            | Tipo              | Descripción                           |
| ---------------- | ----------------- | ------------------------------------- |
| `id`             | number            | ID único del vehículo                 |
| `marca`          | string            | Nombre de la marca del vehículo       |
| `modelo`         | string            | Nombre del modelo del vehículo        |
| `version`        | string (opcional) | Versión específica del vehículo       |
| `año`            | number            | Año del vehículo                      |
| `precio`         | number            | Precio del vehículo en pesos chilenos |
| `kms`            | number            | Kilometraje del vehículo              |
| `main_image_url` | string (opcional) | URL de la imagen principal            |

### Respuestas de error

#### Client ID requerido (400)

```json
{
  "success": false,
  "message": "client_id parameter is required"
}
```

#### Client ID inválido (404)

```json
{
  "success": false,
  "message": "Invalid client_id"
}
```

#### Parámetros de paginación inválidos (400)

```json
{
  "success": false,
  "message": "page must be greater than 0"
}
```

```json
{
  "success": false,
  "message": "limit must be between 1 and 100"
}
```

#### Error del servidor (500)

```json
{
  "success": false,
  "message": "Internal server error"
}
```

## Filtros Aplicados

La API solo devuelve vehículos que cumplan con las siguientes condiciones:

- Pertenecen al cliente especificado (`client_id`)
- Tienen estado "Publicado" (`status.name = 'Publicado'`)

## Ordenamiento

Los vehículos se devuelven ordenados por fecha de creación, del más reciente al más antiguo.

## Nota sobre Paginación

**Importante:** Actualmente la paginación está temporalmente deshabilitada y se devuelven todos los vehículos que cumplan con los filtros. Los parámetros `page` y `limit` son aceptados pero no están aplicándose en la consulta por el momento.

## Autenticación

La API no requiere autenticación adicional, solo es necesario proporcionar un `client_id` válido.

## Límites de Uso

- Máximo 100 vehículos por página
- La API está protegida por CORS y permite solicitudes desde cualquier origen

## Ejemplo de integración en WordPress

```php
<?php
function get_vehicles_from_api($client_id, $page = 1, $limit = 10) {
    $url = "https://tu-proyecto.supabase.co/functions/v1/get-vehicles-wordpress";
    $url .= "?client_id=" . $client_id . "&page=" . $page . "&limit=" . $limit;

    $response = wp_remote_get($url);

    if (is_wp_error($response)) {
        return false;
    }

    $body = wp_remote_retrieve_body($response);
    $data = json_decode($body, true);

    if ($data['success']) {
        return $data;
    }

    return false;
}

// Uso
$vehicles_data = get_vehicles_from_api(123, 1, 20);
if ($vehicles_data) {
    foreach ($vehicles_data['data'] as $vehicle) {
        echo "<h3>{$vehicle['marca']} {$vehicle['modelo']}</h3>";
        echo "<p>Año: {$vehicle['año']}</p>";
        echo "<p>Precio: $" . number_format($vehicle['precio']) . "</p>";
        echo "<p>Kilometraje: " . number_format($vehicle['kms']) . " km</p>";
        if ($vehicle['main_image_url']) {
            echo "<img src='{$vehicle['main_image_url']}' alt='Imagen del vehículo'>";
        }
    }
}
?>
```
