import React, { useState } from 'react';
import { useEditor } from '@craftjs/core';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Plus, Trash, Info, GripVertical } from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { ImageSelector } from './ImageSelector';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// Define the possible field types for settings
type FieldType =
  | 'text'
  | 'textarea'
  | 'select'
  | 'pageUrl'
  | 'color'
  | 'range'
  | 'number'
  | 'complex'
  | 'imageSelector'
  | 'group'
  | 'separator'
  | 'toggle';

// Define the shape of a setting field
export interface SettingField {
  name: string;
  label: string;
  type: FieldType;
  defaultValue?: any;
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
  step?: number;
  rows?: number;
  placeholder?: string;
  fields?: SettingField[]; // For complex field types
  helpText?: string; // For help text/tooltips
}

interface SettingsManagerProps {
  nodeId: string;
  selected: any;
  fields: SettingField[];
}

export const SettingsManager: React.FC<SettingsManagerProps> = ({
  nodeId,
  selected,
  fields,
}) => {
  const { actions } = useEditor();
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>(
    {}
  );
  // Reordenar items de un campo complejo con drag-and-drop (por handle).
  const [dragState, setDragState] = useState<{
    field: string;
    index: number;
  } | null>(null);

  const handleChange = (prop: string, value: any) => {
    actions.setProp(nodeId, (props: any) => (props[prop] = value));
  };

  // Pages available in this tenant's builder (system + custom), exposed by Topbar.
  // Used by the 'pageUrl' field so users can pick a page instead of typing a URL.
  const getPageOptions = (): { value: string; label: string }[] => {
    const pages = (typeof window !== 'undefined' && (window as any).__builderAllPages) || [];
    return pages.map((p: any) => ({
      value: p.slug === 'home' ? '/' : `/${p.slug}`,
      label: p.label || p.slug,
    }));
  };

  const toggleExpanded = (itemKey: string) => {
    setExpandedItems((prev) => ({
      ...prev,
      [itemKey]: !prev[itemKey],
    }));
  };

  const renderSubfields = (
    parentField: SettingField,
    itemData: any,
    itemIndex: number,
    baseArray?: any[]
  ) => {
    // Array base sobre el que se escriben los cambios. Si el nodo aún no tiene la
    // prop, `baseArray` viene de los defaults para no hacer `undefined.slice(...)`.
    const arr = Array.isArray(baseArray)
      ? baseArray
      : Array.isArray(selected[parentField.name])
      ? selected[parentField.name]
      : [];
    return parentField.fields?.map((subfield) => (
      <div key={subfield.name} className='space-y-3 mb-6'>
        <div className='flex items-center gap-2'>
          <Label className='text-sm font-medium text-gray-900'>
            {subfield.label}
          </Label>
          {subfield.helpText && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info size={14} className='text-gray-400 cursor-help' />
                </TooltipTrigger>
                <TooltipContent className='max-w-xs'>
                  <div className='text-sm whitespace-pre-line leading-relaxed'>
                    {subfield.helpText}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        {subfield.name === 'featuresConfig' ? (
          // Manejar featuresConfig como objeto complejo
          <div className='space-y-1'>
            <Card className='p-2'>
              <Collapsible
                open={
                  expandedItems[
                    `${parentField.name}-${itemIndex}-${subfield.name}`
                  ]
                }
                onOpenChange={() =>
                  toggleExpanded(
                    `${parentField.name}-${itemIndex}-${subfield.name}`
                  )
                }
              >
                <div className='flex items-center justify-between mb-1'>
                  <CollapsibleTrigger asChild>
                    <Button
                      variant='ghost'
                      size='sm'
                      className='flex items-center gap-2'
                    >
                      {expandedItems[
                        `${parentField.name}-${itemIndex}-${subfield.name}`
                      ] ? (
                        <ChevronUp size={16} />
                      ) : (
                        <ChevronDown size={16} />
                      )}
                      <span className='font-medium'>
                        Características del Vehículo
                      </span>
                    </Button>
                  </CollapsibleTrigger>
                </div>
                <CollapsibleContent className='pt-1'>
                  {subfield.fields?.map((featureField) => (
                    <div key={featureField.name} className='space-y-2 mb-3'>
                      <div className='flex items-center gap-2'>
                        <Label className='text-sm font-medium text-gray-900'>
                          {featureField.label}
                        </Label>
                      </div>
                      {renderField(
                        featureField,
                        (itemData[subfield.name] || {})[featureField.name] ||
                          featureField.defaultValue,
                        (value) => {
                          const currentFeaturesConfig =
                            itemData[subfield.name] || {};
                          handleChange(parentField.name, [
                            ...arr.slice(0, itemIndex),
                            {
                              ...itemData,
                              [subfield.name]: {
                                ...currentFeaturesConfig,
                                [featureField.name]: value,
                              },
                            },
                            ...arr.slice(itemIndex + 1),
                          ]);
                        }
                      )}
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            </Card>
          </div>
        ) : (
          renderField(
            subfield,
            // `??` (no `||`): respeta valores vacíos/0/false mientras se edita;
            // solo cae al default si es undefined/null (campo recién creado).
            itemData[subfield.name] ?? subfield.defaultValue,
            (value) => {
              handleChange(parentField.name, [
                ...arr.slice(0, itemIndex),
                { ...itemData, [subfield.name]: value },
                ...arr.slice(itemIndex + 1),
              ]);
            }
          )
        )}
      </div>
    ));
  };

  const renderField = (
    field: SettingField,
    value?: any,
    onChange?: (value: any) => void
  ) => {
    const handleFieldChange =
      onChange || ((value: any) => handleChange(field.name, value));
    const rawValue = value !== undefined ? value : selected[field.name];
    const fieldValue = rawValue !== undefined && rawValue !== null ? rawValue : field.defaultValue;

    switch (field.type) {
      case 'complex':
        // Para featuresConfig, manejar como objeto
        if (field.name === 'featuresConfig') {
          const featuresData = selected[field.name] || {};
          return (
            <div key={field.name} className='space-y-1'>
              <div className='py-2 mb-2'>
                <div className='flex items-center gap-2'>
                  <Label className='text-sm font-semibold text-gray-900'>
                    {field.label}
                  </Label>
                </div>
              </div>
              <div className='space-y-1'>
                <Card className='p-2'>
                  <Collapsible
                    open={expandedItems[`${field.name}-0`]}
                    onOpenChange={() => toggleExpanded(`${field.name}-0`)}
                  >
                    <div className='flex items-center justify-between mb-2'>
                      <CollapsibleTrigger asChild>
                        <Button
                          variant='ghost'
                          size='sm'
                          className='flex items-center gap-2'
                        >
                          {expandedItems[`${field.name}-0`] ? (
                            <ChevronUp size={16} />
                          ) : (
                            <ChevronDown size={16} />
                          )}
                          <span className='font-medium'>
                            Características del Vehículo
                          </span>
                        </Button>
                      </CollapsibleTrigger>
                    </div>
                    <CollapsibleContent className='pt-2'>
                      {field.fields?.map((subfield) => (
                        <div key={subfield.name} className='space-y-3 mb-6'>
                          <div className='flex items-center gap-2'>
                            <Label className='text-sm font-medium text-gray-900'>
                              {subfield.label}
                            </Label>
                          </div>
                          {renderField(
                            subfield,
                            featuresData[subfield.name] ||
                              subfield.defaultValue,
                            (value) => {
                              handleChange(field.name, {
                                ...featuresData,
                                [subfield.name]: value,
                              });
                            }
                          )}
                        </div>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                </Card>
              </div>
            </div>
          );
        }

        if (!field.fields) return null;

        // Si es filterButtonColors o cardSettings, mostrar como configuración simple sin agregar/eliminar
        if (
          field.name === 'filterButtonColors' ||
          field.name === 'cardSettings'
        ) {
          return (
            <div key={field.name} className='space-y-1'>
              <div className='py-2 mb-2'>
                <div className='flex items-center gap-2'>
                  <Label className='text-sm font-semibold text-gray-900'>
                    {field.label}
                  </Label>
                </div>
              </div>
              <div className='space-y-1'>
                {(selected[field.name] || []).map((item: any, index: number) => (
                  <Card key={index} className='p-2'>
                    <Collapsible
                      open={expandedItems[`${field.name}-${index}`]}
                      onOpenChange={() =>
                        toggleExpanded(`${field.name}-${index}`)
                      }
                    >
                      <div className='flex items-center justify-between mb-2'>
                        <CollapsibleTrigger asChild>
                          <Button
                            variant='ghost'
                            size='sm'
                            className='flex items-center gap-2'
                          >
                            {expandedItems[`${field.name}-${index}`] ? (
                              <ChevronUp size={16} />
                            ) : (
                              <ChevronDown size={16} />
                            )}
                            <span className='font-medium'>
                              {field.name === 'filterButtonColors'
                                ? 'Configuración de colores'
                                : 'Configuración de tarjetas'}
                            </span>
                          </Button>
                        </CollapsibleTrigger>
                      </div>
                      <CollapsibleContent className='pt-2'>
                        {renderSubfields(field, item, index)}
                      </CollapsibleContent>
                    </Collapsible>
                  </Card>
                ))}
              </div>
            </div>
          );
        }

        // Para otros campos complejos (como cardSettings), mostrar con opciones de agregar/eliminar.
        // Si el nodo aún no tiene la prop (p.ej. nodos creados antes de existir este campo),
        // caemos a `field.defaultValue` para mostrar el editor; al primer cambio se materializa.
        const complexItems = Array.isArray(selected[field.name])
          ? selected[field.name]
          : Array.isArray(field.defaultValue)
          ? field.defaultValue
          : [];
        return (
          <div key={field.name} className='space-y-4'>
            <div className='py-3 px-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-100 mb-4'>
              <div className='flex items-center gap-2'>
                <div className='w-2 h-2 bg-green-500 rounded-full'></div>
                <Label className='text-sm font-semibold text-green-900'>
                  {field.label}
                </Label>
                {field.helpText && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info
                          size={16}
                          className='text-green-400 cursor-help'
                        />
                      </TooltipTrigger>
                      <TooltipContent className='max-w-xs'>
                        <div className='text-sm whitespace-pre-line leading-relaxed'>
                          {field.helpText}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            </div>
            <div className='space-y-2'>
              {complexItems.map((item: any, index: number) => (
                <Card
                  key={index}
                  className={cn(
                    'p-2.5 transition-all',
                    dragState?.field === field.name &&
                      dragState.index === index &&
                      'opacity-50',
                    dragState?.field === field.name &&
                      dragState.index !== index &&
                      'hover:ring-2 hover:ring-green-400'
                  )}
                  onDragOver={(e) => {
                    if (dragState?.field === field.name) e.preventDefault();
                  }}
                  onDrop={(e) => {
                    if (dragState?.field !== field.name) return;
                    e.preventDefault();
                    const from = dragState.index;
                    setDragState(null);
                    if (from === index) return;
                    const reordered = [...complexItems];
                    const [moved] = reordered.splice(from, 1);
                    reordered.splice(index, 0, moved);
                    handleChange(field.name, reordered);
                  }}
                >
                  <Collapsible
                    open={expandedItems[`${field.name}-${index}`]}
                    onOpenChange={() =>
                      toggleExpanded(`${field.name}-${index}`)
                    }
                  >
                    <div className='flex items-center gap-1'>
                      <span
                        draggable
                        onDragStart={(e) => {
                          setDragState({ field: field.name, index });
                          e.dataTransfer.effectAllowed = 'move';
                          e.dataTransfer.setData('text/plain', String(index));
                        }}
                        onDragEnd={() => setDragState(null)}
                        className='shrink-0 cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500'
                        title='Arrastrar para reordenar'
                      >
                        <GripVertical size={15} />
                      </span>
                      <CollapsibleTrigger asChild>
                        <Button
                          variant='ghost'
                          size='sm'
                          className='flex min-w-0 flex-1 items-center justify-start gap-1.5 px-1.5'
                        >
                          {expandedItems[`${field.name}-${index}`] ? (
                            <ChevronUp size={15} className='shrink-0 text-gray-400' />
                          ) : (
                            <ChevronDown size={15} className='shrink-0 text-gray-400' />
                          )}
                          <span className='truncate text-sm font-medium'>
                            {(typeof item?.label === 'string' && item.label.trim()) ||
                              (typeof item?.title === 'string' && item.title.trim()) ||
                              (typeof item?.text === 'string' && item.text.trim()) ||
                              (typeof item?.question === 'string' && item.question.trim()) ||
                              (typeof item?.name === 'string' && item.name.trim()) ||
                              `${field.label} ${index + 1}`}
                          </span>
                        </Button>
                      </CollapsibleTrigger>
                      <Button
                        variant='ghost'
                        size='sm'
                        onClick={() => {
                          const newValue = [
                            ...complexItems.slice(0, index),
                            ...complexItems.slice(index + 1),
                          ];
                          handleChange(field.name, newValue);
                        }}
                        className='h-7 w-7 shrink-0 p-0 text-gray-400 hover:bg-red-50 hover:text-red-600'
                        title='Eliminar'
                      >
                        <Trash size={15} />
                      </Button>
                    </div>
                    <CollapsibleContent className='pt-2'>
                      {renderSubfields(field, item, index, complexItems)}
                    </CollapsibleContent>
                  </Collapsible>
                </Card>
              ))}
              <Button
                variant='outline'
                size='sm'
                onClick={() => {
                  const defaultItem = field.defaultValue?.[0] || {};
                  handleChange(field.name, [
                    ...complexItems,
                    { ...defaultItem },
                  ]);
                  const newIndex = complexItems.length;
                  toggleExpanded(`${field.name}-${newIndex}`);
                }}
                className='w-full'
              >
                <Plus size={16} className='mr-2' />
                Agregar {field.label}
              </Button>
            </div>
          </div>
        );

      case 'color':
        return (
          <div className='flex gap-3 items-center p-3 bg-gray-50 rounded-lg border border-gray-200'>
            <div className='relative w-10 h-10 rounded-lg overflow-hidden border-2 border-gray-300 shadow-sm'>
              <input
                type='color'
                value={fieldValue || '#000000'}
                onChange={(e) => handleFieldChange(e.target.value)}
                className='absolute inset-0 w-full h-full cursor-pointer opacity-0'
              />
              <div
                className='w-full h-full'
                style={{ backgroundColor: fieldValue }}
              />
            </div>
            <Input
              type='text'
              value={fieldValue || ''}
              onChange={(e) => handleFieldChange(e.target.value)}
              className='flex-1 h-9 text-sm px-3 py-2 border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
            />
          </div>
        );

      case 'select':
        return (
          <Select
            value={fieldValue?.toString()}
            onValueChange={handleFieldChange}
          >
            <SelectTrigger className='w-full h-8 text-sm px-3 py-1 border-gray-200'>
              <SelectValue placeholder='Seleccionar opción' />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'pageUrl': {
        const pageOptions = getPageOptions();
        const matchesPage = pageOptions.some((o) => o.value === fieldValue);
        return (
          <div className='space-y-2'>
            <Select
              value={matchesPage ? fieldValue : '__custom__'}
              onValueChange={(v) => { if (v !== '__custom__') handleFieldChange(v); }}
            >
              <SelectTrigger className='w-full h-8 text-sm px-3 py-1 border-gray-200'>
                <SelectValue placeholder='Elegir página' />
              </SelectTrigger>
              <SelectContent>
                {pageOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
                <SelectItem value='__custom__'>Otra URL (escribir abajo)</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type='text'
              value={fieldValue || ''}
              placeholder='/mi-pagina o https://...'
              onChange={(e) => handleFieldChange(e.target.value)}
              className='w-full h-8 text-sm px-3 py-1 border-gray-200'
            />
          </div>
        );
      }

      case 'textarea':
        return (
          <textarea
            value={fieldValue || ''}
            onChange={(e) => handleFieldChange(e.target.value)}
            className={cn(
              'flex min-h-[60px] w-full rounded-md border border-gray-200 bg-white px-2 py-1.5 text-xs ring-offset-background',
              'placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-1',
              'focus-visible:ring-blue-500 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50'
            )}
          />
        );

      case 'imageSelector':
        return (
          <ImageSelector
            value={fieldValue || ''}
            onChange={handleFieldChange}
            label={field.label}
            placeholder={field.placeholder}
          />
        );

      case 'range':
        const currentValue =
          fieldValue !== undefined
            ? fieldValue
            : field.defaultValue !== undefined
            ? field.defaultValue
            : field.min || 0;
        const min = field.min || 0;
        const max = field.max || 100;
        const percentage = ((currentValue - min) / (max - min)) * 100;

        return (
          <div className='space-y-2'>
            <input
              type='range'
              min={min}
              max={max}
              step={field.step || 0.01}
              value={currentValue}
              onChange={(e) => {
                const newValue = parseFloat(e.target.value);
                handleFieldChange(newValue);
              }}
              onInput={(e) => {
                const newValue = parseFloat(e.currentTarget.value);
                handleFieldChange(newValue);
              }}
              className='w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer'
              style={{
                background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${percentage}%, #e5e7eb ${percentage}%, #e5e7eb 100%)`,
              }}
            />
            <div className='text-xs text-gray-500 text-center'>
              {currentValue.toFixed(2)}
            </div>
          </div>
        );

      case 'toggle':
        return (
          <div className='flex items-center justify-between py-1'>
            <Label className='text-sm font-medium text-gray-700 cursor-pointer' htmlFor={`toggle-${field.name}`}>
              {field.label}
            </Label>
            <Switch
              id={`toggle-${field.name}`}
              checked={!!fieldValue}
              onCheckedChange={(checked) => handleFieldChange(checked)}
            />
          </div>
        );

      case 'separator':
        return (
          <div className='py-4 px-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100 mb-4'>
            <div className='flex items-center gap-2 mb-2'>
              <div className='w-2 h-2 bg-blue-500 rounded-full'></div>
              <h3 className='text-sm font-semibold text-blue-900'>
                {field.label}
              </h3>
            </div>
            {field.defaultValue && (
              <p className='text-xs text-blue-700 leading-relaxed pl-4'>
                {field.defaultValue}
              </p>
            )}
          </div>
        );

      case 'group':
        const isExpanded = expandedItems[field.name] || false;
        return (
          <Collapsible
            open={isExpanded}
            onOpenChange={() => toggleExpanded(field.name)}
          >
            <CollapsibleTrigger asChild>
              <Button
                variant='ghost'
                className='w-full justify-between p-3 h-auto bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg'
              >
                <span className='font-medium text-gray-900'>{field.label}</span>
                {isExpanded ? (
                  <ChevronUp className='h-4 w-4 text-gray-500' />
                ) : (
                  <ChevronDown className='h-4 w-4 text-gray-500' />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className='mt-2 space-y-3'>
              {field.fields?.map((subField) => (
                <div key={subField.name} className='space-y-2'>
                  <Label className='text-sm font-medium text-gray-700'>
                    {subField.label}
                  </Label>
                  {renderField(subField)}
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        );

      default:
        return (
          <Input
            type={field.type}
            value={fieldValue || ''}
            onChange={(e) =>
              handleFieldChange(
                field.type === 'number'
                  ? parseFloat(e.target.value)
                  : e.target.value
              )
            }
            className='w-full h-7 text-xs px-2 py-1 border-gray-200'
          />
        );
    }
  };

  return (
    <>
      <style jsx>{`
        input[type='range'] {
          -webkit-appearance: none;
          appearance: none;
          height: 8px;
          border-radius: 4px;
          outline: none;
        }

        input[type='range']::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        input[type='range']::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
      `}</style>
      <div className='space-y-6'>
        {fields.map((field) => (
          <div key={field.name} className='space-y-3'>
            {field.type !== 'complex' && field.type !== 'separator' && (
              <Label className='text-sm font-semibold text-gray-900'>
                {field.label}
              </Label>
            )}
            {renderField(field)}
          </div>
        ))}
      </div>
    </>
  );
};
