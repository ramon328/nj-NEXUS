import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useReservationDocumentData = (
  documentId: number,
  isOpen: boolean
) => {
  const [loading, setLoading] = useState(true);
  const [reservationData, setReservationData] = useState<any>(null);
  const [vehicleData, setVehicleData] = useState<any>(null);
  const [customerData, setCustomerData] = useState<any>(null);
  const [documentData, setDocumentData] = useState<any>(null);
  const [additionalsData, setAdditionalsData] = useState<any[]>([]);
  const { client, clientId } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      if (!documentId || !isOpen) return;

      setLoading(true);
      try {
        // First, fetch the document data
        const { data: docData, error: docError } = await supabase
          .from('vehicles_documents')
          .select('*')
          .eq('id', documentId)
          .single();

        if (docError) {
          console.error('Error fetching document:', docError);
          return;
        }

        // Fetch template terms & conditions based on client id
        let termsAndConditions = '';
        if (client?.id) {
          try {
            const { data: templateData } = await supabase
              .from('document_templates')
              .select('*')
              .eq('client_id', client.id)
              .eq('template_type', 'reservation')
              .single();

            if (templateData) {
              termsAndConditions = templateData.terms_and_conditions;
            }
          } catch (templateError) {
            console.error('Error fetching template data:', templateError);
          }
        }

        // Add terms to document data
        setDocumentData({
          ...docData,
          terms_and_conditions: termsAndConditions,
        });

        // Fetch the reservation data: first by document_id, then fallback by vehicle_id
        let reservationRecord = null;

        const { data: resByDoc } = await supabase
          .from('vehicles_reservations')
          .select('*')
          .eq('document_id', documentId)
          .maybeSingle();

        if (resByDoc) {
          reservationRecord = resByDoc;
        } else {
          // Fallback: find by vehicle_id + customer_id if available
          let fallbackQuery = supabase
            .from('vehicles_reservations')
            .select('*')
            .eq('vehicle_id', docData.vehicle_id)
            .order('created_at', { ascending: false })
            .limit(1);

          if (docData.customer_id) {
            fallbackQuery = supabase
              .from('vehicles_reservations')
              .select('*')
              .eq('vehicle_id', docData.vehicle_id)
              .eq('customer_id', docData.customer_id)
              .order('created_at', { ascending: false })
              .limit(1);
          }

          const { data: resFallback, error: fallbackError } = await fallbackQuery.maybeSingle();

          if (fallbackError) {
            console.error('Error fetching reservation data:', fallbackError);
            return;
          }

          reservationRecord = resFallback;
        }

        if (!reservationRecord) {
          console.error('Reservation data not found');
          return;
        }

        const reservationData = reservationRecord;

        // Set reservation data with terms and conditions if available
        const finalReservationData = termsAndConditions
          ? {
              ...reservationData,
              terms_and_conditions: termsAndConditions,
            }
          : reservationData;

        setReservationData(finalReservationData);

        // Fetch the vehicle data
        const vehicleId = docData.vehicle_id;
        const { data: vehicleData, error: vehicleError } = await supabase
          .from('vehicles')
          .select(
            `
            *,
            brand:brand_id(name),
            model:model_id(name),
            category:category_id(name),
            color:color_id(name),
            condition:condition_id(name),
            fuel_type:fuel_type_id(name)
          `
          )
          .eq('id', vehicleId)
          .eq('client_id', clientId)
          .single();

        if (vehicleError) {
          console.error('Error fetching vehicle data:', vehicleError);
          return;
        }

        setVehicleData(vehicleData);

        // Fetch the reservation additionals
        const { data: additionalsData, error: additionalsError } =
          await supabase
            .from('vehicles_extras')
            .select('*')
            .eq('vehicle_id', vehicleId)
            .eq('type', 'reservation_additional')
            .order('created_at', { ascending: true });

        if (additionalsError) {
          console.error('Error fetching additionals data:', additionalsError);
        } else {
          setAdditionalsData(additionalsData || []);
        }

        // Fetch the customer data
        const customerId = reservationData?.customer_id || docData?.customer_id;
        if (customerId) {
          const { data: customerData, error: customerError } = await supabase
            .from('customers')
            .select('*')
            .eq('id', customerId)
            .maybeSingle();

          if (customerError) {
            console.error('Error fetching customer data:', customerError);
            // Don't return — document can still render without customer data
          }

          setCustomerData(customerData);
        }
      } catch (error) {
        console.error('Error in useReservationDocumentData:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [documentId, isOpen, client, clientId]);

  return {
    loading,
    documentData,
    reservationData,
    vehicleData,
    customerData,
    additionalsData,
  };
};
