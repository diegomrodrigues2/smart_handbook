import React from 'react';

interface SearchBarProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}

const SearchBar: React.FC<SearchBarProps> = ({
    value,
    onChange,
    placeholder = "Search documents..."
}) => {
    return (
        <div className="p-2 border-b border-gray-100 bg-white">
            <div className="relative">
                <i className="fa-solid fa-magnifying-glass absolute left-3 top-2.5 text-gray-400 text-xs"></i>
                <input
                    type="text"
                    placeholder={placeholder}
                    className="w-full bg-gray-100 border-none rounded-md pl-8 pr-8 py-1.5 text-sm focus:ring-1 focus:ring-blue-500 outline-none text-gray-700"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                />
            </div>
        </div>
    );
};

export default SearchBar;
