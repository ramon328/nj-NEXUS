# Facebook Marketplace — Guia de Integracion

## Como funciona

La API de Facebook **no permite publicar directamente en Marketplace** como lo haria una persona desde su celular. Facebook ofrece a los negocios un sistema basado en **Catalogos de Productos** a traves de su plataforma **Meta Business** (Commerce Manager).

### El flujo real

```
Tu inventario en GoAutos
        |
        v
Catalogo de Productos (Meta Business)
        |
        v
Facebook decide donde mostrarlo:
  - Marketplace
  - Instagram Shopping
  - Anuncios dinamicos
```

Cuando conectas tu cuenta, lo que sucede es:

1. Se crea un **catalogo de vehiculos** dentro de tu Facebook Business Manager
2. Tus vehiculos se suben como **productos** a ese catalogo (con fotos, precio, kilometraje, transmision, etc.)
3. Facebook toma esos productos y los **distribuye en sus plataformas** — principalmente Marketplace

Los vehiculos no se "postean" como una publicacion manual. Se agregan a tu catalogo comercial y Facebook se encarga de mostrarlos.

### Que significa en la practica

| Caracteristica | Detalle |
|---|---|
| Tipo de publicacion | Listado comercial (de negocio), no de persona natural |
| Badge | Aparece con el sello de negocio verificado |
| Capacidad | Hasta 100 vehiculos por carga |
| Control | Pausar, reactivar o eliminar desde GoAutos sin entrar a Facebook |
| Bonus | El catalogo tambien sirve para **anuncios dinamicos** — Facebook muestra tus vehiculos como publicidad a personas buscando autos similares |

### Requisitos

Para poder usar la integracion, necesitas:

- Una cuenta de **Facebook Business Manager** (Meta Business Suite)
- Una **Pagina de Facebook** asociada a tu negocio
- Autorizar los permisos cuando se conecte la cuenta

### El token de acceso

La conexion usa un token que dura **60 dias**. El sistema te avisa 7 dias antes de que expire para que lo renueves con un solo click. Si se vence sin renovar, solo hay que reconectarse.

---

## Como usarlo

### Paso 1 — Conectar tu cuenta

1. Ve a **Facebook Marketplace** en el menu lateral
2. Haz click en **Conectar Facebook Business**
3. Se abrira Facebook pidiendo que autorices la app
4. Selecciona tu cuenta de Business Manager y acepta los permisos
5. Listo — veras tu negocio conectado con el nombre del catalogo creado

> Si ya tenias un catalogo llamado "GoAuto" en tu Business Manager, se reutiliza automaticamente.

### Paso 2 — Publicar vehiculos

1. En la pestana **Agregar**, veras todos tus vehiculos disponibles
   - Los que ya estan publicados aparecen deshabilitados
   - Los vehiculos vendidos no aparecen
2. Selecciona los vehiculos que quieras publicar (puedes usar "Seleccionar todos")
3. Haz click en **Agregar X vehiculos**
4. Espera a que termine el proceso — veras cuantos se publicaron correctamente

Cada vehiculo se sube con:
- Titulo (Ano + Marca + Modelo)
- Precio en CLP
- Hasta 10 fotos
- Kilometraje, transmision, combustible, color, tipo de carroceria
- Link a tu sitio web

### Paso 3 — Gestionar publicaciones

En la pestana **En catalogo** puedes ver y controlar todas tus publicaciones:

| Accion | Que hace |
|---|---|
| **Pausar** | Marca el vehiculo como "sin stock" en Facebook. No se elimina, solo deja de mostrarse |
| **Reactivar** | Vuelve a mostrar un vehiculo pausado |
| **Eliminar** | Borra el vehiculo del catalogo de Facebook permanentemente |
| **Ver en Facebook** | Abre el listado directamente en Marketplace |

Tambien puedes hacer click en **Sincronizar** para actualizar los estados desde Facebook (por si algo cambio desde alla).

### Paso 4 — Renovar el token

Cuando falten 7 dias para que expire tu conexion, veras un aviso en la parte superior de la pagina.

1. Haz click en **Renovar token**
2. Se extiende automaticamente por otros 60 dias
3. No necesitas volver a conectar tu cuenta

Si el token expira sin renovar:
- La integracion se marca como "expirada"
- Tus publicaciones existentes siguen en Facebook, pero no podras gestionar ni agregar nuevas
- Solo necesitas hacer click en **Reconectar** para volver a activarla

---

## Preguntas frecuentes

**Los vehiculos aparecen inmediatamente en Marketplace?**
Facebook procesa los productos del catalogo de forma asincrona. Generalmente aparecen en minutos, pero puede tardar hasta unas horas.

**Puedo publicar el mismo vehiculo varias veces?**
No. El sistema detecta si un vehiculo ya esta publicado y no permite duplicados.

**Si vendo un vehiculo, se baja automaticamente de Facebook?**
No de forma automatica. Debes pausarlo o eliminarlo desde la pestana "En catalogo". Recomendamos pausarlo al momento de la venta.

**Necesito una Pagina de Facebook?**
Si. La integracion funciona a traves de una Pagina de Facebook vinculada a tu Business Manager.

**Cuantos vehiculos puedo subir?**
Hasta 100 por cada carga. No hay limite total en el catalogo.
