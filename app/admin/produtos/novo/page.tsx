'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, X } from 'lucide-react';
import Link from 'next/link';
import { ImageUpload } from '@/components/admin/image-upload';
import { processProductName } from '@/lib/product-utils';

export default function NewProductPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<any[]>([]);
  const [form, setForm] = useState({
    name: '',
    description: '',
    imageUrl: '',
    categoryId: '',
    price: '',
    finalPrice: '',
    discount: '',
    volume: '',
    alcoholContent: '',
    brand: '',
    featuredOffer: false,
    featuredOfferOrder: '',
    featuredCategory: false,
    featuredCategoryOrder: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [lastEdited, setLastEdited] = useState<'price' | 'finalPrice' | 'discount' | null>(null);
  const [priceError, setPriceError] = useState('');

  useEffect(() => {
    fetch('/api/admin/categories')
      .then((r) => r.json())
      .then((d) => setCategories(d.categories || []));
  }, []);

  const calculatePrices = useCallback((field: 'price' | 'finalPrice' | 'discount', value: string, currentForm: typeof form) => {
    const price = field === 'price' ? parseFloat(value) || 0 : parseFloat(currentForm.price) || 0;
    const finalPrice = field === 'finalPrice' ? parseFloat(value) || 0 : parseFloat(currentForm.finalPrice) || 0;
    const discount = field === 'discount' ? parseFloat(value) || 0 : parseFloat(currentForm.discount) || 0;

    let newForm = { ...currentForm, [field]: value };

    if (field === 'price' && currentForm.discount && !isNaN(parseFloat(currentForm.discount))) {
      const calcFinalPrice = price - (price * parseFloat(currentForm.discount) / 100);
      newForm.finalPrice = calcFinalPrice > 0 ? calcFinalPrice.toFixed(2) : '';
    } else if (field === 'discount' && currentForm.price && !isNaN(parseFloat(currentForm.price))) {
      const calcFinalPrice = parseFloat(currentForm.price) - (parseFloat(currentForm.price) * (parseFloat(value) || 0) / 100);
      newForm.finalPrice = calcFinalPrice > 0 ? calcFinalPrice.toFixed(2) : '';
    }
    else if (field === 'price' && currentForm.finalPrice && !isNaN(parseFloat(currentForm.finalPrice))) {
      if (price > 0 && parseFloat(currentForm.finalPrice) <= price) {
        const calcDiscount = ((price - parseFloat(currentForm.finalPrice)) / price) * 100;
        newForm.discount = calcDiscount > 0 ? calcDiscount.toFixed(4) : '0';
      }
    } else if (field === 'finalPrice' && currentForm.price && !isNaN(parseFloat(currentForm.price))) {
      const originalPrice = parseFloat(currentForm.price);
      if (originalPrice > 0 && finalPrice <= originalPrice) {
        const calcDiscount = ((originalPrice - finalPrice) / originalPrice) * 100;
        newForm.discount = calcDiscount > 0 ? calcDiscount.toFixed(4) : '0';
      }
    }
    else if (field === 'finalPrice' && currentForm.discount && !isNaN(parseFloat(currentForm.discount)) && !currentForm.price) {
      const discountPercent = parseFloat(currentForm.discount);
      if (discountPercent < 100) {
        const calcPrice = finalPrice / (1 - discountPercent / 100);
        newForm.price = calcPrice > 0 ? calcPrice.toFixed(2) : '';
      }
    } else if (field === 'discount' && currentForm.finalPrice && !isNaN(parseFloat(currentForm.finalPrice)) && !currentForm.price) {
      const discountPercent = parseFloat(value) || 0;
      if (discountPercent < 100) {
        const calcPrice = parseFloat(currentForm.finalPrice) / (1 - discountPercent / 100);
        newForm.price = calcPrice > 0 ? calcPrice.toFixed(2) : '';
      }
    }

    return newForm;
  }, []);

  const handlePriceChange = (field: 'price' | 'finalPrice' | 'discount', value: string) => {
    setLastEdited(field);
    setPriceError('');
    const newForm = calculatePrices(field, value, form);
    setForm(newForm);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const price = parseFloat(form.price) || 0;
    const finalPrice = parseFloat(form.finalPrice) || 0;
    
    if (price <= 0 && finalPrice <= 0) {
      setPriceError('Preencha pelo menos o Valor Original ou Valor Real');
      toast.error('Preencha pelo menos o Valor Original ou Valor Real');
      return;
    }

    let finalPriceToSave = finalPrice;
    let priceToSave = price;
    let discountToSave = parseFloat(form.discount) || 0;

    if (priceToSave <= 0 && finalPriceToSave > 0) {
      priceToSave = finalPriceToSave;
      discountToSave = 0;
    }
    if (finalPriceToSave <= 0 && priceToSave > 0) {
      finalPriceToSave = priceToSave - (priceToSave * discountToSave / 100);
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          price: priceToSave,
          discount: discountToSave,
          finalPrice: finalPriceToSave,
          featuredOfferOrder: form.featuredOffer && form.featuredOfferOrder ? parseInt(form.featuredOfferOrder) : null,
          featuredCategoryOrder: form.featuredCategory && form.featuredCategoryOrder ? parseInt(form.featuredCategoryOrder) : null,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success('Produto criado!');
      router.push('/admin/produtos');
    } catch (e) {
      toast.error('Erro ao criar produto');
    } finally {
      setIsLoading(false);
    }
  };

  const getClientDiscount = () => {
    const discount = parseFloat(form.discount) || 0;
    return Math.floor(discount);
  };

  const showDiscountPreview = getClientDiscount() >= 1;

  return (
    <div className="max-w-xl mx-auto">
      <div className="flex items-center gap-3 mb-4">
        <Link href="/admin/produtos" className="p-1.5 hover:bg-gray-200 rounded-full">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold">Novo Produto</h1>
      </div>
      
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-5 space-y-3">
        <div>
          <label className="block text-sm font-medium mb-1">Nome *</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={form.name}
              onChange={(e) => {
                const inputName = e.target.value;
                const { brand, volume, alcoholContent, price, cleanedName } = processProductName(inputName);
                setForm(prev => ({
                  ...prev,
                  name: cleanedName,
                  // Auto-preencher apenas se estiver vazio
                  brand: prev.brand || brand || '',
                  volume: prev.volume || volume || '',
                  alcoholContent: prev.alcoholContent || alcoholContent || '',
                  // Preço do título vai para valor original (price), não para valor real (finalPrice)
                  price: prev.price || (price ? price : '')
                }));
              }}
              className="flex-1 px-3 py-2 rounded-lg border text-sm"
              required
            />
            {form.name && (
              <button
                type="button"
                onClick={() => setForm({ ...form, name: '', brand: '', volume: '', alcoholContent: '' })}
                className="px-3 py-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition-colors text-sm font-medium"
                title="Limpar nome"
              >
                ✕
              </button>
            )}
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Descrição</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border text-sm"
            rows={2}
          />
        </div>
        
        <div>
          <ImageUpload
            value={form.imageUrl}
            onChange={(url: string) => setForm(prev => ({ ...prev, imageUrl: url }))}
            onNameExtracted={(extractedName: string) => {
              // Only auto-fill if name is empty
              setForm(prev => {
                if (!prev.name.trim()) {
                  const { brand, volume, alcoholContent, price, cleanedName } = processProductName(extractedName);
                  return { 
                    ...prev, 
                    name: cleanedName,
                    brand: prev.brand || brand || '',
                    volume: prev.volume || volume || '',
                    alcoholContent: prev.alcoholContent || alcoholContent || '',
                    // Preço do título vai para valor original (price), não para valor real (finalPrice)
                    price: prev.price || (price ? price : '')
                  };
                }
                return prev;
              });
            }}
            label="Imagem do Produto *"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Categoria *</label>
          <select
            value={form.categoryId}
            onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border text-sm"
            required
          >
            <option value="">Selecione</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Seção de Preços - Limpa */}
        <div className="border-t pt-3 mt-3">
          <h3 className="font-medium text-sm mb-2">Preços</h3>
          
          {priceError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-1.5 rounded-lg mb-2 text-xs">
              {priceError}
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs font-medium mb-1 text-gray-600">Valor Original (R$)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.price}
                onChange={(e) => handlePriceChange('price', e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border text-sm ${lastEdited === 'price' ? 'border-orange-500 ring-1 ring-orange-200' : ''}`}
                placeholder="50,00"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-gray-600">Valor Real (R$)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.finalPrice}
                onChange={(e) => handlePriceChange('finalPrice', e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border text-sm ${lastEdited === 'finalPrice' ? 'border-orange-500 ring-1 ring-orange-200' : ''}`}
                placeholder="45,00"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-gray-600">% Desconto</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="99.99"
                value={form.discount}
                onChange={(e) => handlePriceChange('discount', e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border text-sm ${lastEdited === 'discount' ? 'border-orange-500 ring-1 ring-orange-200' : ''}`}
                placeholder="10"
              />
            </div>
          </div>

          {/* Preview compacto */}
          {(form.price || form.finalPrice) && (
            <div className="mt-2 p-2 bg-gray-50 rounded-lg flex items-center gap-2 text-sm">
              <span className="text-gray-500 text-xs">Preview:</span>
              {showDiscountPreview && form.price && (
                <span className="text-gray-400 line-through text-xs">R$ {parseFloat(form.price).toFixed(2).replace('.', ',')}</span>
              )}
              <span className="font-bold text-green-600">
                R$ {(parseFloat(form.finalPrice) || parseFloat(form.price) || 0).toFixed(2).replace('.', ',')}
              </span>
              {showDiscountPreview && (
                <span className="bg-red-500 text-white px-1.5 py-0.5 rounded-full text-[10px] font-bold">
                  {getClientDiscount()}% OFF
                </span>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="block text-xs font-medium mb-1 text-gray-600">Volume</label>
            <div className="flex gap-1">
              <input
                type="text"
                value={form.volume}
                onChange={(e) => setForm({ ...form, volume: e.target.value })}
                className="flex-1 px-3 py-2 rounded-lg border text-sm min-w-0"
                placeholder="350ml"
              />
              {form.volume && (
                <button
                  type="button"
                  onClick={() => setForm({ ...form, volume: '' })}
                  className="px-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg text-xs"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1 text-gray-600">Teor</label>
            <div className="flex gap-1">
              <input
                type="text"
                value={form.alcoholContent}
                onChange={(e) => setForm({ ...form, alcoholContent: e.target.value })}
                className="flex-1 px-3 py-2 rounded-lg border text-sm min-w-0"
                placeholder="4.5%"
              />
              {form.alcoholContent && (
                <button
                  type="button"
                  onClick={() => setForm({ ...form, alcoholContent: '' })}
                  className="px-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg text-xs"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1 text-gray-600">Marca</label>
            <div className="flex gap-1">
              <input
                type="text"
                value={form.brand}
                onChange={(e) => setForm({ ...form, brand: e.target.value })}
                className="flex-1 px-3 py-2 rounded-lg border text-sm min-w-0"
                placeholder="Ex: Heineken"
              />
              {form.brand && (
                <button
                  type="button"
                  onClick={() => setForm({ ...form, brand: '' })}
                  className="px-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg text-xs"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Destaques - Compacto */}
        <div className="border-t pt-3 mt-3">
          <h3 className="font-medium text-sm mb-2">Destaques</h3>
          
          <div className="space-y-2">
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.featuredOffer}
                  onChange={(e) => setForm({ ...form, featuredOffer: e.target.checked, featuredOfferOrder: '' })}
                  className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                />
                <span className="text-sm">Destacar em Ofertas</span>
              </label>
              {form.featuredOffer && (
                <select
                  value={form.featuredOfferOrder}
                  onChange={(e) => setForm({ ...form, featuredOfferOrder: e.target.value })}
                  className="mt-1 ml-6 w-24 px-2 py-1 rounded border text-sm"
                >
                  <option value="">Ordem</option>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.featuredCategory}
                  onChange={(e) => setForm({ ...form, featuredCategory: e.target.checked, featuredCategoryOrder: '' })}
                  className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                />
                <span className="text-sm">Destacar na Categoria</span>
              </label>
              {form.featuredCategory && (
                <select
                  value={form.featuredCategoryOrder}
                  onChange={(e) => setForm({ ...form, featuredCategoryOrder: e.target.value })}
                  className="mt-1 ml-6 w-24 px-2 py-1 rounded border text-sm"
                >
                  <option value="">Ordem</option>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-2.5 rounded-lg disabled:opacity-50 text-sm"
        >
          {isLoading ? 'Salvando...' : 'Criar Produto'}
        </button>
      </form>
    </div>
  );
}
