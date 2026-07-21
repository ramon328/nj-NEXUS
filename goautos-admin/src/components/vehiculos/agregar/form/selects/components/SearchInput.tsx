
import React from 'react';
import { Input } from '@/components/ui/input';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
}

const SearchInput: React.FC<SearchInputProps> = ({ value, onChange, label }) => {
  return (
    <div className="px-2 mb-2">
      <Input
        placeholder={`Buscar ${label.toLowerCase()}...`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9"
      />
    </div>
  );
};

export default SearchInput;
