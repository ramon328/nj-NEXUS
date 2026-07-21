-- Actualizar la función process_bulk_import para incluir soporte para categorías
CREATE OR REPLACE FUNCTION process_bulk_import(
    p_data text,
    p_client_id bigint
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
    item JSONB;
    json_data JSONB;
    processed_count INTEGER := 0;
    skipped_count INTEGER := 0;
    buyer_customer_id BIGINT;
    seller_customer_id BIGINT;
    category_name TEXT;
    result JSONB;
BEGIN
    -- 1. Parsear el string JSON
    BEGIN
        json_data := p_data::jsonb;
    EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION 'Formato JSON inválido';
    END;

    -- 2. Procesar cada fila del JSON
    FOR item IN SELECT jsonb_array_elements(json_data)
    LOOP
        BEGIN
            -- PROCESAR COMPRADOR: Buscar si existe, sino insertar
            SELECT id INTO buyer_customer_id 
            FROM public.customers 
            WHERE rut = item->>'rut_comprador' AND client_id = p_client_id;
            
            IF buyer_customer_id IS NULL THEN
                INSERT INTO public.customers (rut, full_name, email, client_id)
                VALUES (
                    item->>'rut_comprador', 
                    item->>'nombre_comprador', 
                    item->>'email_comprador',
                    p_client_id
                )
                RETURNING id INTO buyer_customer_id;
            END IF;

            -- PROCESAR VENDEDOR: Buscar si existe, sino insertar
            SELECT id INTO seller_customer_id 
            FROM public.customers 
            WHERE rut = item->>'rut_vendedor' AND client_id = p_client_id;
            
            IF seller_customer_id IS NULL THEN
                INSERT INTO public.customers (rut, full_name, email, client_id)
                VALUES (
                    item->>'rut_vendedor', 
                    item->>'nombre_vendedor', 
                    item->>'email_vendedor', 
                    p_client_id
                )
                RETURNING id INTO seller_customer_id;
            END IF;

            -- PROCESAR CATEGORÍA: Extraer nombre de categoría directamente
            category_name := NULL;
            IF item->>'categoria' IS NOT NULL AND item->>'categoria' != 'Sin categorizar' THEN
                category_name := item->>'categoria';
            END IF;

            -- PROCESAR TRANSACCIÓN: Ignorar duplicados, ahora con categoría
            INSERT INTO public.customers_transactions (
                code, 
                buyer_id, 
                seller_id, 
                client_id, 
                brand, 
                model, 
                year,
                price,
                category
            )
            VALUES (
                item->>'codigo',
                buyer_customer_id,
                seller_customer_id,
                p_client_id,
                item->>'marca',
                item->>'modelo',
                (item->>'ano')::INTEGER,
                (item->>'precio')::NUMERIC,
                category_name
            )
            ON CONFLICT (code) DO NOTHING;

            -- Verificar si se insertó la transacción
            IF FOUND THEN
                processed_count := processed_count + 1;
            ELSE
                skipped_count := skipped_count + 1;
            END IF;

        EXCEPTION WHEN OTHERS THEN
            -- Si hay algún error en este registro, lo saltamos y continuamos
            skipped_count := skipped_count + 1;
            RAISE NOTICE 'Error procesando registro: %, Item: %', SQLERRM, item;
        END;
    END LOOP;

    -- 3. Devolver el resultado
    result := jsonb_build_object(
        'processed', processed_count,
        'skipped', skipped_count,
        'total', jsonb_array_length(json_data)
    );

    RETURN result;

EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error en process_bulk_import: %', SQLERRM; 
    RAISE;
END;
$$; 