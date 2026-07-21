import { queryVehiclesTool } from './read/queryVehicles';
import { queryLeadsTool } from './read/queryLeads';
import { queryCustomersTool } from './read/queryCustomers';
import { querySalesTool } from './read/querySales';
import { queryFinancingTool } from './read/queryFinancing';
import { queryTeamTool } from './read/queryTeam';
import { queryDocumentsTool } from './read/queryDocuments';
import { queryAppointmentsTool } from './read/queryAppointments';
import { queryMarketingTool } from './read/queryMarketing';
import { queryExpensesTool } from './read/queryExpenses';
import { queryConfigTool } from './read/queryConfig';
import { appraiseVehicleTool } from './read/appraiseVehicle';
import { createTaskTool } from './write/createTask';
import { updateVehiclePriceTool } from './write/updateVehiclePrice';
import { updateLeadStatusTool } from './write/updateLeadStatus';
import { createQuotationTool } from './write/createQuotation';
import { createReservationTool } from './write/createReservation';
import { updateVehicleStatusTool } from './write/updateVehicleStatus';
import { createCustomerTool } from './write/createCustomer';

export const allTools = {
  query_vehicles: queryVehiclesTool,
  query_leads: queryLeadsTool,
  query_customers: queryCustomersTool,
  query_sales: querySalesTool,
  query_financing: queryFinancingTool,
  query_team: queryTeamTool,
  query_documents: queryDocumentsTool,
  query_appointments: queryAppointmentsTool,
  query_marketing: queryMarketingTool,
  query_expenses: queryExpensesTool,
  query_config: queryConfigTool,
  appraise_vehicle: appraiseVehicleTool,
  create_task: createTaskTool,
  update_vehicle_price: updateVehiclePriceTool,
  update_lead_status: updateLeadStatusTool,
  create_quotation: createQuotationTool,
  create_reservation: createReservationTool,
  update_vehicle_status: updateVehicleStatusTool,
  create_customer: createCustomerTool,
};
