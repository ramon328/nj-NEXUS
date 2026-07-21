// Enum de todos los permisos disponibles en el sistema
export enum PermissionCode {
  // Dashboard
  DASHBOARD_VIEW = 'dashboard.view',
  DASHBOARD_VIEW_SELLER = 'dashboard.view_seller',
  DASHBOARD_VIEW_FULL = 'dashboard.view_full',

  // Dashboard — tabs granulares
  DASHBOARD_TAB_COMERCIAL = 'dashboard.tab.comercial',
  DASHBOARD_TAB_INVENTARIO = 'dashboard.tab.inventario',
  DASHBOARD_TAB_WEB = 'dashboard.tab.web',
  DASHBOARD_TAB_VENDEDORES = 'dashboard.tab.vendedores',

  // Dashboard — widgets comercial
  DASHBOARD_COMERCIAL_VENTAS = 'dashboard.comercial.ventas_totales',
  DASHBOARD_COMERCIAL_GASTOS = 'dashboard.comercial.gastos_totales',
  DASHBOARD_COMERCIAL_MARGEN = 'dashboard.comercial.margen_bruto',
  DASHBOARD_COMERCIAL_INVENTARIO = 'dashboard.comercial.valor_inventario',
  DASHBOARD_COMERCIAL_RENDIMIENTO = 'dashboard.comercial.rendimiento',
  DASHBOARD_COMERCIAL_ALERTAS = 'dashboard.comercial.alertas',
  DASHBOARD_COMERCIAL_RESUMEN_COMERCIAL = 'dashboard.comercial.resumen_comercial',
  DASHBOARD_COMERCIAL_RESUMEN_VENTAS = 'dashboard.comercial.resumen_ventas',
  DASHBOARD_COMERCIAL_RESUMEN_COSTOS = 'dashboard.comercial.resumen_costos',

  // Documentos
  DOCUMENTS_VIEW = 'documents.view',
  DOCUMENTS_CREATE = 'documents.create',
  DOCUMENTS_DELETE = 'documents.delete',

  // Vehiculos
  VEHICLES_VIEW = 'vehicles.view',
  VEHICLES_CREATE = 'vehicles.create',
  VEHICLES_EDIT = 'vehicles.edit',
  VEHICLES_DELETE = 'vehicles.delete',
  // Vehiculos — detalle (secciones sensibles)
  VEHICLES_VIEW_PURCHASE_PRICE = 'vehicles.view_purchase_price',
  VEHICLES_VIEW_FINANCIAL_SUMMARY = 'vehicles.view_financial_summary',

  // Tasador
  APPRAISER_VIEW = 'appraiser.view',

  // Marketing
  MARKETING_VIEW = 'marketing.view',

  // Instagram
  INSTAGRAM_VIEW = 'instagram.view',

  // Mercado Libre
  MERCADOLIBRE_VIEW = 'mercadolibre.view',

  // Facebook
  FACEBOOK_VIEW = 'facebook.view',

  // ChileAutos
  CHILEAUTOS_VIEW = 'chileautos.view',

  // Leads
  LEADS_VIEW = 'leads.view',
  LEADS_MANAGE = 'leads.manage',

  // Clientes
  CLIENTS_VIEW = 'clients.view',
  CLIENTS_CREATE = 'clients.create',
  CLIENTS_EDIT = 'clients.edit',

  // Ventas
  SALES_VIEW = 'sales.view',
  SALES_CREATE = 'sales.create',
  SALES_EDIT = 'sales.edit',

  // Financiamiento
  FINANCING_VIEW = 'financing.view',

  // Agendamientos
  SCHEDULING_VIEW = 'scheduling.view',

  // Configuracion
  CONFIGURATION_VIEW = 'configuration.view',
  CONFIGURATION_EDIT = 'configuration.edit',

  // Equipo
  TEAM_VIEW = 'team.view',
  TEAM_MANAGE = 'team.manage',

  // Roles
  ROLES_MANAGE = 'roles.manage',

  // Sedes / Sucursales
  // Ver datos de todas las sedes aunque el usuario tenga sedes asignadas.
  // Sin este permiso, un usuario con sedes asignadas queda restringido a su(s) sede(s).
  DEALERSHIPS_VIEW_ALL = 'dealerships.view_all',

  // Builder
  BUILDER_VIEW = 'builder.view',

  // Novedades
  UPDATES_VIEW = 'updates.view',

  // Notificaciones
  NOTIFICATIONS_VIEW = 'notifications.view',
  NOTIFICATIONS_CREATE = 'notifications.create',

  // Solicitudes de Vehiculos
  VEHICLE_REQUESTS_VIEW = 'vehicle_requests.view',
  VEHICLE_REQUESTS_CREATE = 'vehicle_requests.create',
  VEHICLE_REQUESTS_MANAGE = 'vehicle_requests.manage',

  // Asistente IA
  AI_ASSISTANT_VIEW = 'ai_assistant.view',

  // Tareas
  TASKS_VIEW = 'tasks.view',
  TASKS_CREATE = 'tasks.create',
  TASKS_MANAGE = 'tasks.manage',
  TASKS_APPROVE = 'tasks.approve',

  // Calendario
  CALENDAR_VIEW = 'calendar.view',
  CALENDAR_CREATE = 'calendar.create',
  CALENDAR_MANAGE = 'calendar.manage',
}

// Interfaz para un permiso de la base de datos
export interface Permission {
  id: number;
  code: PermissionCode;
  name: string;
  description?: string;
  category: string;
  created_at?: string;
}

// Interfaz para un rol de la base de datos
export interface Role {
  id: number;
  client_id: number;
  name: string;
  description?: string;
  is_system_role: boolean;
  parent_role_id?: number | null;
  permissions: PermissionCode[];
  created_at?: string;
  updated_at?: string;
}

// Datos para crear/editar un rol
export interface RoleFormData {
  name: string;
  description?: string;
  parent_role_id?: number | null;
  permissions: PermissionCode[];
}

// Mapeo de rutas a permisos requeridos
// Nota: El dashboard básico ('/') no requiere permiso - siempre accesible
export const ROUTE_PERMISSIONS: Record<string, PermissionCode> = {
  '/documentos': PermissionCode.DOCUMENTS_VIEW,
  '/vehiculos': PermissionCode.VEHICLES_VIEW,
  '/vehiculos/agregar': PermissionCode.VEHICLES_CREATE,
  '/vehiculos/editar': PermissionCode.VEHICLES_EDIT,
  '/tasador': PermissionCode.APPRAISER_VIEW,
  '/marketing': PermissionCode.MARKETING_VIEW,
  '/instagram': PermissionCode.INSTAGRAM_VIEW,
  '/instagram/messages': PermissionCode.INSTAGRAM_VIEW,
  '/mercadolibre': PermissionCode.MERCADOLIBRE_VIEW,
  '/facebook-marketplace': PermissionCode.FACEBOOK_VIEW,
  '/chileautos': PermissionCode.CHILEAUTOS_VIEW,
  '/leads': PermissionCode.LEADS_VIEW,
  '/clientes': PermissionCode.CLIENTS_VIEW,
  '/ventas': PermissionCode.SALES_VIEW,
  '/financiamiento': PermissionCode.FINANCING_VIEW,
  '/configuracion': PermissionCode.CONFIGURATION_VIEW,
  '/equipo': PermissionCode.TEAM_VIEW,
  '/builder': PermissionCode.BUILDER_VIEW,
  '/novedades': PermissionCode.UPDATES_VIEW,
  '/notificaciones': PermissionCode.NOTIFICATIONS_VIEW,
  '/solicitudes': PermissionCode.VEHICLE_REQUESTS_VIEW,
  '/tareas': PermissionCode.TASKS_VIEW,
  '/calendario': PermissionCode.SCHEDULING_VIEW,
  '/asistente': PermissionCode.AI_ASSISTANT_VIEW,
  '/alertas-inteligentes': PermissionCode.MARKETING_VIEW,
};

// Categorias de permisos para la UI de gestion
// Nota: El dashboard básico siempre está disponible, no requiere permiso
export const PERMISSION_CATEGORIES = {
  dashboard: {
    label: 'Dashboard',
    permissions: [
      PermissionCode.DASHBOARD_VIEW,
      PermissionCode.DASHBOARD_VIEW_SELLER,
      PermissionCode.DASHBOARD_VIEW_FULL,
      PermissionCode.DASHBOARD_TAB_COMERCIAL,
      PermissionCode.DASHBOARD_TAB_INVENTARIO,
      PermissionCode.DASHBOARD_TAB_WEB,
      PermissionCode.DASHBOARD_TAB_VENDEDORES,
      PermissionCode.DASHBOARD_COMERCIAL_VENTAS,
      PermissionCode.DASHBOARD_COMERCIAL_GASTOS,
      PermissionCode.DASHBOARD_COMERCIAL_MARGEN,
      PermissionCode.DASHBOARD_COMERCIAL_INVENTARIO,
      PermissionCode.DASHBOARD_COMERCIAL_RENDIMIENTO,
      PermissionCode.DASHBOARD_COMERCIAL_ALERTAS,
      PermissionCode.DASHBOARD_COMERCIAL_RESUMEN_COMERCIAL,
      PermissionCode.DASHBOARD_COMERCIAL_RESUMEN_VENTAS,
      PermissionCode.DASHBOARD_COMERCIAL_RESUMEN_COSTOS,
    ],
  },
  general: {
    label: 'General',
    permissions: [
      PermissionCode.DOCUMENTS_VIEW,
      PermissionCode.DOCUMENTS_CREATE,
      PermissionCode.DOCUMENTS_DELETE,
      PermissionCode.UPDATES_VIEW,
      PermissionCode.AI_ASSISTANT_VIEW,
    ],
  },
  inventory: {
    label: 'Inventario',
    permissions: [
      PermissionCode.VEHICLES_VIEW,
      PermissionCode.VEHICLES_CREATE,
      PermissionCode.VEHICLES_EDIT,
      PermissionCode.VEHICLES_DELETE,
      PermissionCode.VEHICLES_VIEW_PURCHASE_PRICE,
      PermissionCode.VEHICLES_VIEW_FINANCIAL_SUMMARY,
      PermissionCode.APPRAISER_VIEW,
    ],
  },
  marketing: {
    label: 'Marketing',
    permissions: [
      PermissionCode.MARKETING_VIEW,
      PermissionCode.INSTAGRAM_VIEW,
      PermissionCode.MERCADOLIBRE_VIEW,
      PermissionCode.FACEBOOK_VIEW,
      PermissionCode.CHILEAUTOS_VIEW,
    ],
  },
  commercial: {
    label: 'Comercial',
    permissions: [
      PermissionCode.LEADS_VIEW,
      PermissionCode.LEADS_MANAGE,
      PermissionCode.CLIENTS_VIEW,
      PermissionCode.CLIENTS_CREATE,
      PermissionCode.CLIENTS_EDIT,
      PermissionCode.SALES_VIEW,
      PermissionCode.SALES_CREATE,
      PermissionCode.SALES_EDIT,
      PermissionCode.FINANCING_VIEW,
      PermissionCode.SCHEDULING_VIEW,
    ],
  },
  notifications: {
    label: 'Notificaciones y Solicitudes',
    permissions: [
      PermissionCode.NOTIFICATIONS_VIEW,
      PermissionCode.NOTIFICATIONS_CREATE,
      PermissionCode.VEHICLE_REQUESTS_VIEW,
      PermissionCode.VEHICLE_REQUESTS_CREATE,
      PermissionCode.VEHICLE_REQUESTS_MANAGE,
      PermissionCode.TASKS_VIEW,
      PermissionCode.TASKS_CREATE,
      PermissionCode.TASKS_MANAGE,
      PermissionCode.TASKS_APPROVE,
      PermissionCode.CALENDAR_VIEW,
      PermissionCode.CALENDAR_CREATE,
      PermissionCode.CALENDAR_MANAGE,
    ],
  },
  administration: {
    label: 'Administracion',
    permissions: [
      PermissionCode.CONFIGURATION_VIEW,
      PermissionCode.CONFIGURATION_EDIT,
      PermissionCode.TEAM_VIEW,
      PermissionCode.TEAM_MANAGE,
      PermissionCode.ROLES_MANAGE,
      PermissionCode.DEALERSHIPS_VIEW_ALL,
      PermissionCode.BUILDER_VIEW,
    ],
  },
};

// Nombres legibles de los permisos (para la UI)
// Nota: El dashboard básico siempre está disponible para todos los usuarios
export const PERMISSION_LABELS: Record<PermissionCode, string> = {
  [PermissionCode.DASHBOARD_VIEW]: 'Dashboard Avanzado',
  [PermissionCode.DASHBOARD_VIEW_SELLER]: 'Dashboard de Vendedor (rendimiento y comisiones)',
  [PermissionCode.DASHBOARD_VIEW_FULL]: 'Dashboard Completo (métricas avanzadas)',
  [PermissionCode.DASHBOARD_TAB_COMERCIAL]: 'Pestaña Comercial',
  [PermissionCode.DASHBOARD_TAB_INVENTARIO]: 'Pestaña Inventario',
  [PermissionCode.DASHBOARD_TAB_WEB]: 'Pestaña Web',
  [PermissionCode.DASHBOARD_TAB_VENDEDORES]: 'Pestaña Vendedores',
  [PermissionCode.DASHBOARD_COMERCIAL_VENTAS]: 'Ventas Totales',
  [PermissionCode.DASHBOARD_COMERCIAL_GASTOS]: 'Gastos Totales',
  [PermissionCode.DASHBOARD_COMERCIAL_MARGEN]: 'Margen Bruto',
  [PermissionCode.DASHBOARD_COMERCIAL_INVENTARIO]: 'Valor Inventario',
  [PermissionCode.DASHBOARD_COMERCIAL_RENDIMIENTO]: 'Rendimiento del Negocio',
  [PermissionCode.DASHBOARD_COMERCIAL_ALERTAS]: 'Alertas',
  [PermissionCode.DASHBOARD_COMERCIAL_RESUMEN_COMERCIAL]: 'Resumen Comercial',
  [PermissionCode.DASHBOARD_COMERCIAL_RESUMEN_VENTAS]: 'Resumen de Ventas',
  [PermissionCode.DASHBOARD_COMERCIAL_RESUMEN_COSTOS]: 'Resumen de Costos',
  [PermissionCode.DOCUMENTS_VIEW]: 'Ver Documentos',
  [PermissionCode.DOCUMENTS_CREATE]: 'Crear Documentos',
  [PermissionCode.DOCUMENTS_DELETE]: 'Eliminar Documentos',
  [PermissionCode.VEHICLES_VIEW]: 'Ver Vehiculos',
  [PermissionCode.VEHICLES_CREATE]: 'Crear Vehiculos',
  [PermissionCode.VEHICLES_EDIT]: 'Editar Vehiculos',
  [PermissionCode.VEHICLES_DELETE]: 'Eliminar Vehiculos',
  [PermissionCode.VEHICLES_VIEW_PURCHASE_PRICE]: 'Ver precio de compra (detalle vehiculo)',
  [PermissionCode.VEHICLES_VIEW_FINANCIAL_SUMMARY]: 'Ver resumen financiero (detalle vehiculo)',
  [PermissionCode.APPRAISER_VIEW]: 'Ver Tasador',
  [PermissionCode.MARKETING_VIEW]: 'Ver Marketing IA',
  [PermissionCode.INSTAGRAM_VIEW]: 'Ver Instagram',
  [PermissionCode.MERCADOLIBRE_VIEW]: 'Ver Mercado Libre',
  [PermissionCode.FACEBOOK_VIEW]: 'Ver Facebook Marketplace',
  [PermissionCode.CHILEAUTOS_VIEW]: 'Ver ChileAutos',
  [PermissionCode.LEADS_VIEW]: 'Ver Leads',
  [PermissionCode.LEADS_MANAGE]: 'Gestionar Leads',
  [PermissionCode.CLIENTS_VIEW]: 'Ver Clientes',
  [PermissionCode.CLIENTS_CREATE]: 'Crear Clientes',
  [PermissionCode.CLIENTS_EDIT]: 'Editar Clientes',
  [PermissionCode.SALES_VIEW]: 'Ver Ventas',
  [PermissionCode.SALES_CREATE]: 'Crear Ventas',
  [PermissionCode.SALES_EDIT]: 'Editar Ventas',
  [PermissionCode.FINANCING_VIEW]: 'Ver Financiamiento',
  [PermissionCode.SCHEDULING_VIEW]: 'Ver Agendamientos',
  [PermissionCode.CONFIGURATION_VIEW]: 'Ver Configuracion',
  [PermissionCode.CONFIGURATION_EDIT]: 'Editar Configuracion',
  [PermissionCode.TEAM_VIEW]: 'Ver Equipo',
  [PermissionCode.TEAM_MANAGE]: 'Gestionar Equipo',
  [PermissionCode.ROLES_MANAGE]: 'Gestionar Roles',
  [PermissionCode.DEALERSHIPS_VIEW_ALL]: 'Ver todas las sedes',
  [PermissionCode.BUILDER_VIEW]: 'Ver Builder',
  [PermissionCode.UPDATES_VIEW]: 'Ver Novedades',
  [PermissionCode.NOTIFICATIONS_VIEW]: 'Ver Notificaciones',
  [PermissionCode.NOTIFICATIONS_CREATE]: 'Crear Notificaciones',
  [PermissionCode.VEHICLE_REQUESTS_VIEW]: 'Ver Solicitudes de Vehiculos',
  [PermissionCode.VEHICLE_REQUESTS_CREATE]: 'Crear Solicitudes de Vehiculos',
  [PermissionCode.VEHICLE_REQUESTS_MANAGE]: 'Gestionar Solicitudes de Vehiculos',
  [PermissionCode.AI_ASSISTANT_VIEW]: 'Ver Asistente IA',
  [PermissionCode.TASKS_VIEW]: 'Ver Tareas',
  [PermissionCode.TASKS_CREATE]: 'Crear Tareas',
  [PermissionCode.TASKS_MANAGE]: 'Gestionar Tareas',
  [PermissionCode.TASKS_APPROVE]: 'Aprobar/Cancelar Tareas (con toggle de aprobación activo)',
  [PermissionCode.CALENDAR_VIEW]: 'Ver Calendario',
  [PermissionCode.CALENDAR_CREATE]: 'Crear Eventos',
  [PermissionCode.CALENDAR_MANAGE]: 'Gestionar Calendario',
};

// Permisos por defecto para el rol "admin" (todos los permisos)
export const ADMIN_DEFAULT_PERMISSIONS = Object.values(PermissionCode);

// Permisos por defecto para el rol "seller" (acceso completo a vehículos)
export const SELLER_DEFAULT_PERMISSIONS: PermissionCode[] = [
  PermissionCode.DASHBOARD_VIEW,
  PermissionCode.DASHBOARD_VIEW_SELLER,
  PermissionCode.DOCUMENTS_VIEW,
  // Vehículos - acceso completo
  PermissionCode.VEHICLES_VIEW,
  PermissionCode.VEHICLES_CREATE,
  PermissionCode.VEHICLES_EDIT,
  PermissionCode.VEHICLES_DELETE,
  PermissionCode.APPRAISER_VIEW,
  PermissionCode.MARKETING_VIEW,
  PermissionCode.LEADS_VIEW,
  PermissionCode.CLIENTS_VIEW,
  PermissionCode.AI_ASSISTANT_VIEW,
  PermissionCode.TASKS_VIEW,
  PermissionCode.CALENDAR_VIEW,
  PermissionCode.SCHEDULING_VIEW,
];

// Funcion helper para obtener permisos por defecto segun rol legacy
export function getLegacyRolePermissions(rol: string): PermissionCode[] {
  switch (rol) {
    case 'admin':
      return ADMIN_DEFAULT_PERMISSIONS;
    case 'seller':
    case 'vendedor':
      return SELLER_DEFAULT_PERMISSIONS;
    case 'superadmin':
      return ADMIN_DEFAULT_PERMISSIONS; // Superadmin tiene todos pero se maneja diferente
    default:
      return SELLER_DEFAULT_PERMISSIONS;
  }
}
