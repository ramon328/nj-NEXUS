import React from 'react';
import { useEditor } from '@craftjs/core';

interface DeleteButtonProps {
  nodeId: string;
}

export const DeleteButton: React.FC<DeleteButtonProps> = ({ nodeId }) => {
  const { actions } = useEditor((state) => ({
    actions: state.actions,
  }));

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (nodeId && actions) {
      actions.delete(nodeId);
    }
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: '4px',
        right: '4px',
        width: '24px',
        height: '24px',
        background: '#ff4444',
        borderRadius: '50%',
        border: '2px solid white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        zIndex: 1001,
        fontSize: '12px',
        color: 'white',
        fontWeight: 'bold',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
      }}
      onClick={handleDelete}
    >
      ×
    </div>
  );
};
