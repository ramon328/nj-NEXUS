import React, { useState } from 'react';
import { useNode } from '@craftjs/core';
import { EditableText, EditableArrayText } from '../../EditableText';
import { DeleteButton } from '../../DeleteButton';
import { ChevronDown } from 'lucide-react';
import { getPersonalizedDefaults } from '@/utils/clientDefaults';
import { useAuth } from '@/contexts/AuthContext';

interface FAQItemProps {
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
  questionColor: string;
  answerColor: string;
  accentColor: string;
  style: string;
  borderColor: string;
  nodeId: string;
  index: number;
}

const FAQItem = ({
  question,
  answer,
  isOpen,
  onToggle,
  questionColor,
  answerColor,
  accentColor,
  style: faqStyle,
  borderColor,
  nodeId,
  index,
}: FAQItemProps) => {
  const getContainerClass = () => {
    const base = 'transition-all duration-200 overflow-hidden';
    switch (faqStyle) {
      case 'bordered':
        return `${base} border rounded-xl px-6`;
      case 'cards':
        return `${base} border rounded-xl px-6 shadow-sm hover:shadow-md`;
      case 'minimal':
      default:
        return `${base} border-b px-2`;
    }
  };

  return (
    <div
      className={getContainerClass()}
      style={{
        borderColor: faqStyle === 'minimal' ? `${borderColor}30` : borderColor,
        backgroundColor: faqStyle === 'cards' ? '#ffffff' : 'transparent',
        marginBottom: faqStyle === 'minimal' ? 0 : '12px',
      }}
    >
      <button
        className='w-full flex justify-between items-center text-left focus:outline-none py-5 gap-4'
        onClick={onToggle}
      >
        <EditableArrayText tag="h3" value={question} nodeId={nodeId} arrayProp="questions" index={index} field="question" className='text-lg font-medium flex-1' style={{ color: questionColor }} />
        <div
          className='flex-shrink-0 transition-transform duration-300'
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        >
          <ChevronDown size={20} style={{ color: accentColor }} />
        </div>
      </button>
      <div
        className='transition-all duration-300 ease-in-out'
        style={{
          maxHeight: isOpen ? '500px' : '0px',
          opacity: isOpen ? 1 : 0,
          overflow: 'hidden',
        }}
      >
        <EditableArrayText tag="div" value={answer} nodeId={nodeId} arrayProp="questions" index={index} field="answer" className='pb-5 text-base leading-relaxed' style={{ color: answerColor }} />
      </div>
    </div>
  );
};

interface FAQProps {
  sectionTitle?: string;
  titleAlignment?: 'left' | 'center' | 'right';
  questions?: {
    question: string;
    answer: string;
  }[];
  bgColor?: string;
  titleColor?: string;
  questionColor?: string;
  answerColor?: string;
  accentColor?: string;
  style?: 'minimal' | 'bordered' | 'cards';
}

export const FAQ = ({
  sectionTitle = 'Preguntas frecuentes',
  titleAlignment = 'center',
  questions = [
    {
      question: '¿Qué tipos de vehículos ofrecen?',
      answer:
        'Ofrecemos una amplia gama de vehículos, desde compactos hasta SUVs y vehículos de lujo. Todos nuestros vehículos son seminuevos y han pasado por un riguroso proceso de inspección.',
    },
    {
      question: '¿Cómo funciona el financiamiento?',
      answer:
        'Trabajamos con diversas entidades financieras para ofrecer opciones que se adapten a tus necesidades. Nuestros asesores pueden ayudarte a encontrar el plan más adecuado según tu situación financiera.',
    },
    {
      question: '¿Ofrecen garantía en sus vehículos?',
      answer:
        'Sí, todos nuestros vehículos incluyen garantía. La duración y cobertura pueden variar según el modelo, año y estado del vehículo. Consulta con nuestros asesores para más detalles.',
    },
  ],
  bgColor = '#ffffff',
  titleColor = '#111827',
  questionColor = '#111827',
  answerColor = '#6b7280',
  accentColor,
  style = 'bordered',
}: FAQProps) => {
  const { connectors, selected, id } = useNode((state) => ({
    selected: state.events.selected,
  }));

  const { client } = useAuth();
  const clientDefaults = getPersonalizedDefaults(client);
  const finalAccentColor = accentColor || clientDefaults.primaryColor;

  const [openItems, setOpenItems] = useState<number[]>([0]);

  const toggleItem = (index: number) => {
    if (openItems.includes(index)) {
      setOpenItems(openItems.filter((item) => item !== index));
    } else {
      setOpenItems([...openItems, index]);
    }
  };

  return (
    <div
      ref={connectors.connect}
      style={{
        background: bgColor,
        padding: '80px 20px',
        position: 'relative',
        border: selected ? '2px dashed #666666' : '1px solid transparent',
        outline: selected ? '1px dashed #999999' : 'none',
        outlineOffset: selected ? '2px' : '0px',
      }}
      className='w-full'
    >
      {selected && <DeleteButton nodeId={id} />}
      <div className='max-w-3xl mx-auto'>
        <div className='text-center mb-14'>
          <p className='text-sm font-semibold uppercase tracking-widest mb-3' style={{ color: finalAccentColor }}>
            Preguntas frecuentes
          </p>
          <EditableText tag="h2" value={sectionTitle} nodeId={id} propName="sectionTitle"
            className='text-3xl md:text-4xl lg:text-5xl font-bold'
            style={{ color: titleColor, textAlign: titleAlignment }}
          />
        </div>

        <div className={style === 'minimal' ? 'divide-y-0' : 'space-y-0'}>
          {questions.map((item, index) => (
            <FAQItem
              key={index}
              question={item.question}
              answer={item.answer}
              isOpen={openItems.includes(index)}
              onToggle={() => toggleItem(index)}
              questionColor={questionColor}
              answerColor={answerColor}
              accentColor={finalAccentColor}
              style={style}
              borderColor='#e5e7eb'
              nodeId={id}
              index={index}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

const clientDefaults = getPersonalizedDefaults(null);

FAQ.craft = {
  displayName: 'FAQ',
  props: {
    sectionTitle: 'Preguntas frecuentes',
    titleAlignment: 'center',
    questions: [
      {
        question: '¿Qué tipos de vehículos ofrecen?',
        answer:
          'Ofrecemos una amplia gama de vehículos, desde compactos hasta SUVs y vehículos de lujo. Todos nuestros vehículos son seminuevos y han pasado por un riguroso proceso de inspección.',
      },
      {
        question: '¿Cómo funciona el financiamiento?',
        answer:
          'Trabajamos con diversas entidades financieras para ofrecer opciones que se adapten a tus necesidades. Nuestros asesores pueden ayudarte a encontrar el plan más adecuado según tu situación financiera.',
      },
      {
        question: '¿Ofrecen garantía en sus vehículos?',
        answer:
          'Sí, todos nuestros vehículos incluyen garantía. La duración y cobertura pueden variar según el modelo, año y estado del vehículo. Consulta con nuestros asesores para más detalles.',
      },
    ],
    bgColor: '#ffffff',
    titleColor: '#111827',
    questionColor: '#111827',
    answerColor: '#6b7280',
    accentColor: clientDefaults.primaryColor,
    style: 'bordered',
  },
  rules: {
    canDrag: () => true,
    canDrop: () => true,
    canMoveIn: () => true,
  },
};
