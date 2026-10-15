'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Plus, Edit, Trash2, Search, Package, Star, X, Sparkles, FolderTree, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { ImageUpload, ImageAnalysisResult } from '@/components/admin/image-upload';
import { processProductName } from '@/lib/product-utils';

// Componente Badge de Fonte
const SourceBadge = ({ source, needsReview }: { source?: string; needsReview?: boolean }) => {
  if (!source && !needsReview) return null;
  
  const colors: { [key: string]: string } = {
    'Arquivo': 'bg-blue-100 text-blue-700',
    'OCR': 'bg-purple-100 text-purple-700',
    'Base': 'bg-green-100 text-green-700',
    'Catálogo': 'bg-teal-100 text-teal-700',
    'Web': 'bg-indigo-100 text-indigo-700',
    'Gerado': 'bg-orange-100 text-orange-700',
  };
  
  if (needsReview) {
    return (
      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-yellow-100 text-yellow-700">
        <AlertCircle className="w-2.5 h-2.5" />
        Revisar
      </span>
    );
  }
  
  return (
    <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium ${colors[source || ''] || 'bg-gray-100 text-gray-700'}`}>
      {source}
    </span>
  );
};

interface Product {
  id: string;
  name: string;
  imageUrl: string;
  price: number;
  discount: number;
  finalPrice: number;
  featuredOffer: boolean;
  featuredOfferOrder: number | null;
  featuredCategory: boolean;
  featuredCategoryOrder: number | null;
  starOrder: number | null;
  hidden: boolean;
  category: { id: string; name: string } | null;
  brand: string | null;
  volume: string | null;
}

interface Category {
  id: string;
  name: string;
  orderIndex: number;
  imageUrl?: string | null;
  hidden?: boolean;
  _count?: { products: number };
}

interface SalesData {
  [productName: string]: { metricsQty: number; dbQty: number };
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [filterHighlight, setFilterHighlight] = useState<string>('all');
  const [filterFunil, setFilterFunil] = useState<string>('todos');
  
  const [salesData, setSalesData] = useState<SalesData>({});
  const [brandsInUse, setBrandsInUse] = useState<string[]>([]);
  
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  
  const [editingCell, setEditingCell] = useState<{ id: string; field: 'name' | 'price' | 'discount' | 'finalPrice' | 'brand' } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [flashingCells, setFlashingCells] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);
  
  const [quickAddCategory, setQuickAddCategory] = useState<Category | null>(null);
  const [quickAddForm, setQuickAddForm] = useState({ imageUrl: '', name: '', price: '', finalPrice: '', discount: '', volume: '', brand: '', alcoholContent: '', description: '' });
  const [quickAddSources, setQuickAddSources] = useState<{ [key: string]: string }>({});
  const [quickAddNeedsReview, setQuickAddNeedsReview] = useState<string[]>([]);
  const [isQuickAdding, setIsQuickAdding] = useState(false);
  const [addedCount, setAddedCount] = useState(0);
  
  const [bulkDiscount, setBulkDiscount] = useState('');
  
  // Modais
  const [showFeaturedModal, setShowFeaturedModal] = useState(false);
  const [showNewProductModal, setShowNewProductModal] = useState(false);
  const [showAddBrandModal, setShowAddBrandModal] = useState(false);
  const [showCategoriesModal, setShowCategoriesModal] = useState(false);
  const [showNewCategoryModal, setShowNewCategoryModal] = useState(false);
  const [showEditCategoryModal, setShowEditCategoryModal] = useState(false);
  const [showOrderCategoriesModal, setShowOrderCategoriesModal] = useState(false);
  const [newBrandName, setNewBrandName] = useState('');
  const [newProductForm, setNewProductForm] = useState({ imageUrl: '', name: '', price: '', finalPrice: '', discount: '', categoryId: '', volume: '', brand: '', alcoholContent: '', description: '' });
  const [newProductSources, setNewProductSources] = useState<{ [key: string]: string }>({});
  const [newProductNeedsReview, setNewProductNeedsReview] = useState<string[]>([]);
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);
  
  // Busca no modal de seleção de produto
  const [featuredSearchTerm, setFeaturedSearchTerm] = useState('');
  
  // Categoria - criar/editar
  const [categoryForm, setCategoryForm] = useState({ id: '', name: '', imageUrl: '' });
  const [isSavingCategory, setIsSavingCategory] = useState(false);
  const [selectingCategoryPosition, setSelectingCategoryPosition] = useState<number | null>(null);

  // Filtro de escondidos
  const [showHiddenOnly, setShowHiddenOnly] = useState(false);

  // Modal de confirmação para remover destaque
  const [removeConfirmModal, setRemoveConfirmModal] = useState<{ product: Product; type: 'offer' | 'category' } | null>(null);

  // Destaque de categorias com seleção de categoria
  const [featuredCategoryFilter, setFeaturedCategoryFilter] = useState<string>('all');

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingCell]);

  const fetchData = async () => {
    try {
      const [productsRes, categoriesRes, salesRes, brandsRes] = await Promise.all([
        fetch('/api/admin/products'),
        fetch('/api/admin/categories'),
        fetch('/api/admin/products/sales-data'),
        fetch('/api/admin/brands')
      ]);
      const productsData = await productsRes.json();
      const categoriesData = await categoriesRes.json();
      const salesDataRes = await salesRes.json();
      const brandsData = await brandsRes.json();
      setProducts(productsData.products || []);
      setCategories(categoriesData.categories || []);
      setSalesData(salesDataRes.sales || {});
      setBrandsInUse(brandsData.brandsInUse || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBrands = async () => {
    try {
      const res = await fetch('/api/admin/brands');
      const data = await res.json();
      setBrandsInUse(data.brandsInUse || []);
    } catch (e) {
      console.error(e);
    }
  };

  // Funções de gerenciamento de categorias
  const handleSaveCategory = async () => {
    if (!categoryForm.name.trim()) {
      toast.error('Digite o nome da categoria');
      return;
    }
    setIsSavingCategory(true);
    try {
      const isEdit = !!categoryForm.id;
      const url = isEdit ? `/api/admin/categories/${categoryForm.id}` : '/api/admin/categories';
      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: categoryForm.name.trim(),
          imageUrl: categoryForm.imageUrl || null
        })
      });
      if (res.ok) {
        toast.success(isEdit ? 'Categoria atualizada!' : 'Categoria criada!');
        setCategoryForm({ id: '', name: '', imageUrl: '' });
        setShowNewCategoryModal(false);
        setShowEditCategoryModal(false);
        fetchData();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Erro ao salvar categoria');
      }
    } catch (e) {
      toast.error('Erro ao salvar categoria');
    } finally {
      setIsSavingCategory(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Tem certeza? Produtos desta categoria ficarão sem categoria.')) return;
    try {
      const res = await fetch(`/api/admin/categories/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Categoria removida!');
        fetchData();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Erro ao remover');
      }
    } catch (e) {
      toast.error('Erro ao remover');
    }
  };

  const openEditCategory = (cat: Category) => {
    setCategoryForm({ id: cat.id, name: cat.name, imageUrl: cat.imageUrl || '' });
    setShowEditCategoryModal(true);
  };

  const openNewCategory = () => {
    setCategoryForm({ id: '', name: '', imageUrl: '' });
    setShowNewCategoryModal(true);
  };

  // Mapa de categorias por posição (orderIndex) - só mostra categorias com orderIndex < 100
  const categoryPositionMap = useMemo(() => {
    const map = new Map<number, Category>();
    categories.forEach(cat => {
      if (cat.orderIndex < 100) {
        map.set(cat.orderIndex, cat);
      }
    });
    return map;
  }, [categories]);

  // Categorias sem posição definida (orderIndex >= 100)
  const unassignedCategories = useMemo(() => {
    return categories.filter(cat => cat.orderIndex >= 100);
  }, [categories]);

  // Atribuir categoria a uma posição
  const assignCategoryToPosition = async (categoryId: string) => {
    if (selectingCategoryPosition === null) return;
    
    try {
      const res = await fetch(`/api/admin/categories/${categoryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIndex: selectingCategoryPosition })
      });
      if (res.ok) {
        toast.success(`Categoria movida para posição ${selectingCategoryPosition}`);
        setSelectingCategoryPosition(null);
        fetchData();
      }
    } catch (e) {
      toast.error('Erro ao reordenar');
    }
  };

  // Remover categoria de posição (mover para o final)
  const removeCategoryFromPosition = async (cat: Category) => {
    try {
      const res = await fetch(`/api/admin/categories/${cat.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIndex: 999 })
      });
      if (res.ok) {
        toast.success('Categoria movida para o final');
        fetchData();
      }
    } catch (e) {
      toast.error('Erro ao reordenar');
    }
  };

  // Toggle hidden para categoria
  const toggleCategoryHidden = async (cat: Category) => {
    try {
      const res = await fetch(`/api/admin/categories/${cat.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hidden: !cat.hidden })
      });
      if (res.ok) {
        toast.success(cat.hidden ? 'Categoria visível!' : 'Categoria escondida!');
        fetchData();
      }
    } catch (e) {
      toast.error('Erro ao atualizar');
    }
  };

  // Toggle hidden para produto
  const toggleProductHidden = async (product: Product) => {
    try {
      const res = await fetch(`/api/admin/products/${product.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hidden: !product.hidden })
      });
      if (res.ok) {
        setProducts(prev => prev.map(p => 
          p.id === product.id ? { ...p, hidden: !p.hidden } : p
        ));
        toast.success(product.hidden ? 'Produto visível!' : 'Produto escondido!');
      }
    } catch (e) {
      toast.error('Erro ao atualizar');
    }
  };

  // Toggle estrela para produto (destaque geral) - POR CATEGORIA, começa no 9
  const toggleProductStar = async (product: Product) => {
    const hasNoStar = product.starOrder === null;
    const productCategoryId = product.category?.id;
    
    if (hasNoStar) {
      // Adicionar estrela - encontrar próxima posição disponível NA MESMA CATEGORIA
      // Estrelas começam no 9 (1-8 são para destaques de botão)
      const usedPositions = products
        .filter(p => p.starOrder !== null && p.category?.id === productCategoryId)
        .map(p => p.starOrder as number);
      const nextPosition = usedPositions.length > 0 ? Math.max(...usedPositions) + 1 : 9;
      
      try {
        const res = await fetch(`/api/admin/products/${product.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ starOrder: nextPosition })
        });
        if (res.ok) {
          setProducts(prev => prev.map(p => 
            p.id === product.id ? { ...p, starOrder: nextPosition } : p
          ));
          toast.success(`${product.name}: adicionado na posição ★${nextPosition}`, { duration: 3000 });
        }
      } catch (e) {
        toast.error('Erro ao adicionar destaque');
      }
    } else {
      // Remover estrela
      try {
        const res = await fetch(`/api/admin/products/${product.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ starOrder: null })
        });
        if (res.ok) {
          setProducts(prev => prev.map(p => 
            p.id === product.id ? { ...p, starOrder: null } : p
          ));
          toast.success(`${product.name}: removido do destaque geral`);
        }
      } catch (e) {
        toast.error('Erro ao remover destaque');
      }
    }
  };

  // Ações em lote para esconder/mostrar
  const bulkHide = async () => {
    if (selectedProducts.size === 0) return;
    try {
      const res = await fetch('/api/admin/products/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'hide',
          productIds: Array.from(selectedProducts)
        })
      });
      if (res.ok) {
        setProducts(prev => prev.map(p => 
          selectedProducts.has(p.id) ? { ...p, hidden: true } : p
        ));
        toast.success(`${selectedProducts.size} produto(s) escondido(s)`);
        clearSelection();
      }
    } catch (e) {
      toast.error('Erro ao esconder');
    }
  };

  const bulkShow = async () => {
    if (selectedProducts.size === 0) return;
    try {
      const res = await fetch('/api/admin/products/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'show',
          productIds: Array.from(selectedProducts)
        })
      });
      if (res.ok) {
        setProducts(prev => prev.map(p => 
          selectedProducts.has(p.id) ? { ...p, hidden: false } : p
        ));
        toast.success(`${selectedProducts.size} produto(s) visível(is)`);
        clearSelection();
      }
    } catch (e) {
      toast.error('Erro ao mostrar');
    }
  };

  // Remover de destaque com confirmação
  const handleRemoveFromFeatured = (product: Product, type: 'offer' | 'category') => {
    setRemoveConfirmModal({ product, type });
  };

  // Confirmar remoção completa (perde destaque E estrela)
  const confirmRemoveComplete = async () => {
    if (!removeConfirmModal) return;
    const { product, type } = removeConfirmModal;
    const productCategoryId = product.category?.id;
    
    const updateData = type === 'offer' 
      ? { featuredOffer: false, featuredOfferOrder: null, starOrder: null }
      : { featuredCategory: false, featuredCategoryOrder: null, starOrder: null };

    try {
      const res = await fetch(`/api/admin/products/${product.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      if (res.ok) {
        // Se houver próximo produto com estrela NA MESMA CATEGORIA, ele entra no lugar
        const starProducts = products
          .filter(p => p.starOrder !== null && p.id !== product.id && p.category?.id === productCategoryId)
          .sort((a, b) => (a.starOrder || 999) - (b.starOrder || 999));
        
        const position = type === 'offer' ? product.featuredOfferOrder : product.featuredCategoryOrder;
        const nextStarProduct = starProducts.find(p => {
          if (type === 'offer') return !p.featuredOffer;
          return !p.featuredCategory;
        });

        if (nextStarProduct && position) {
          // Mover próximo produto da estrela para a posição
          const nextUpdateData = type === 'offer'
            ? { featuredOffer: true, featuredOfferOrder: position }
            : { featuredCategory: true, featuredCategoryOrder: position };
          
          await fetch(`/api/admin/products/${nextStarProduct.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(nextUpdateData)
          });
        }

        fetchData();
        toast.success('Removido dos destaques');
      }
    } catch (e) {
      toast.error('Erro ao remover');
    }
    setRemoveConfirmModal(null);
  };

  // Mover para próximo destaque (vai para estrela, card fica vazio)
  const confirmMoveToStar = async () => {
    if (!removeConfirmModal) return;
    const { product, type } = removeConfirmModal;
    const productCategoryId = product.category?.id;
    
    // Encontrar próxima posição de estrela disponível NA MESMA CATEGORIA (começa no 9)
    const usedStarPositions = products
      .filter(p => p.starOrder !== null && p.category?.id === productCategoryId)
      .map(p => p.starOrder as number);
    const nextStarPosition = usedStarPositions.length > 0 ? Math.max(...usedStarPositions) + 1 : 9;
    
    const updateData = type === 'offer' 
      ? { featuredOffer: false, featuredOfferOrder: null, starOrder: nextStarPosition }
      : { featuredCategory: false, featuredCategoryOrder: null, starOrder: nextStarPosition };

    try {
      const res = await fetch(`/api/admin/products/${product.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      if (res.ok) {
        fetchData();
        toast.success(`Movido para destaque geral (posição ${nextStarPosition})`);
      }
    } catch (e) {
      toast.error('Erro ao mover');
    }
    setRemoveConfirmModal(null);
  };

  const handleAddBrand = async () => {
    if (!newBrandName.trim()) {
      toast.error('Digite o nome da marca');
      return;
    }
    try {
      const res = await fetch('/api/admin/brands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newBrandName.trim() })
      });
      if (res.ok) {
        toast.success('Marca adicionada!');
        setNewBrandName('');
        setShowAddBrandModal(false);
        fetchBrands();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Erro ao adicionar marca');
      }
    } catch (e) {
      toast.error('Erro ao adicionar marca');
    }
  };

  // Calculo de precos (regra de 3)
  const calculatePrices = useCallback((field: 'price' | 'finalPrice' | 'discount', value: string, currentForm: any) => {
    const price = field === 'price' ? parseFloat(value.replace(',', '.')) || 0 : parseFloat(currentForm.price?.replace(',', '.')) || 0;
    const finalPrice = field === 'finalPrice' ? parseFloat(value.replace(',', '.')) || 0 : parseFloat(currentForm.finalPrice?.replace(',', '.')) || 0;
    const discount = field === 'discount' ? parseFloat(value.replace(',', '.')) || 0 : parseFloat(currentForm.discount?.replace(',', '.')) || 0;

    let newForm = { ...currentForm, [field]: value };

    if (field === 'price' && currentForm.discount && !isNaN(parseFloat(currentForm.discount.replace(',', '.')))) {
      const calcFinalPrice = price - (price * parseFloat(currentForm.discount.replace(',', '.')) / 100);
      newForm.finalPrice = calcFinalPrice > 0 ? calcFinalPrice.toFixed(2) : '';
    } else if (field === 'discount' && currentForm.price && !isNaN(parseFloat(currentForm.price.replace(',', '.')))) {
      const calcFinalPrice = parseFloat(currentForm.price.replace(',', '.')) - (parseFloat(currentForm.price.replace(',', '.')) * (parseFloat(value.replace(',', '.')) || 0) / 100);
      newForm.finalPrice = calcFinalPrice > 0 ? calcFinalPrice.toFixed(2) : '';
    } else if (field === 'price' && currentForm.finalPrice && !isNaN(parseFloat(currentForm.finalPrice.replace(',', '.')))) {
      if (price > 0 && parseFloat(currentForm.finalPrice.replace(',', '.')) <= price) {
        const calcDiscount = ((price - parseFloat(currentForm.finalPrice.replace(',', '.'))) / price) * 100;
        newForm.discount = calcDiscount > 0 ? calcDiscount.toFixed(2) : '0';
      }
    } else if (field === 'finalPrice' && currentForm.price && !isNaN(parseFloat(currentForm.price.replace(',', '.')))) {
      const originalPrice = parseFloat(currentForm.price.replace(',', '.'));
      if (originalPrice > 0 && finalPrice <= originalPrice) {
        const calcDiscount = ((originalPrice - finalPrice) / originalPrice) * 100;
        newForm.discount = calcDiscount > 0 ? calcDiscount.toFixed(2) : '0';
      }
    } else if (field === 'finalPrice' && currentForm.discount && !isNaN(parseFloat(currentForm.discount.replace(',', '.'))) && !currentForm.price) {
      const discountPercent = parseFloat(currentForm.discount.replace(',', '.'));
      if (discountPercent < 100) {
        const calcPrice = finalPrice / (1 - discountPercent / 100);
        newForm.price = calcPrice > 0 ? calcPrice.toFixed(2) : '';
      }
    } else if (field === 'discount' && currentForm.finalPrice && !isNaN(parseFloat(currentForm.finalPrice.replace(',', '.'))) && !currentForm.price) {
      const discountPercent = parseFloat(value.replace(',', '.')) || 0;
      if (discountPercent < 100) {
        const calcPrice = parseFloat(currentForm.finalPrice.replace(',', '.')) / (1 - discountPercent / 100);
        newForm.price = calcPrice > 0 ? calcPrice.toFixed(2) : '';
      }
    }

    return newForm;
  }, []);

  const handleNewProductPriceChange = (field: 'price' | 'finalPrice' | 'discount', value: string) => {
    const newForm = calculatePrices(field, value, newProductForm);
    setNewProductForm(newForm);
  };

  const handleQuickAddPriceChange = (field: 'price' | 'finalPrice' | 'discount', value: string) => {
    const newForm = calculatePrices(field, value, quickAddForm);
    setQuickAddForm(newForm);
  };

  // Handler para análise de imagem - QuickAdd
  const handleQuickAddImageAnalysis = (result: ImageAnalysisResult) => {
    setQuickAddForm(prev => ({
      ...prev,
      name: prev.name || result.title || '',
      brand: prev.brand || result.brand || '',
      volume: prev.volume || result.volume || '',
      alcoholContent: prev.alcoholContent || result.alcoholContent || '',
      description: prev.description || result.description || '',
      price: prev.price || (result.price ? result.price.replace('.', ',') : ''),
    }));
    setQuickAddSources(result.sources || {});
    setQuickAddNeedsReview(result.needsReview || []);
    
    // Aviso se preço precisa revisão
    if (result.needsReview?.includes('price')) {
      toast.warning('Confirme o preço manualmente', { duration: 4000 });
    }
  };

  // Handler para análise de imagem - NewProduct
  const handleNewProductImageAnalysis = (result: ImageAnalysisResult) => {
    setNewProductForm(prev => ({
      ...prev,
      name: prev.name || result.title || '',
      brand: prev.brand || result.brand || '',
      volume: prev.volume || result.volume || '',
      alcoholContent: prev.alcoholContent || result.alcoholContent || '',
      description: prev.description || result.description || '',
      price: prev.price || (result.price ? result.price.replace('.', ',') : ''),
    }));
    setNewProductSources(result.sources || {});
    setNewProductNeedsReview(result.needsReview || []);
    
    // Aviso se preço precisa revisão
    if (result.needsReview?.includes('price')) {
      toast.warning('Confirme o preço manualmente', { duration: 4000 });
    }
  };

  // Funcao para pegar quantidade vendida
  const getSalesQty = (productName: string, source: 'metrics' | 'db'): number => {
    const nameKey = productName.toLowerCase();
    const data = salesData[nameKey];
    if (!data) return 0;
    return source === 'metrics' ? data.metricsQty : data.dbQty;
  };

  const featuredOfferProducts = useMemo(() => {
    return products
      .filter(p => p.featuredOffer && p.featuredOfferOrder)
      .sort((a, b) => (a.featuredOfferOrder || 0) - (b.featuredOfferOrder || 0));
  }, [products]);

  const featuredCategoryProducts = useMemo(() => {
    return products
      .filter(p => p.featuredCategory && p.featuredCategoryOrder)
      .sort((a, b) => (a.featuredCategoryOrder || 0) - (b.featuredCategoryOrder || 0));
  }, [products]);

  const occupiedOfferPositions = useMemo(() => {
    const map = new Map<number, Product>();
    featuredOfferProducts.forEach(p => {
      if (p.featuredOfferOrder) map.set(p.featuredOfferOrder, p);
    });
    return map;
  }, [featuredOfferProducts]);

  const occupiedCategoryPositions = useMemo(() => {
    const map = new Map<number, Product>();
    featuredCategoryProducts.forEach(p => {
      if (p.featuredCategoryOrder) map.set(p.featuredCategoryOrder, p);
    });
    return map;
  }, [featuredCategoryProducts]);

  // Posições ocupadas POR categoria específica (8 destaques por categoria)
  const getOccupiedPositionsForCategory = useCallback((categoryId: string) => {
    const map = new Map<number, Product>();
    products
      .filter(p => p.featuredCategory && p.featuredCategoryOrder && p.category?.id === categoryId)
      .forEach(p => {
        if (p.featuredCategoryOrder) map.set(p.featuredCategoryOrder, p);
      });
    return map;
  }, [products]);

  const filteredProducts = useMemo(() => {
    let result = [...products];

    // Filtro de escondidos
    if (showHiddenOnly) {
      result = result.filter(p => p.hidden);
    } else {
      result = result.filter(p => !p.hidden);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.category?.name.toLowerCase().includes(query) ||
        p.brand?.toLowerCase().includes(query)
      );
    }

    if (selectedCategory !== 'all') {
      result = result.filter(p => p.category?.id === selectedCategory);
    }

    if (selectedBrand !== 'all') {
      result = result.filter(p => p.brand === selectedBrand);
    }

    if (filterHighlight === 'ofertas') {
      result = result.filter(p => p.featuredOffer);
    } else if (filterHighlight === 'categoria') {
      result = result.filter(p => p.featuredCategory);
    } else if (filterHighlight === 'destaque-geral') {
      result = result.filter(p => p.starOrder !== null);
    }

    // Ordenacao por Funil
    if (filterFunil === 'mais-vendidos') {
      result.sort((a, b) => getSalesQty(b.name, 'db') - getSalesQty(a.name, 'db'));
    } else if (filterFunil === 'menos-vendidos') {
      result.sort((a, b) => getSalesQty(a.name, 'db') - getSalesQty(b.name, 'db'));
    } else if (filterFunil === 'mais-vendidos-metricas') {
      result.sort((a, b) => getSalesQty(b.name, 'metrics') - getSalesQty(a.name, 'metrics'));
    } else if (filterFunil === 'menos-vendidos-metricas') {
      result.sort((a, b) => getSalesQty(a.name, 'metrics') - getSalesQty(b.name, 'metrics'));
    } else {
      // Padrao: ordenar por categoria e nome
      result.sort((a, b) => {
        const catA = a.category?.name || 'zzz';
        const catB = b.category?.name || 'zzz';
        if (catA !== catB) return catA.localeCompare(catB);
        return a.name.localeCompare(b.name);
      });
    }

    return result;
  }, [products, searchQuery, selectedCategory, selectedBrand, filterHighlight, filterFunil, salesData, showHiddenOnly]);

  const groupedProducts = useMemo(() => {
    // Se estiver ordenando por funil, nao agrupar por categoria
    if (filterFunil !== 'todos') {
      return [['todos', { name: 'Todos os Produtos', products: filteredProducts }]] as [string, { name: string; products: Product[] }][];
    }
    
    const groups: { [key: string]: { name: string; products: Product[] } } = {};
    filteredProducts.forEach(product => {
      const catId = product.category?.id || 'sem-categoria';
      const catName = product.category?.name || 'Sem Categoria';
      if (!groups[catId]) groups[catId] = { name: catName, products: [] };
      groups[catId].products.push(product);
    });
    return Object.entries(groups).sort((a, b) => a[1].name.localeCompare(b[1].name));
  }, [filteredProducts, filterFunil]);

  const flashCell = (cellId: string) => {
    setFlashingCells(prev => new Set(prev).add(cellId));
    setTimeout(() => {
      setFlashingCells(prev => {
        const next = new Set(prev);
        next.delete(cellId);
        return next;
      });
    }, 600);
  };

  const saveInlineEdit = async () => {
    if (!editingCell) return;
    
    const product = products.find(p => p.id === editingCell.id);
    if (!product) return;

    let updateData: any = {};
    const cellId = `${editingCell.id}-${editingCell.field}`;

    if (editingCell.field === 'name') {
      if (!editValue.trim()) {
        toast.error('Nome nao pode ser vazio');
        return;
      }
      updateData = { name: editValue.trim() };
    } else if (editingCell.field === 'brand') {
      updateData = { brand: editValue.trim() || null };
    } else if (editingCell.field === 'price') {
      const price = parseFloat(editValue.replace(',', '.')) || 0;
      if (price <= 0) {
        toast.error('Preco invalido');
        return;
      }
      const finalPrice = price - (price * product.discount / 100);
      updateData = { price, finalPrice: Math.round(finalPrice * 100) / 100 };
    } else if (editingCell.field === 'discount') {
      const discount = parseFloat(editValue.replace(',', '.')) || 0;
      if (discount < 0 || discount > 100) {
        toast.error('Desconto deve ser entre 0 e 100%');
        return;
      }
      const finalPrice = product.price - (product.price * discount / 100);
      updateData = { discount, finalPrice: Math.round(finalPrice * 100) / 100 };
    } else if (editingCell.field === 'finalPrice') {
      const finalPrice = parseFloat(editValue.replace(',', '.')) || 0;
      if (finalPrice <= 0) {
        toast.error('Valor final invalido');
        return;
      }
      // Calcular desconto baseado no preco original
      let discount = 0;
      if (product.price > 0 && finalPrice < product.price) {
        discount = ((product.price - finalPrice) / product.price) * 100;
        discount = Math.round(discount * 100) / 100;
      }
      updateData = { finalPrice: Math.round(finalPrice * 100) / 100, discount };
    }

    try {
      const res = await fetch(`/api/admin/products/${editingCell.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      if (res.ok) {
        setProducts(prev => prev.map(p => 
          p.id === editingCell.id ? { ...p, ...updateData } : p
        ));
        flashCell(cellId);
        setEditingCell(null);
      } else {
        toast.error('Erro ao salvar');
      }
    } catch (e) {
      toast.error('Erro ao salvar');
    }
  };

  const cancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const startEdit = (product: Product, field: 'name' | 'price' | 'discount' | 'finalPrice' | 'brand') => {
    setEditingCell({ id: product.id, field });
    if (field === 'name') setEditValue(product.name);
    else if (field === 'price') setEditValue(product.price.toFixed(2));
    else if (field === 'discount') setEditValue(product.discount.toString());
    else if (field === 'finalPrice') setEditValue(product.finalPrice.toFixed(2));
    else if (field === 'brand') setEditValue(product.brand || '');
  };

  const toggleProductSelection = (productId: string) => {
    setSelectedProducts(prev => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const allIds = filteredProducts.map(p => p.id);
    const allSelected = allIds.every(id => selectedProducts.has(id));
    if (allSelected) {
      setSelectedProducts(prev => {
        const next = new Set(prev);
        allIds.forEach(id => next.delete(id));
        return next;
      });
    } else {
      setSelectedProducts(prev => {
        const next = new Set(prev);
        allIds.forEach(id => next.add(id));
        return next;
      });
    }
  };

  const clearSelection = () => setSelectedProducts(new Set());

  const applyBulkDiscount = async () => {
    const discount = parseFloat(bulkDiscount.replace(',', '.'));
    if (isNaN(discount) || discount < 0 || discount > 100) {
      toast.error('Desconto invalido (0-100%)');
      return;
    }

    try {
      const res = await fetch('/api/admin/products/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'discount',
          productIds: Array.from(selectedProducts),
          discountPercent: discount
        })
      });

      if (res.ok) {
        setProducts(prev => prev.map(p => {
          if (selectedProducts.has(p.id)) {
            const finalPrice = p.price - (p.price * discount / 100);
            return { ...p, discount, finalPrice: Math.round(finalPrice * 100) / 100 };
          }
          return p;
        }));
        
        selectedProducts.forEach(id => flashCell(`${id}-discount`));
        
        toast.success(`Desconto de ${discount}% aplicado em ${selectedProducts.size} produto(s)`);
        setBulkDiscount('');
      }
    } catch (e) {
      toast.error('Erro ao aplicar desconto');
    }
  };

  const bulkDelete = async () => {
    if (!confirm(`Excluir ${selectedProducts.size} produto(s)?`)) return;

    try {
      const res = await fetch('/api/admin/products/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          productIds: Array.from(selectedProducts)
        })
      });

      if (res.ok) {
        setProducts(prev => prev.filter(p => !selectedProducts.has(p.id)));
        toast.success(`${selectedProducts.size} produto(s) excluido(s)`);
        clearSelection();
      }
    } catch (e) {
      toast.error('Erro ao excluir');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este produto?')) return;
    try {
      await fetch(`/api/admin/products/${id}`, { method: 'DELETE' });
      setProducts(prev => prev.filter(p => p.id !== id));
      toast.success('Produto excluido');
    } catch (e) {
      toast.error('Erro ao excluir');
    }
  };

  const removeFromFeatured = async (product: Product, type: 'offer' | 'category') => {
    const updateData = type === 'offer' 
      ? { featuredOffer: false, featuredOfferOrder: null }
      : { featuredCategory: false, featuredCategoryOrder: null };

    try {
      const res = await fetch(`/api/admin/products/${product.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      if (res.ok) {
        setProducts(prev => prev.map(p => 
          p.id === product.id ? { ...p, ...updateData } : p
        ));
        toast.success('Removido dos destaques');
      }
    } catch (e) {
      toast.error('Erro ao remover');
    }
  };

  const [selectingPosition, setSelectingPosition] = useState<{ type: 'offer' | 'category'; position: number; categoryId?: string } | null>(null);

  const assignToPosition = async (productId: string) => {
    if (!selectingPosition) return;

    const updateData = selectingPosition.type === 'offer'
      ? { featuredOffer: true, featuredOfferOrder: selectingPosition.position }
      : { featuredCategory: true, featuredCategoryOrder: selectingPosition.position };

    try {
      const res = await fetch(`/api/admin/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      if (res.ok) {
        setProducts(prev => prev.map(p => 
          p.id === productId ? { ...p, ...updateData } : p
        ));
        toast.success(`Produto adicionado a posicao ${selectingPosition.position}`);
        setSelectingPosition(null);
      }
    } catch (e) {
      toast.error('Erro ao adicionar');
    }
  };

  const handleQuickAdd = async () => {
    if (!quickAddCategory || !quickAddForm.imageUrl || !quickAddForm.name.trim()) {
      toast.error('Preencha imagem e nome');
      return;
    }

    const price = parseFloat(quickAddForm.price?.replace(',', '.')) || 0;
    const finalPrice = parseFloat(quickAddForm.finalPrice?.replace(',', '.')) || 0;
    
    if (price <= 0 && finalPrice <= 0) {
      toast.error('Preencha pelo menos o Valor Original ou Valor Real');
      return;
    }

    setIsQuickAdding(true);
    const discount = parseFloat(quickAddForm.discount?.replace(',', '.')) || 0;
    const finalPriceToSave = finalPrice > 0 ? finalPrice : (price > 0 ? price - (price * discount / 100) : 0);
    const priceToSave = price > 0 ? price : finalPriceToSave;

    try {
      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: quickAddForm.name.trim(),
          imageUrl: quickAddForm.imageUrl,
          categoryId: quickAddCategory.id,
          price: priceToSave,
          discount,
          finalPrice: Math.round(finalPriceToSave * 100) / 100,
          volume: quickAddForm.volume || null,
          brand: quickAddForm.brand || null,
          alcoholContent: quickAddForm.alcoholContent || null,
          description: quickAddForm.description || null
        })
      });

      if (res.ok) {
        const data = await res.json();
        setProducts(prev => [{ ...data.product, category: quickAddCategory }, ...prev]);
        setAddedCount(prev => prev + 1);
        setQuickAddForm({ imageUrl: '', name: '', price: '', finalPrice: '', discount: '', volume: '', brand: '', alcoholContent: '', description: '' });
        flashCell('quick-add-success');
        fetchBrands(); // Atualizar lista de marcas
      } else {
        toast.error('Erro ao adicionar produto');
      }
    } catch (e) {
      toast.error('Erro ao adicionar produto');
    } finally {
      setIsQuickAdding(false);
    }
  };

  const closeQuickAdd = () => {
    setQuickAddCategory(null);
    setQuickAddForm({ imageUrl: '', name: '', price: '', finalPrice: '', discount: '', volume: '', brand: '', alcoholContent: '', description: '' });
    setQuickAddSources({});
    setQuickAddNeedsReview([]);
    setAddedCount(0);
  };

  // Criar novo produto via modal
  const handleCreateProduct = async () => {
    if (!newProductForm.imageUrl || !newProductForm.name.trim() || !newProductForm.categoryId) {
      toast.error('Preencha imagem, nome e categoria');
      return;
    }

    const price = parseFloat(newProductForm.price?.replace(',', '.')) || 0;
    const finalPrice = parseFloat(newProductForm.finalPrice?.replace(',', '.')) || 0;
    
    if (price <= 0 && finalPrice <= 0) {
      toast.error('Preencha pelo menos o Valor Original ou Valor Real');
      return;
    }

    setIsCreatingProduct(true);
    const discount = parseFloat(newProductForm.discount?.replace(',', '.')) || 0;
    const finalPriceToSave = finalPrice > 0 ? finalPrice : (price > 0 ? price - (price * discount / 100) : 0);
    const priceToSave = price > 0 ? price : finalPriceToSave;

    try {
      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newProductForm.name.trim(),
          imageUrl: newProductForm.imageUrl,
          categoryId: newProductForm.categoryId,
          price: priceToSave,
          discount,
          finalPrice: Math.round(finalPriceToSave * 100) / 100,
          volume: newProductForm.volume || null,
          brand: newProductForm.brand || null,
          alcoholContent: newProductForm.alcoholContent || null,
          description: newProductForm.description || null
        })
      });

      if (res.ok) {
        const data = await res.json();
        const cat = categories.find(c => c.id === newProductForm.categoryId);
        setProducts(prev => [{ ...data.product, category: cat || null }, ...prev]);
        toast.success('Produto criado com sucesso!');
        setShowNewProductModal(false);
        setNewProductForm({ imageUrl: '', name: '', price: '', finalPrice: '', discount: '', categoryId: '', volume: '', brand: '', alcoholContent: '', description: '' });
        setNewProductSources({});
        setNewProductNeedsReview([]);
        fetchBrands(); // Atualizar lista de marcas
      } else {
        toast.error('Erro ao criar produto');
      }
    } catch (e) {
      toast.error('Erro ao criar produto');
    } finally {
      setIsCreatingProduct(false);
    }
  };

  const selectedCategoryObj = useMemo(() => {
    if (selectedCategory === 'all') return null;
    return categories.find(c => c.id === selectedCategory) || null;
  }, [selectedCategory, categories]);

  const renderFeaturedGrid = (type: 'offer' | 'category', occupied: Map<number, Product>, categoryId?: string) => {
    const positions = [1, 2, 3, 4, 5, 6, 7, 8];
    
    return (
      <div className="grid grid-cols-4 gap-2">
        {positions.map(pos => {
          const product = occupied.get(pos);
          const isOccupied = !!product;
          
          return (
            <div key={pos} className="relative group">
              {isOccupied ? (
                <div className="w-14 h-14 bg-gradient-to-br from-green-100 to-green-200 rounded-lg flex flex-col items-center justify-center border-2 border-green-400 relative">
                  <span className="text-[10px] font-bold text-green-700 absolute top-0.5 left-1">{pos}</span>
                  <div className="relative w-8 h-8 rounded overflow-hidden">
                    <Image src={product.imageUrl} alt={product.name} fill className="object-contain" />
                  </div>
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50">
                    <div className="bg-white rounded-lg shadow-xl p-2 min-w-[120px] border">
                      <div className="relative w-16 h-16 mx-auto rounded overflow-hidden bg-gray-100">
                        <Image src={product.imageUrl} alt={product.name} fill className="object-contain" />
                      </div>
                      <p className="text-[10px] font-medium text-center mt-1 line-clamp-2">{product.name}</p>
                      <p className="text-[10px] text-green-600 font-bold text-center">
                        R$ {product.finalPrice.toFixed(2).replace('.', ',')}
                      </p>
                    </div>
                  </div>
                  <div className="absolute -bottom-1 left-0 right-0 flex justify-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Link
                      href={`/admin/produtos/${product.id}/editar`}
                      className="w-4 h-4 bg-blue-500 rounded flex items-center justify-center text-white hover:bg-blue-600"
                    >
                      <Edit className="w-2.5 h-2.5" />
                    </Link>
                    <button
                      onClick={() => handleRemoveFromFeatured(product, type)}
                      className="w-4 h-4 bg-red-500 rounded flex items-center justify-center text-white hover:bg-red-600"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setSelectingPosition({ type, position: pos, categoryId })}
                  className="w-14 h-14 bg-gray-100 hover:bg-gray-200 rounded-lg flex flex-col items-center justify-center border-2 border-dashed border-gray-300 hover:border-gray-400 transition-colors"
                >
                  <span className="text-xs font-bold text-gray-400">{pos}</span>
                  <Plus className="w-3 h-3 text-gray-400" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header simplificado */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={() => setShowFeaturedModal(true)}
          className="flex items-center gap-1.5 bg-purple-500 hover:bg-purple-600 text-white px-3 py-2 rounded-lg text-sm font-medium"
        >
          <Sparkles className="w-4 h-4" />
          Destaques
        </button>
        
        <button
          onClick={() => setShowNewProductModal(true)}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Novo Produto
        </button>
        
        <button
          onClick={() => setShowCategoriesModal(true)}
          className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          <FolderTree className="w-4 h-4" />
          Categorias
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Busca com quantidade */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Quantidade de Produtos: ${products.length}`}
              className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm"
            />
          </div>

          {/* Filtro Categoria + Botao Rapido */}
          <div className="flex items-center gap-2">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm min-w-[150px]"
            >
              <option value="all">Todas Categorias</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
            
            {selectedCategoryObj && (
              <button
                onClick={() => setQuickAddCategory(selectedCategoryObj)}
                className="flex items-center gap-1 px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                Rapido
              </button>
            )}
          </div>

          {/* Filtro Marca + Botao Adicionar */}
          <div className="flex items-center gap-2">
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm min-w-[130px]"
            >
              <option value="all">Todas Marcas</option>
              {brandsInUse.map(brand => (
                <option key={brand} value={brand}>{brand}</option>
              ))}
            </select>
            
            {selectedBrand !== 'all' && (
              <button
                onClick={() => setShowAddBrandModal(true)}
                className="flex items-center justify-center w-8 h-8 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-bold"
                title="Adicionar nova marca"
              >
                +
              </button>
            )}
          </div>

          {/* Filtro Destaques */}
          <select
            value={filterHighlight}
            onChange={(e) => setFilterHighlight(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm min-w-[150px]"
          >
            <option value="all">Todos</option>
            <option value="ofertas">Destaques Ofertas</option>
            <option value="categoria">Destaques Categoria</option>
            <option value="destaque-geral">Destaque Geral ★</option>
          </select>

          {/* Botão filtro de escondidos */}
          <button
            onClick={() => setShowHiddenOnly(!showHiddenOnly)}
            className={`p-2 rounded-lg border transition-colors ${
              showHiddenOnly 
                ? 'bg-orange-100 border-orange-300 text-orange-600' 
                : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
            }`}
            title={showHiddenOnly ? 'Mostrando escondidos' : 'Ver escondidos'}
          >
            {showHiddenOnly ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>

          {/* Filtro Funil */}
          <select
            value={filterFunil}
            onChange={(e) => setFilterFunil(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm min-w-[180px]"
          >
            <option value="todos">Todos</option>
            <option value="mais-vendidos-metricas">Em Alta (Dashboard)</option>
            <option value="menos-vendidos-metricas">Em Baixa (Dashboard)</option>
            <option value="mais-vendidos">Em Alta (Clientes)</option>
            <option value="menos-vendidos">Em Baixa (Clientes)</option>
          </select>
        </div>

        {/* Acoes em Lote */}
        {selectedProducts.size > 0 && (
          <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <span className="text-sm font-medium text-blue-700">
              {selectedProducts.size} selecionado(s)
            </span>
            <button onClick={clearSelection} className="text-xs text-blue-600 hover:underline">
              Limpar
            </button>
            <div className="flex-1" />
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={bulkDiscount}
                onChange={(e) => setBulkDiscount(e.target.value)}
                placeholder="%"
                className="w-16 px-2 py-1 border rounded text-sm text-center"
              />
              <button
                onClick={applyBulkDiscount}
                className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white rounded text-sm"
              >
                Aplicar Desconto
              </button>
              <button
                onClick={bulkHide}
                className="px-3 py-1 bg-orange-500 hover:bg-orange-600 text-white rounded text-sm flex items-center gap-1"
              >
                <EyeOff className="w-3 h-3" />
                Esconder
              </button>
              <button
                onClick={bulkShow}
                className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm flex items-center gap-1"
              >
                <Eye className="w-3 h-3" />
                Mostrar
              </button>
              <button
                onClick={bulkDelete}
                className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-sm"
              >
                Excluir
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Lista de Produtos */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <p className="p-6 text-center text-gray-500">Carregando...</p>
        ) : filteredProducts.length === 0 ? (
          <div className="p-8 text-center">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">Nenhum produto encontrado</p>
          </div>
        ) : (
          <div>
            <div className="bg-gray-50 px-4 py-2 border-b grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 uppercase">
              <div className="col-span-1 flex items-center">
                <input
                  type="checkbox"
                  checked={filteredProducts.length > 0 && filteredProducts.every(p => selectedProducts.has(p.id))}
                  onChange={toggleSelectAll}
                  className="rounded"
                />
              </div>
              <div className="col-span-1">Marca</div>
              <div className="col-span-1">Img</div>
              <div className="col-span-3">Nome</div>
              <div className="col-span-1">Preco</div>
              <div className="col-span-1">Desc%</div>
              <div className="col-span-1">Final</div>
              <div className="col-span-3">Acoes / Funil</div>
            </div>

            {groupedProducts.map(([catId, group]) => (
              <div key={catId}>
                <div className="bg-gray-100 px-4 py-2 border-b">
                  <span className="text-sm font-semibold text-gray-600">
                    {group.name} ({group.products.length})
                  </span>
                </div>
                {group.products.map(p => {
                  const isSelected = selectedProducts.has(p.id);
                  const isEditingName = editingCell?.id === p.id && editingCell?.field === 'name';
                  const isEditingPrice = editingCell?.id === p.id && editingCell?.field === 'price';
                  const isEditingDiscount = editingCell?.id === p.id && editingCell?.field === 'discount';
                  const isEditingFinalPrice = editingCell?.id === p.id && editingCell?.field === 'finalPrice';
                  const isEditingBrand = editingCell?.id === p.id && editingCell?.field === 'brand';
                  // Mostrar vendas baseado no filtro: Dashboard = metrics, Clientes/Todos = db
                  const useDashboard = filterFunil === 'mais-vendidos-metricas' || filterFunil === 'menos-vendidos-metricas';
                  const salesQty = getSalesQty(p.name, useDashboard ? 'metrics' : 'db');

                  return (
                    <div
                      key={p.id}
                      className={`px-4 py-2 border-b grid grid-cols-12 gap-2 items-center hover:bg-gray-50 ${
                        isSelected ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="col-span-1">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleProductSelection(p.id)}
                          className="rounded"
                        />
                      </div>

                      {/* Coluna Marca - editável */}
                      <div className="col-span-1">
                        {isEditingBrand ? (
                          <input
                            ref={inputRef}
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveInlineEdit();
                              if (e.key === 'Escape') cancelEdit();
                            }}
                            onBlur={saveInlineEdit}
                            className="w-full px-1 py-0.5 border border-blue-400 rounded text-[10px] focus:ring-2 focus:ring-blue-300"
                          />
                        ) : (
                          <span
                            onClick={() => startEdit(p, 'brand')}
                            className={`text-[10px] leading-tight cursor-pointer hover:bg-yellow-100 px-0.5 rounded transition-all break-words ${
                              flashingCells.has(`${p.id}-brand`) ? 'bg-green-200' : ''
                            } ${p.brand ? 'text-gray-700' : 'text-gray-300 italic'}`}
                            title={p.brand || 'Sem marca - clique para editar'}
                          >
                            {p.brand || '-'}
                          </span>
                        )}
                      </div>

                      <div className="col-span-1">
                        <div className="relative w-10 h-10 rounded overflow-hidden bg-gray-100">
                          <Image src={p.imageUrl} alt={p.name} fill className="object-contain" />
                        </div>
                      </div>

                      <div className="col-span-3">
                        {isEditingName ? (
                          <input
                            ref={inputRef}
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveInlineEdit();
                              if (e.key === 'Escape') cancelEdit();
                            }}
                            onBlur={saveInlineEdit}
                            className="w-full px-2 py-1 border border-blue-400 rounded text-sm focus:ring-2 focus:ring-blue-300"
                          />
                        ) : (
                          <span
                            onClick={() => startEdit(p, 'name')}
                            className={`text-sm cursor-pointer hover:bg-yellow-100 px-1 rounded transition-all ${
                              flashingCells.has(`${p.id}-name`) ? 'bg-green-200' : ''
                            }`}
                          >
                            {p.name}
                          </span>
                        )}
                      </div>

                      <div className="col-span-1">
                        {isEditingPrice ? (
                          <input
                            ref={inputRef}
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveInlineEdit();
                              if (e.key === 'Escape') cancelEdit();
                            }}
                            onBlur={saveInlineEdit}
                            className="w-16 px-2 py-1 border border-blue-400 rounded text-sm text-center focus:ring-2 focus:ring-blue-300"
                          />
                        ) : (
                          <span
                            onClick={() => startEdit(p, 'price')}
                            className={`text-xs cursor-pointer hover:bg-yellow-100 px-1 rounded transition-all ${
                              flashingCells.has(`${p.id}-price`) ? 'bg-green-200' : ''
                            }`}
                          >
                            R$ {p.price.toFixed(2).replace('.', ',')}
                          </span>
                        )}
                      </div>

                      <div className="col-span-1">
                        {isEditingDiscount ? (
                          <input
                            ref={inputRef}
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveInlineEdit();
                              if (e.key === 'Escape') cancelEdit();
                            }}
                            onBlur={saveInlineEdit}
                            className="w-14 px-2 py-1 border border-blue-400 rounded text-sm text-center focus:ring-2 focus:ring-blue-300"
                          />
                        ) : (
                          <span
                            onClick={() => startEdit(p, 'discount')}
                            className={`text-xs cursor-pointer hover:bg-yellow-100 px-1 rounded transition-all ${
                              flashingCells.has(`${p.id}-discount`) ? 'bg-green-200' : ''
                            }`}
                          >
                            {p.discount > 0 ? `${p.discount}%` : '-'}
                          </span>
                        )}
                      </div>

                      <div className="col-span-1">
                        {isEditingFinalPrice ? (
                          <input
                            ref={inputRef}
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveInlineEdit();
                              if (e.key === 'Escape') cancelEdit();
                            }}
                            onBlur={saveInlineEdit}
                            className="w-16 px-1 py-1 border border-blue-400 rounded text-xs text-center focus:ring-2 focus:ring-blue-300"
                          />
                        ) : (
                          <span
                            onClick={() => startEdit(p, 'finalPrice')}
                            className={`text-xs font-bold text-green-600 cursor-pointer hover:bg-yellow-100 px-1 rounded transition-all ${
                              flashingCells.has(`${p.id}-finalPrice`) ? 'bg-green-200' : ''
                            }`}
                          >
                            R$ {p.finalPrice.toFixed(2).replace('.', ',')}
                          </span>
                        )}
                      </div>

                      <div className="col-span-3 flex items-center gap-1">
                        {/* Botão Estrela - Destaque Geral */}
                        <button
                          onClick={() => toggleProductStar(p)}
                          className={`p-1.5 rounded flex items-center gap-0.5 ${
                            p.starOrder !== null 
                              ? 'text-yellow-500 hover:bg-yellow-50' 
                              : 'text-gray-300 hover:bg-gray-100 hover:text-yellow-400'
                          }`}
                          title={p.starOrder !== null ? `Destaque ★${p.starOrder} - clique para remover` : 'Adicionar ao destaque geral'}
                        >
                          <Star className="w-4 h-4" fill={p.starOrder !== null ? 'currentColor' : 'none'} />
                          {p.starOrder !== null && (
                            <span className="text-[10px] font-bold">{p.starOrder}</span>
                          )}
                        </button>

                        {/* Botão Olho - Esconder/Mostrar */}
                        <button
                          onClick={() => toggleProductHidden(p)}
                          className={`p-1.5 rounded ${
                            p.hidden 
                              ? 'text-orange-500 hover:bg-orange-50' 
                              : 'text-gray-400 hover:bg-gray-100'
                          }`}
                          title={p.hidden ? 'Produto escondido - clique para mostrar' : 'Esconder produto'}
                        >
                          {p.hidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>

                        <Link
                          href={`/admin/produtos/${p.id}/editar`}
                          className="p-1.5 text-blue-500 hover:bg-blue-50 rounded"
                          title="Editar completo"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => handleDelete(p.id)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        
                        {/* Quantidade vendida */}
                        <span className="ml-2 text-xs text-gray-500">
                          {salesQty} Vendido{salesQty !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Destaques */}
      {showFeaturedModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">Gerenciar Destaques</h3>
              <button onClick={() => setShowFeaturedModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                {/* Ofertas - 8 posições globais */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <Star className="w-4 h-4 text-yellow-500" fill="currentColor" />
                    Ofertas
                  </h4>
                  {renderFeaturedGrid('offer', occupiedOfferPositions)}
                </div>
                
                {/* Categoria - 8 posições POR categoria */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <Star className="w-4 h-4 text-purple-500" fill="currentColor" />
                    Categoria
                  </h4>
                  <select
                    value={featuredCategoryFilter}
                    onChange={(e) => setFeaturedCategoryFilter(e.target.value)}
                    className="w-full mb-2 px-2 py-1.5 border rounded-lg text-xs"
                  >
                    <option value="all">Selecione uma categoria</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                  {featuredCategoryFilter === 'all' ? (
                    <div className="text-center py-4 text-xs text-gray-400">
                      Selecione uma categoria para ver os 8 destaques dela
                    </div>
                  ) : (
                    renderFeaturedGrid('category', getOccupiedPositionsForCategory(featuredCategoryFilter), featuredCategoryFilter)
                  )}
                </div>
              </div>
            </div>
            <div className="p-4 border-t bg-gray-50 flex justify-end">
              <button
                onClick={() => setShowFeaturedModal(false)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm font-medium"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Novo Produto */}
      {showNewProductModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b flex items-center justify-between sticky top-0 bg-white">
              <h3 className="font-semibold text-gray-800">Novo Produto</h3>
              <button onClick={() => setShowNewProductModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <ImageUpload
                value={newProductForm.imageUrl}
                onChange={(url) => setNewProductForm(prev => ({ ...prev, imageUrl: url }))}
                onNameExtracted={(extractedName) => {
                  const { brand, volume, alcoholContent, price, description, cleanedName } = processProductName(extractedName);
                  setNewProductForm(prev => ({ 
                    ...prev, 
                    name: prev.name || cleanedName,
                    brand: prev.brand || brand || '',
                    volume: prev.volume || volume || '',
                    alcoholContent: prev.alcoholContent || alcoholContent || '',
                    price: prev.price || (price ? price : ''),
                    description: prev.description || description || ''
                  }));
                  // Marcar fonte como Arquivo
                  setNewProductSources({ title: 'Arquivo', brand: 'Arquivo', volume: 'Arquivo', alcoholContent: 'Arquivo', price: 'Arquivo', description: 'Arquivo' });
                }}
                onImageAnalyzed={handleNewProductImageAnalysis}
                label="Imagem do Produto"
                compact
                enableSmartAnalysis
              />

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <label className="text-sm text-gray-600">Nome</label>
                  <SourceBadge source={newProductSources.title} needsReview={newProductNeedsReview.includes('title')} />
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newProductForm.name}
                    onChange={(e) => {
                      const inputName = e.target.value;
                      const { brand, volume, alcoholContent, price, description, cleanedName } = processProductName(inputName);
                      setNewProductForm(prev => ({ 
                        ...prev, 
                        name: cleanedName,
                        brand: prev.brand || brand || '',
                        volume: prev.volume || volume || '',
                        alcoholContent: prev.alcoholContent || alcoholContent || '',
                        price: prev.price || (price ? price : ''),
                        description: prev.description || description || ''
                      }));
                    }}
                    placeholder="Nome do produto"
                    className="flex-1 px-3 py-2 border rounded-lg text-sm"
                  />
                  {newProductForm.name && (
                    <button type="button" onClick={() => setNewProductForm(prev => ({ ...prev, name: '' }))} className="px-2 py-1 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg text-sm">✕</button>
                  )}
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-600 mb-1 block">Categoria</label>
                <select
                  value={newProductForm.categoryId}
                  onChange={(e) => setNewProductForm(prev => ({ ...prev, categoryId: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                >
                  <option value="">Selecione uma categoria</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              {/* Precos com regra de 3 */}
              <div className="space-y-3 p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Preencha 2 campos e o terceiro sera calculado automaticamente</p>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <div className="flex items-center gap-1 mb-1">
                      <label className="text-xs text-gray-600">Valor Original</label>
                      <SourceBadge source={newProductSources.price} needsReview={newProductNeedsReview.includes('price')} />
                    </div>
                    <input
                      type="text"
                      value={newProductForm.price}
                      onChange={(e) => handleNewProductPriceChange('price', e.target.value)}
                      placeholder="0,00"
                      className={`w-full px-2 py-2 border rounded-lg text-sm ${newProductNeedsReview.includes('price') ? 'border-yellow-400 bg-yellow-50' : ''}`}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600 mb-1 block">Desconto %</label>
                    <input
                      type="text"
                      value={newProductForm.discount}
                      onChange={(e) => handleNewProductPriceChange('discount', e.target.value)}
                      placeholder="0"
                      className="w-full px-2 py-2 border rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600 mb-1 block">Valor Real</label>
                    <input
                      type="text"
                      value={newProductForm.finalPrice}
                      onChange={(e) => handleNewProductPriceChange('finalPrice', e.target.value)}
                      placeholder="0,00"
                      className="w-full px-2 py-2 border rounded-lg text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Volume, Marca, Teor com botões X e badges */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <div className="flex items-center gap-1 mb-1">
                    <label className="text-xs text-gray-600">Volume</label>
                    <SourceBadge source={newProductSources.volume} />
                  </div>
                  <div className="flex gap-1">
                    <input
                      type="text"
                      value={newProductForm.volume}
                      onChange={(e) => setNewProductForm(prev => ({ ...prev, volume: e.target.value }))}
                      placeholder="350ML"
                      className="flex-1 px-2 py-2 border rounded-lg text-sm min-w-0"
                    />
                    {newProductForm.volume && (
                      <button type="button" onClick={() => setNewProductForm(prev => ({ ...prev, volume: '' }))} className="px-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg text-xs">✕</button>
                    )}
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-1 mb-1">
                    <label className="text-xs text-gray-600">Marca</label>
                    <SourceBadge source={newProductSources.brand} />
                  </div>
                  <div className="flex gap-1">
                    <input
                      type="text"
                      value={newProductForm.brand}
                      onChange={(e) => setNewProductForm(prev => ({ ...prev, brand: e.target.value }))}
                      placeholder="Ex: Heineken"
                      className="flex-1 px-2 py-2 border rounded-lg text-sm min-w-0"
                    />
                    {newProductForm.brand && (
                      <button type="button" onClick={() => setNewProductForm(prev => ({ ...prev, brand: '' }))} className="px-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg text-xs">✕</button>
                    )}
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-1 mb-1">
                    <label className="text-xs text-gray-600">Teor</label>
                    <SourceBadge source={newProductSources.alcoholContent} needsReview={newProductNeedsReview.includes('alcoholContent')} />
                  </div>
                  <div className="flex gap-1">
                    <input
                      type="text"
                      value={newProductForm.alcoholContent}
                      onChange={(e) => setNewProductForm(prev => ({ ...prev, alcoholContent: e.target.value }))}
                      placeholder="4.5%"
                      className={`flex-1 px-2 py-2 border rounded-lg text-sm min-w-0 ${newProductNeedsReview.includes('alcoholContent') ? 'border-yellow-400 bg-yellow-50' : ''}`}
                    />
                    {newProductForm.alcoholContent && (
                      <button type="button" onClick={() => setNewProductForm(prev => ({ ...prev, alcoholContent: '' }))} className="px-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg text-xs">✕</button>
                    )}
                  </div>
                </div>
              </div>

              {/* Descrição */}
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <label className="text-xs text-gray-600">Descrição</label>
                  <SourceBadge source={newProductSources.description} />
                </div>
                <div className="flex gap-1">
                  <textarea
                    value={newProductForm.description}
                    onChange={(e) => setNewProductForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Descrição do produto..."
                    rows={3}
                    className="flex-1 px-2 py-2 border rounded-lg text-sm resize-none"
                  />
                  {newProductForm.description && (
                    <button type="button" onClick={() => setNewProductForm(prev => ({ ...prev, description: '' }))} className="px-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg text-xs self-start">✕</button>
                  )}
                </div>
              </div>
            </div>
            <div className="p-4 border-t bg-gray-50 flex justify-end gap-2 sticky bottom-0">
              <button
                onClick={() => setShowNewProductModal(false)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateProduct}
                disabled={isCreatingProduct}
                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {isCreatingProduct ? 'Criando...' : 'Criar Produto'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Selecionar Produto para Destaque */}
      {selectingPosition && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold">
                Posição {selectingPosition.position}
                <span className="text-sm font-normal text-gray-500 ml-2">
                  ({selectingPosition.type === 'offer' ? 'Ofertas' : 'Categoria'})
                </span>
              </h3>
              <button onClick={() => { setSelectingPosition(null); setFeaturedSearchTerm(''); }} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            {/* Busca */}
            <div className="p-3 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar produto..."
                  value={featuredSearchTerm}
                  onChange={(e) => setFeaturedSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  autoFocus
                />
              </div>
            </div>
            <div className="overflow-y-auto flex-1 p-2">
              {products
                .filter(p => {
                  // Filtrar por tipo de destaque
                  const notFeatured = selectingPosition.type === 'offer' ? !p.featuredOffer : !p.featuredCategory;
                  if (!notFeatured) return false;
                  // Se for categoria, filtrar APENAS produtos desta categoria
                  if (selectingPosition.type === 'category' && selectingPosition.categoryId) {
                    if (p.category?.id !== selectingPosition.categoryId) return false;
                  }
                  // Filtrar por busca
                  if (!featuredSearchTerm.trim()) return true;
                  const searchLower = featuredSearchTerm.toLowerCase();
                  return p.name.toLowerCase().includes(searchLower) || 
                         p.category?.name?.toLowerCase().includes(searchLower);
                })
                .slice(0, 50) // Limitar a 50 resultados para performance
                .map(p => (
                  <button
                    key={p.id}
                    onClick={() => { assignToPosition(p.id); setFeaturedSearchTerm(''); }}
                    className="w-full flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg text-left"
                  >
                    <div className="relative w-10 h-10 rounded overflow-hidden bg-gray-100 flex-shrink-0">
                      <Image src={p.imageUrl} alt={p.name} fill className="object-contain" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{p.name}</p>
                      <p className="text-xs text-gray-500">{p.category?.name}</p>
                    </div>
                    <span className="text-sm font-bold text-green-600">
                      R$ {p.finalPrice.toFixed(2).replace('.', ',')}
                    </span>
                  </button>
                ))}
              {products.filter(p => {
                const notFeatured = selectingPosition.type === 'offer' ? !p.featuredOffer : !p.featuredCategory;
                if (!notFeatured) return false;
                if (selectingPosition.type === 'category' && selectingPosition.categoryId) {
                  if (p.category?.id !== selectingPosition.categoryId) return false;
                }
                if (!featuredSearchTerm.trim()) return true;
                const searchLower = featuredSearchTerm.toLowerCase();
                return p.name.toLowerCase().includes(searchLower) || p.category?.name?.toLowerCase().includes(searchLower);
              }).length === 0 && (
                <p className="text-center text-gray-400 py-4 text-sm">Nenhum produto encontrado</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Adicao Rapida por Categoria */}
      {quickAddCategory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-sm w-full">
            <div className="p-4 border-b flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Novo em "{quickAddCategory.name}"</h3>
                {addedCount > 0 && (
                  <span className="text-xs text-green-600">{addedCount} produto(s) adicionado(s)</span>
                )}
              </div>
              <button onClick={closeQuickAdd} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <ImageUpload
                value={quickAddForm.imageUrl}
                onChange={(url) => setQuickAddForm(prev => ({ ...prev, imageUrl: url }))}
                onNameExtracted={(extractedName) => {
                  if (!quickAddForm.name.trim()) {
                    const { brand, volume, alcoholContent, price, description, cleanedName } = processProductName(extractedName);
                    setQuickAddForm(prev => ({ 
                      ...prev, 
                      name: cleanedName,
                      brand: prev.brand || brand || '',
                      volume: prev.volume || volume || '',
                      alcoholContent: prev.alcoholContent || alcoholContent || '',
                      price: prev.price || (price ? price : ''),
                      description: prev.description || description || ''
                    }));
                    // Marcar fonte como Arquivo
                    setQuickAddSources({ title: 'Arquivo', brand: 'Arquivo', volume: 'Arquivo', alcoholContent: 'Arquivo', price: 'Arquivo', description: 'Arquivo' });
                  }
                }}
                onImageAnalyzed={handleQuickAddImageAnalysis}
                label=""
                compact
                enableSmartAnalysis
              />

              <div>
                <div className="flex items-center gap-1 mb-1">
                  <label className="text-[10px] text-gray-500">Nome</label>
                  <SourceBadge source={quickAddSources.title} needsReview={quickAddNeedsReview.includes('title')} />
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={quickAddForm.name}
                    onChange={(e) => {
                      const inputName = e.target.value;
                      const { brand, volume, alcoholContent, price, description, cleanedName } = processProductName(inputName);
                      setQuickAddForm(prev => ({ 
                        ...prev, 
                        name: cleanedName,
                        brand: prev.brand || brand || '',
                        volume: prev.volume || volume || '',
                        alcoholContent: prev.alcoholContent || alcoholContent || '',
                        price: prev.price || (price ? price : ''),
                        description: prev.description || description || ''
                      }));
                    }}
                    placeholder="Nome do produto"
                    className="flex-1 px-3 py-2 border rounded-lg text-sm"
                  />
                  {quickAddForm.name && (
                    <button type="button" onClick={() => setQuickAddForm(prev => ({ ...prev, name: '', brand: '', volume: '', alcoholContent: '', description: '' }))} className="px-2 py-1 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg text-sm">✕</button>
                  )}
                </div>
              </div>

              {/* Precos com regra de 3 */}
              <div className="space-y-2 p-2 bg-gray-50 rounded-lg">
                <p className="text-[10px] text-gray-500">Preencha 2 campos</p>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <div className="flex items-center gap-1">
                      <label className="text-[10px] text-gray-500">V. Original</label>
                      <SourceBadge source={quickAddSources.price} needsReview={quickAddNeedsReview.includes('price')} />
                    </div>
                    <input
                      type="text"
                      value={quickAddForm.price}
                      onChange={(e) => handleQuickAddPriceChange('price', e.target.value)}
                      placeholder="0,00"
                      className={`w-full px-2 py-1.5 border rounded text-sm ${quickAddNeedsReview.includes('price') ? 'border-yellow-400 bg-yellow-50' : ''}`}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500">Desc %</label>
                    <input
                      type="text"
                      value={quickAddForm.discount}
                      onChange={(e) => handleQuickAddPriceChange('discount', e.target.value)}
                      placeholder="0"
                      className="w-full px-2 py-1.5 border rounded text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500">V. Real</label>
                    <input
                      type="text"
                      value={quickAddForm.finalPrice}
                      onChange={(e) => handleQuickAddPriceChange('finalPrice', e.target.value)}
                      placeholder="0,00"
                      className="w-full px-2 py-1.5 border rounded text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Volume, Marca, Teor com badges */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <div className="flex items-center gap-1">
                    <label className="text-[10px] text-gray-500">Volume</label>
                    <SourceBadge source={quickAddSources.volume} />
                  </div>
                  <div className="flex gap-1">
                    <input
                      type="text"
                      value={quickAddForm.volume}
                      onChange={(e) => setQuickAddForm(prev => ({ ...prev, volume: e.target.value }))}
                      placeholder="350ML"
                      className="flex-1 px-2 py-1.5 border rounded text-sm min-w-0"
                    />
                    {quickAddForm.volume && (
                      <button
                        type="button"
                        onClick={() => setQuickAddForm(prev => ({ ...prev, volume: '' }))}
                        className="px-1.5 bg-red-100 hover:bg-red-200 text-red-600 rounded text-xs"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    <label className="text-[10px] text-gray-500">Marca</label>
                    <SourceBadge source={quickAddSources.brand} />
                  </div>
                  <div className="flex gap-1">
                    <input
                      type="text"
                      value={quickAddForm.brand}
                      onChange={(e) => setQuickAddForm(prev => ({ ...prev, brand: e.target.value }))}
                      placeholder="Ex: Heineken"
                      className="flex-1 px-2 py-1.5 border rounded text-sm min-w-0"
                    />
                    {quickAddForm.brand && (
                      <button type="button" onClick={() => setQuickAddForm(prev => ({ ...prev, brand: '' }))} className="px-1.5 bg-red-100 hover:bg-red-200 text-red-600 rounded text-xs">✕</button>
                    )}
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    <label className="text-[10px] text-gray-500">Teor</label>
                    <SourceBadge source={quickAddSources.alcoholContent} needsReview={quickAddNeedsReview.includes('alcoholContent')} />
                  </div>
                  <div className="flex gap-1">
                    <input
                      type="text"
                      value={quickAddForm.alcoholContent}
                      onChange={(e) => setQuickAddForm(prev => ({ ...prev, alcoholContent: e.target.value }))}
                      placeholder="4.5%"
                      className={`flex-1 px-2 py-1.5 border rounded text-sm min-w-0 ${quickAddNeedsReview.includes('alcoholContent') ? 'border-yellow-400 bg-yellow-50' : ''}`}
                    />
                    {quickAddForm.alcoholContent && (
                      <button type="button" onClick={() => setQuickAddForm(prev => ({ ...prev, alcoholContent: '' }))} className="px-1.5 bg-red-100 hover:bg-red-200 text-red-600 rounded text-xs">✕</button>
                    )}
                  </div>
                </div>
              </div>

              {/* Descrição */}
              <div>
                <div className="flex items-center gap-1">
                  <label className="text-[10px] text-gray-500">Descrição</label>
                  <SourceBadge source={quickAddSources.description} />
                </div>
                <div className="flex gap-1">
                  <textarea
                    value={quickAddForm.description}
                    onChange={(e) => setQuickAddForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Descrição do produto..."
                    rows={2}
                    className="flex-1 px-2 py-1.5 border rounded text-sm resize-none"
                  />
                  {quickAddForm.description && (
                    <button type="button" onClick={() => setQuickAddForm(prev => ({ ...prev, description: '' }))} className="px-1.5 bg-red-100 hover:bg-red-200 text-red-600 rounded text-xs self-start">✕</button>
                  )}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleQuickAdd}
                  disabled={isQuickAdding}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                    flashingCells.has('quick-add-success')
                      ? 'bg-green-500 text-white'
                      : 'bg-green-500 hover:bg-green-600 text-white'
                  } disabled:opacity-50`}
                >
                  {isQuickAdding ? 'Salvando...' : 'Salvar + Outro'}
                </button>
                <button
                  onClick={closeQuickAdd}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Adicionar Nova Marca */}
      {showAddBrandModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-xs w-full">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">Nova Marca</h3>
              <button onClick={() => setShowAddBrandModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Nome da Marca</label>
                <input
                  type="text"
                  value={newBrandName}
                  onChange={(e) => setNewBrandName(e.target.value)}
                  placeholder="Ex: Heineken"
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddBrand();
                  }}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowAddBrandModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAddBrand}
                  className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium"
                >
                  Adicionar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Lista de Categorias */}
      {showCategoriesModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderTree className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-gray-800">Categorias</h3>
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{categories.length}</span>
              </div>
              <button onClick={() => setShowCategoriesModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Botões de ação */}
            <div className="p-3 border-b bg-gray-50 flex gap-2">
              <button
                onClick={openNewCategory}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                Nova Categoria
              </button>
              <button
                onClick={() => setShowOrderCategoriesModal(true)}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-sm font-medium"
              >
                <Sparkles className="w-4 h-4" />
                Ordenar
              </button>
            </div>
            
            {/* Lista de categorias */}
            <div className="p-3 overflow-y-auto flex-1">
              <div className="space-y-2">
                {categories.map((cat, index) => {
                  const productCount = products.filter(p => p.category?.id === cat.id).length;
                  const catImage = cat.imageUrl;
                  
                  return (
                    <div key={cat.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg hover:bg-gray-100">
                      {/* Posição */}
                      <span className="text-xs text-gray-400 w-5 text-center font-bold">{index + 1}</span>
                      
                      {/* Imagem */}
                      <div className="relative w-10 h-10 rounded bg-gray-200 overflow-hidden flex-shrink-0">
                        {catImage ? (
                          <Image src={catImage} alt={cat.name} fill className="object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <FolderTree className="w-5 h-5" />
                          </div>
                        )}
                      </div>
                      
                      {/* Nome */}
                      <span className={`flex-1 text-sm font-medium truncate ${cat.hidden ? 'text-gray-400 line-through' : ''}`}>
                        {cat.name}
                      </span>
                      
                      {/* Quantidade */}
                      <span className="text-xs text-gray-400">{productCount}</span>
                      
                      {/* Ações */}
                      <button
                        onClick={() => toggleCategoryHidden(cat)}
                        className={`p-1.5 rounded ${cat.hidden ? 'text-orange-500 hover:bg-orange-100' : 'text-gray-400 hover:bg-gray-200'}`}
                        title={cat.hidden ? 'Categoria escondida - clique para mostrar' : 'Esconder categoria'}
                      >
                        {cat.hidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => openEditCategory(cat)}
                        className="p-1.5 hover:bg-blue-100 rounded text-blue-600"
                        title="Editar"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(cat.id)}
                        className="p-1.5 hover:bg-red-100 rounded text-red-500"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
              
              {categories.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-8">Nenhuma categoria criada ainda.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Nova/Editar Categoria */}
      {(showNewCategoryModal || showEditCategoryModal) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-sm w-full">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">
                {showEditCategoryModal ? 'Editar Categoria' : 'Nova Categoria'}
              </h3>
              <button 
                onClick={() => { setShowNewCategoryModal(false); setShowEditCategoryModal(false); }}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              {/* Upload de imagem */}
              <div>
                <label className="text-sm text-gray-600 mb-2 block">Imagem da Categoria</label>
                <ImageUpload
                  value={categoryForm.imageUrl}
                  onChange={(url) => setCategoryForm(prev => ({ ...prev, imageUrl: url }))}
                  label=""
                  compact
                />
              </div>
              
              {/* Nome */}
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Nome</label>
                <input
                  type="text"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Nome da categoria"
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  autoFocus
                />
              </div>
            </div>
            <div className="p-4 border-t bg-gray-50 flex gap-2">
              <button
                onClick={() => { setShowNewCategoryModal(false); setShowEditCategoryModal(false); }}
                className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveCategory}
                disabled={isSavingCategory}
                className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {isSavingCategory ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Ordenar Categorias (igual aos destaques) */}
      {showOrderCategoriesModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">Ordenar Categorias</h3>
              <button onClick={() => setShowOrderCategoriesModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              <p className="text-xs text-gray-500 mb-3">Clique em uma posição vazia para definir qual categoria aparece nela.</p>
              <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-7 gap-2">
                {Array.from({ length: categories.length }, (_, i) => i + 1).map(pos => {
                  const cat = categoryPositionMap.get(pos);
                  const catImage = cat ? cat.imageUrl : null;
                  
                  return (
                    <div key={pos} className="relative group">
                      {cat ? (
                        <div className="w-full aspect-square bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex flex-col items-center justify-center border-2 border-blue-400 relative overflow-hidden">
                          <span className="absolute top-0.5 left-1 text-[10px] font-bold text-white bg-blue-600 px-1 rounded z-10">{pos}</span>
                          {catImage ? (
                            <Image src={catImage} alt={cat.name} fill className="object-cover" />
                          ) : (
                            <FolderTree className="w-6 h-6 text-blue-500" />
                          )}
                          <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1 py-0.5">
                            <p className="text-[8px] text-white truncate text-center">{cat.name}</p>
                          </div>
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <button
                              onClick={() => removeCategoryFromPosition(cat)}
                              className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white hover:bg-red-600"
                              title="Remover desta posição"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setSelectingCategoryPosition(pos)}
                          disabled={unassignedCategories.length === 0}
                          className="w-full aspect-square bg-gray-100 hover:bg-gray-200 rounded-lg flex flex-col items-center justify-center border-2 border-dashed border-gray-300 hover:border-gray-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <span className="text-sm font-bold text-gray-400">{pos}</span>
                          <Plus className="w-4 h-4 text-gray-400" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
              
              {/* Lista de categorias sem posição */}
              {unassignedCategories.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-xs text-gray-500 mb-2">Categorias sem posição ({unassignedCategories.length}):</p>
                  <div className="flex flex-wrap gap-1">
                    {unassignedCategories.map(cat => (
                      <span key={cat.id} className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">
                        {cat.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="p-4 border-t bg-gray-50">
              <button
                onClick={() => setShowOrderCategoriesModal(false)}
                className="w-full px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm font-medium"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Selecionar Categoria para Posição */}
      {selectingCategoryPosition !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-sm w-full max-h-[70vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold">Posição {selectingCategoryPosition}</h3>
              <button onClick={() => setSelectingCategoryPosition(null)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-2">
              {unassignedCategories.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">Todas as categorias já estão posicionadas.</p>
              ) : (
                unassignedCategories.map(cat => {
                  const catImage = cat.imageUrl;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => assignCategoryToPosition(cat.id)}
                      className="w-full flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg text-left"
                    >
                      <div className="relative w-10 h-10 rounded bg-gray-100 overflow-hidden flex-shrink-0">
                        {catImage ? (
                          <Image src={catImage} alt={cat.name} fill className="object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <FolderTree className="w-5 h-5 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <span className="text-sm font-medium">{cat.name}</span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirmação de Remoção de Destaque */}
      {removeConfirmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-sm w-full">
            <div className="p-4 border-b">
              <h3 className="font-semibold text-gray-800">Remover de Destaque</h3>
            </div>
            <div className="p-4">
              <p className="text-sm text-gray-600 mb-4">
                Deseja remover <strong>{removeConfirmModal.product.name}</strong> do destaque de {removeConfirmModal.type === 'offer' ? 'ofertas' : 'categoria'}?
              </p>
              <div className="space-y-2">
                <button
                  onClick={confirmRemoveComplete}
                  className="w-full px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium"
                >
                  Sim, remover completamente
                </button>
                <p className="text-[10px] text-gray-400 text-center">O próximo produto da estrela entrará automaticamente</p>
                
                <button
                  onClick={confirmMoveToStar}
                  className="w-full px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2"
                >
                  <Star className="w-4 h-4" fill="currentColor" />
                  Mover para Destaque Geral
                </button>
                <p className="text-[10px] text-gray-400 text-center">O card ficará vazio para escolher outro produto</p>
                
                <button
                  onClick={() => setRemoveConfirmModal(null)}
                  className="w-full px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm font-medium"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
