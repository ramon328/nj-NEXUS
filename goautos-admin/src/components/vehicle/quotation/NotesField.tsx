
import React from 'react';
import { Control } from 'react-hook-form';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { QuotationFormData } from './QuotationFormSchema';
import { useTranslation } from 'react-i18next';

interface NotesFieldProps {
  control: Control<QuotationFormData>;
}

const NotesField: React.FC<NotesFieldProps> = ({ control }) => {
  const { t } = useTranslation('vehicleQuotations');
  return (
    <FormField
      control={control}
      name="notes"
      render={({ field }) => (
        <FormItem>
          <FormLabel>{t('notes.label')}</FormLabel>
          <FormControl>
            <Textarea 
              placeholder={t('notes.placeholder')} 
              className="min-h-[100px]" 
              {...field} 
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export default NotesField;
