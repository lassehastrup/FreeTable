import React from 'react';
import { Table } from '../types';
import './TableCard.css';

interface TableCardProps {
  table: Table;
  onClick?: (table: Table) => void;
}

export const TableCard: React.FC<TableCardProps> = ({ table, onClick }) => {
  const statusClass = table.isAvailable ? 'available' : 
                      table.status === 'unknown' ? 'unknown' : 'occupied';

  const handleClick = () => {
    if (onClick) {
      onClick(table);
    }
  };

  return (
    <div 
      className={`table-card ${statusClass}`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleClick()}
    >
      <div className="table-card-header">
        <span className="table-id">{table.id}</span>
        <span className={`status-badge ${statusClass}`}>
          {table.isAvailable ? 'Available' : table.status === 'unknown' ? 'Unknown' : 'Occupied'}
        </span>
      </div>
      <div className="table-card-body">
        <p className="table-name">{table.name}</p>
        {table.assignedUser && (
          <p className="assigned-user">{table.assignedUser.split('@')[0]}</p>
        )}
        {table.reason && table.isAvailable && (
          <p className="availability-reason">{table.reason}</p>
        )}
      </div>
    </div>
  );
};
