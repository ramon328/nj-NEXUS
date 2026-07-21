import React from 'react';
import { useNode, UserComponent } from '@craftjs/core';
import { User } from 'lucide-react';
import { DeleteButton } from '../../DeleteButton';
import { EditableText } from '../../EditableText';

interface TeamMember {
  name: string;
  role: string;
  image: string;
  bio: string;
}

interface TeamMembersProps {
  sectionTitle: string;
  eyebrowText: string;
  members: TeamMember[];
  columns: 2 | 3 | 4;
  cardStyle: 'grid' | 'minimal';
  bgColor: string;
  textColor: string;
  accentColor: string;
  bioColor: string;
  cardBgColor: string;
}

const defaultMembers: TeamMember[] = [
  {
    name: 'Carlos Rodriguez',
    role: 'Gerente General',
    image: '',
    bio: 'Con mas de 15 anos de experiencia en la industria automotriz, Carlos lidera nuestro equipo con vision y dedicacion.',
  },
  {
    name: 'Maria Lopez',
    role: 'Asesor de Ventas',
    image: '',
    bio: 'Especialista en atencion al cliente, Maria te ayudara a encontrar el vehiculo perfecto para tus necesidades.',
  },
  {
    name: 'Jorge Martinez',
    role: 'Servicio Tecnico',
    image: '',
    bio: 'Tecnico certificado con amplia experiencia en mantenimiento y reparacion de vehiculos de todas las marcas.',
  },
];

export const TeamMembers: UserComponent<TeamMembersProps> = ({
  sectionTitle,
  eyebrowText = 'Conócenos',
  members,
  columns,
  cardStyle,
  bgColor,
  textColor,
  accentColor = '#2563eb',
  bioColor = '#6b7280',
  cardBgColor = '#ffffff',
}) => {
  const {
    connectors: { connect, drag },
    selected,
    id,
  } = useNode((state) => ({
    selected: state.events.selected,
  }));

  const gridCols =
    columns === 2
      ? 'grid-cols-1 sm:grid-cols-2'
      : columns === 3
        ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
        : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4';

  const renderAvatar = (member: TeamMember) => {
    if (member.image) {
      return (
        <img
          src={member.image}
          alt={member.name}
          className="w-24 h-24 rounded-full object-cover mx-auto"
        />
      );
    }
    return (
      <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center mx-auto">
        <User className="w-10 h-10 text-gray-400" />
      </div>
    );
  };

  const renderGridCard = (member: TeamMember, index: number) => (
    <div
      key={index}
      className="group rounded-2xl border border-gray-100 hover:border-gray-200 shadow-sm hover:shadow-xl transition-all duration-500 p-8 text-center overflow-hidden relative"
      style={{ backgroundColor: cardBgColor }}
    >
      <div className='relative'>
        <div className='mb-5'>
          {renderAvatar(member)}
        </div>
        <h3 className="text-lg font-bold mb-1" style={{ color: textColor }}>
          {member.name}
        </h3>
        <p className="text-sm font-medium mb-4" style={{ color: accentColor }}>{member.role}</p>
        <p className="text-sm leading-relaxed" style={{ color: bioColor }}>{member.bio}</p>
      </div>
    </div>
  );

  const renderMinimalCard = (member: TeamMember, index: number) => (
    <div key={index} className="flex items-start gap-5 py-6">
      <div className="flex-shrink-0">{renderAvatar(member)}</div>
      <div>
        <h3 className="text-lg font-semibold" style={{ color: textColor }}>
          {member.name}
        </h3>
        <p className="text-sm font-medium mb-2" style={{ color: accentColor }}>{member.role}</p>
        <p className="text-sm leading-relaxed" style={{ color: bioColor }}>{member.bio}</p>
      </div>
    </div>
  );

  return (
    <div
      ref={(ref) => {
        if (ref) connect(drag(ref));
      }}
      className={`relative w-full py-16 px-4 ${selected ? 'outline outline-2 outline-blue-500' : ''}`}
      style={{ backgroundColor: bgColor, color: textColor }}
    >
      {selected && <DeleteButton />}

      <div className="max-w-7xl mx-auto">
        {sectionTitle && (
          <div className='text-center mb-14'>
            <EditableText
              tag="p"
              value={eyebrowText}
              nodeId={id}
              propName="eyebrowText"
              className='text-sm font-semibold uppercase tracking-widest mb-3'
              style={{ color: accentColor }}
            />
            <EditableText
              tag="h2"
              value={sectionTitle}
              nodeId={id}
              propName="sectionTitle"
              className="text-3xl md:text-4xl lg:text-5xl font-bold"
              style={{ color: textColor }}
            />
          </div>
        )}

        {cardStyle === 'grid' ? (
          <div className={`grid ${gridCols} gap-8`}>
            {members.map((member, index) => renderGridCard(member, index))}
          </div>
        ) : (
          <div className={`grid ${gridCols} gap-6`}>
            {members.map((member, index) => renderMinimalCard(member, index))}
          </div>
        )}
      </div>
    </div>
  );
};

TeamMembers.craft = {
  displayName: 'TeamMembers',
  props: {
    sectionTitle: 'Nuestro Equipo',
    eyebrowText: 'Conócenos',
    members: defaultMembers,
    columns: 3,
    cardStyle: 'grid',
    bgColor: '#ffffff',
    textColor: '#1a1a1a',
    accentColor: '#2563eb',
    bioColor: '#6b7280',
    cardBgColor: '#ffffff',
  },
  rules: {
    canDrag: () => true,
    canDrop: () => true,
    canMoveIn: () => false,
    canMoveOut: () => true,
  },
};

export default TeamMembers;
