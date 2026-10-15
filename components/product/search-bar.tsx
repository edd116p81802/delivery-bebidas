'use client';

import { Search, X } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';

interface SearchResult {
  id: string;
  name: string;
  imageUrl: string;
  categoryName: string;
  finalPrice: number;
}

export function SearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const searchProducts = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/products/search?q=${encodeURIComponent(query)}`);
        if (response.ok) {
          const data = await response.json();
          setResults(data?.products || []);
          setIsOpen(true);
        }
      } catch (error) {
        console.error('Erro na busca:', error);
      } finally {
        setIsLoading(false);
      }
    };

    const debounce = setTimeout(searchProducts, 300);
    return () => clearTimeout(debounce);
  }, [query]);

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
  };

  return (
    <div ref={searchRef} id="main-search-bar" className="relative w-full max-w-2xl mx-auto">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input id="main-search-bar-input" type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Pesquise sua bebida favorita" className="w-full pl-12 pr-12 py-3 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent bg-gray-50" />
        {query && (
          <button onClick={handleClear} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute top-full mt-2 w-full bg-white rounded-2xl shadow-lg border border-gray-200 max-h-96 overflow-y-auto z-50">
          {isLoading ? (
            <div className="p-4 text-center text-gray-500">Buscando...</div>
          ) : results.length === 0 ? (
            <div className="p-4 text-center text-gray-500">Nenhum produto encontrado</div>
          ) : (
            <div className="py-2">
              {results.map((product) => (
                <Link key={product.id} href={`/produto/${product.id}`} onClick={() => { setIsOpen(false); setQuery(''); }} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                  <div className="relative w-12 h-12 rounded bg-gray-100 flex-shrink-0">
                    <Image src={product.imageUrl} alt={product.name} fill className="object-contain p-1" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{product.name}</p>
                    <p className="text-xs text-gray-500">{product.categoryName}</p>
                  </div>
                  <p className="font-bold text-green-600 text-sm">R$ {product.finalPrice.toFixed(2).replace('.', ',')}</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
