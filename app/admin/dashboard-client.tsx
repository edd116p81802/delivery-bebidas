'use client';

import { useState, useEffect, useMemo } from 'react';
import { DollarSign, CreditCard, QrCode, ShoppingCart, TrendingUp, FolderTree, Trash2, AlertTriangle, ChevronRight, User, Phone, Mail, Search, Filter, MessageCircle, Eye, ChevronLeft, X, MapPin, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';

interface Cliente {
  id: string;
  nome: string;
  telefone: string;
  email: string;
  cpf: string | null;
  endereco: string | null;
  valor: number;
  tags: string[];
  items: any[];
  data: string;
}

interface DashboardMetrics {
  receitaBruta: number;
  pixGerado: number;
  pixCopiado: number;
  totalCartao: number;
  abandonados: number;
  ultimosClientes: Cliente[];
  topProducts: { name: string; revenue: number }[];
  topCategories: { name: string; revenue: number }[];
}

const ITEMS_PER_PAGE = 20;

const TAG_COLORS: Record<string, string> = {
  'CARTÃO CONFIRMADO': 'bg-blue-100 text-blue-700',
  'PIX COPIADO': 'bg-green-100 text-green-700',
  'PIX GERADO': 'bg-yellow-100 text-yellow-700',
  'ABANDONOU': 'bg-red-100 text-red-700'
};

const formatCurrency = (value: number | undefined | null) => {
  if (value === undefined || value === null || isNaN(value)) {
    return 'R$ 0,00';
  }
  return `R$ ${value.toFixed(2).replace('.', ',')}`;
};

export default function DashboardClient() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [showClearModal, setShowClearModal] = useState(false);
  const [showProductsModal, setShowProductsModal] = useState(false);
  const [showCategoriesModal, setShowCategoriesModal] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  
  // Estados para filtros e paginação de clientes
  const [searchName, setSearchName] = useState('');
  const [searchCpf, setSearchCpf] = useState('');
  const [filterTag, setFilterTag] = useState('TODOS');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedClient, setSelectedClient] = useState<Cliente | null>(null);

  useEffect(() => {
    fetch('/api/admin/dashboard-metrics', {
      credentials: 'include'
    })
      .then(r => r.json())
      .then(data => {
        // Verificar se a resposta é válida (não é um erro)
        if (data && !data.error && typeof data.receitaBruta !== 'undefined') {
          setMetrics({
            receitaBruta: data.receitaBruta ?? 0,
            pixGerado: data.pixGerado ?? 0,
            pixCopiado: data.pixCopiado ?? 0,
            totalCartao: data.totalCartao ?? 0,
            abandonados: data.abandonados ?? 0,
            ultimosClientes: data.ultimosClientes ?? [],
            topProducts: data.topProducts ?? [],
            topCategories: data.topCategories ?? []
          });
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Filtrar clientes por busca (nome E cpf) e tag
  const filteredClients = useMemo(() => {
    if (!metrics?.ultimosClientes) return [];
    return metrics.ultimosClientes.filter(client => {
      // 1. Busca por NOME (parcial, case-insensitive)
      const nameLower = searchName.toLowerCase().trim();
      const clientName = (client.nome || '').toLowerCase();
      const matchesName = !nameLower || clientName.includes(nameLower);
      
      // 2. Busca por CPF (parcial, apenas números)
      const cpfDigits = searchCpf.replace(/\D/g, '');
      const clientCpf = (client.cpf || '').replace(/\D/g, '');
      const matchesCpf = !cpfDigits || clientCpf.includes(cpfDigits);
      
      // 3. Filtro por tag
      let matchesTag = true;
      if (filterTag !== 'TODOS') {
        if (filterTag === 'CLIENTES PIX') {
          matchesTag = client.tags.some(t => t === 'PIX GERADO' || t === 'PIX COPIADO');
        } else {
          matchesTag = client.tags.includes(filterTag);
        }
      }
      
      return matchesName && matchesCpf && matchesTag;
    });
  }, [metrics?.ultimosClientes, searchName, searchCpf, filterTag]);

  // Paginação
  const totalPages = Math.ceil(filteredClients.length / ITEMS_PER_PAGE);
  const paginatedClients = filteredClients.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Reset página quando filtros mudam
  useEffect(() => {
    setCurrentPage(1);
  }, [searchName, searchCpf, filterTag]);

  // Extrai endereço resumido: Bairro, Cidade-UF
  const getShortAddress = (address: string | null) => {
    if (!address) return null;
    const parts = address.split(',').map(p => p.trim());
    if (parts.length >= 3) {
      return parts.slice(-2).join(', ');
    }
    return address.length > 35 ? '...' + address.slice(-32) : address;
  };

  const handleClearMetrics = async () => {
    setIsClearing(true);
    try {
      const res = await fetch('/api/admin/clear-metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmation: 'ZERAR METRICAS' })
      });
      if (res.ok) {
        toast.success('Métricas zeradas!');
        setShowClearModal(false);
        window.location.reload();
      } else {
        toast.error('Erro ao zerar');
      }
    } catch {
      toast.error('Erro ao zerar');
    } finally {
      setIsClearing(false);
    }
  };

  const formatPhone = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return `(${cleaned.slice(0,2)}) ${cleaned.slice(2,7)}-${cleaned.slice(7)}`;
    }
    return phone;
  };

  const formatCpf = (cpf: string) => {
    if (!cpf) return '-';
    const cleaned = cpf.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9)}`;
    }
    return cpf;
  };

  const openWhatsApp = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    const phoneWithCountry = cleaned.startsWith('55') ? cleaned : `55${cleaned}`;
    window.open(`https://wa.me/${phoneWithCountry}?text=Olá`, '_blank');
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full"></div></div>;
  }

  if (!metrics) {
    return <div className="text-center text-gray-500 py-8">Erro ao carregar métricas</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header compacto */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500">Visão geral em tempo real</p>
        </div>
        <button
          onClick={() => setShowClearModal(true)}
          className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Zerar
        </button>
      </div>

      {/* Cards de Métricas - 5 colunas compactas */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Receita Bruta - Laranja */}
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-4 text-white shadow-lg">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 opacity-80" />
            <span className="text-xs font-medium opacity-90">Receita Bruta</span>
          </div>
          <p className="text-lg font-bold">{formatCurrency(metrics.receitaBruta)}</p>
        </div>

        {/* PIX Gerado - Amarelo */}
        <div className="bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-xl p-4 text-white shadow-lg">
          <div className="flex items-center gap-2 mb-1">
            <QrCode className="w-4 h-4 opacity-80" />
            <span className="text-xs font-medium opacity-90">PIX Gerado</span>
          </div>
          <p className="text-lg font-bold">{formatCurrency(metrics.pixGerado)}</p>
        </div>

        {/* PIX Copiado - Verde */}
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white shadow-lg">
          <div className="flex items-center gap-2 mb-1">
            <QrCode className="w-4 h-4 opacity-80" />
            <span className="text-xs font-medium opacity-90">PIX Copiado</span>
          </div>
          <p className="text-lg font-bold">{formatCurrency(metrics.pixCopiado)}</p>
        </div>

        {/* Total Cartão - Azul */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white shadow-lg">
          <div className="flex items-center gap-2 mb-1">
            <CreditCard className="w-4 h-4 opacity-80" />
            <span className="text-xs font-medium opacity-90">Total Cartão</span>
          </div>
          <p className="text-lg font-bold">{formatCurrency(metrics.totalCartao)}</p>
        </div>

        {/* Abandonados - Vermelho */}
        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-4 text-white shadow-lg">
          <div className="flex items-center gap-2 mb-1">
            <ShoppingCart className="w-4 h-4 opacity-80" />
            <span className="text-xs font-medium opacity-90">Abandonados</span>
          </div>
          <p className="text-lg font-bold">{formatCurrency(metrics.abandonados)}</p>
        </div>
      </div>

      {/* Blocos Compactos - Produtos e Categorias lado a lado */}
      <div className="grid lg:grid-cols-2 gap-3">
        {/* Top Produtos - Compacto */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-orange-500" />
              <span className="text-sm font-bold">Top Produtos</span>
            </div>
            <button 
              onClick={() => setShowProductsModal(true)}
              className="text-xs text-orange-500 hover:text-orange-600 font-medium flex items-center gap-1"
            >
              Ver Mais <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          {metrics.topProducts.length > 0 ? (
            <div className="space-y-2">
              {metrics.topProducts.slice(0, 3).map((p, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className="w-5 h-5 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-xs font-bold">{i+1}</span>
                  <span className="flex-1 truncate text-gray-700">{p.name}</span>
                  <span className="font-bold text-orange-500">{formatCurrency(p.revenue)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400 text-center py-2">Sem dados</p>
          )}
        </div>

        {/* Top Categorias - Compacto */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <FolderTree className="w-4 h-4 text-purple-500" />
              <span className="text-sm font-bold">Top Categorias</span>
            </div>
            <button 
              onClick={() => setShowCategoriesModal(true)}
              className="text-xs text-purple-500 hover:text-purple-600 font-medium flex items-center gap-1"
            >
              Ver Mais <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          {metrics.topCategories.length > 0 ? (
            <div className="space-y-2">
              {metrics.topCategories.slice(0, 3).map((c, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className="w-5 h-5 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-xs font-bold">{i+1}</span>
                  <span className="flex-1 truncate text-gray-700">{c.name}</span>
                  <span className="font-bold text-purple-500">{formatCurrency(c.revenue)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400 text-center py-2">Sem dados</p>
          )}
        </div>
      </div>

      {/* Lista de Clientes com Filtros */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-500" />
                <h2 className="font-bold text-gray-900">Clientes</h2>
                <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-medium">
                  {filteredClients.length} de {metrics.ultimosClientes.length}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">Clientes que interagiram com o checkout</p>
            </div>
          </div>

          {/* Filtros - 2 caixas separadas */}
          <div className="flex flex-wrap gap-2">
            {/* Busca por NOME */}
            <div className="relative flex-1 min-w-[120px]">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar nome..."
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Busca por CPF */}
            <div className="w-32">
              <input
                type="text"
                placeholder="CPF..."
                value={searchCpf}
                onChange={(e) => setSearchCpf(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Filtro por Tag */}
            <select
              value={filterTag}
              onChange={(e) => setFilterTag(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="TODOS">Todos</option>
              <option value="CARTÃO CONFIRMADO">Cartão</option>
              <option value="PIX GERADO">PIX Gerado</option>
              <option value="PIX COPIADO">PIX Copiado</option>
              <option value="CLIENTES PIX">PIX (Todos)</option>
              <option value="ABANDONOU">Abandonou</option>
            </select>
          </div>
        </div>

        {paginatedClients.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Cliente</th>
                  <th className="text-center px-3 py-2 text-xs font-semibold text-gray-500 uppercase w-32">Status</th>
                  <th className="text-right px-3 py-2 text-xs font-semibold text-gray-500 uppercase w-40">Valor / Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedClients.map((cliente, i) => (
                  <tr key={i} className="hover:bg-gray-50 transition-colors">
                    {/* Cliente com endereço */}
                    <td className="px-3 py-1.5">
                      <p className="font-semibold text-gray-900 text-sm truncate max-w-[200px]">{cliente.nome}</p>
                      <p className="text-gray-400 text-[11px]">{formatPhone(cliente.telefone)}</p>
                      {cliente.endereco && (
                        <p className="text-gray-300 text-[10px] truncate max-w-[200px]">{getShortAddress(cliente.endereco)}</p>
                      )}
                    </td>

                    {/* Tags - Empilhadas verticalmente */}
                    <td className="px-3 py-1.5">
                      <div className="flex flex-col items-center gap-0.5">
                        {cliente.tags.map((tag, j) => (
                          <span key={j} className={`px-2 py-0.5 rounded text-[10px] font-medium whitespace-nowrap ${TAG_COLORS[tag] || 'bg-gray-100 text-gray-700'}`}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* Valor + Ações */}
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-end gap-2">
                        <span className="font-bold text-green-600 text-sm whitespace-nowrap">
                          R$ {cliente.valor.toFixed(2).replace('.', ',')}
                        </span>
                        <button
                          onClick={() => openWhatsApp(cliente.telefone)}
                          className="p-1.5 bg-green-500 hover:bg-green-600 text-white rounded"
                          title="WhatsApp"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setSelectedClient(cliente)}
                          className="p-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded"
                          title="Detalhes"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-gray-400">
            <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Nenhum cliente encontrado</p>
          </div>
        )}

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              <ChevronLeft className="w-4 h-4" />
              Anterior
            </button>
            <span className="text-sm text-gray-600">
              Página {currentPage} de {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Próximo
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Modal Ver Detalhes */}
      {selectedClient && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">Detalhes do Cliente</h3>
              <button onClick={() => setSelectedClient(null)} className="p-2 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Nome */}
              <div>
                <p className="text-sm text-gray-500">Nome</p>
                <p className="font-bold text-lg">{selectedClient.nome}</p>
              </div>

              {/* Telefone */}
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Telefone</p>
                  <p className="font-medium">{formatPhone(selectedClient.telefone)}</p>
                </div>
              </div>

              {/* Email */}
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium">{selectedClient.email || '-'}</p>
                </div>
              </div>

              {/* CPF */}
              {selectedClient.cpf && (
                <div>
                  <p className="text-sm text-gray-500">CPF</p>
                  <p className="font-medium font-mono">{formatCpf(selectedClient.cpf)}</p>
                </div>
              )}

              {/* Endereço */}
              {selectedClient.endereco && (
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-gray-400 mt-1" />
                  <div>
                    <p className="text-sm text-gray-500">Endereço</p>
                    <p className="font-medium">{selectedClient.endereco}</p>
                  </div>
                </div>
              )}

              {/* Valor Total */}
              <div className="bg-green-50 p-4 rounded-xl">
                <p className="text-sm text-green-600">Valor Total</p>
                <p className="font-bold text-2xl text-green-700">
                  R$ {selectedClient.valor.toFixed(2).replace('.', ',')}
                </p>
              </div>

              {/* Tags */}
              <div>
                <p className="text-sm text-gray-500 mb-2">Status</p>
                <div className="flex flex-wrap gap-1">
                  {selectedClient.tags.map((tag, i) => (
                    <span key={i} className={`px-3 py-1 rounded-full text-sm font-medium ${TAG_COLORS[tag] || 'bg-gray-100 text-gray-700'}`}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Itens do Pedido */}
              {selectedClient.items && Array.isArray(selectedClient.items) && selectedClient.items.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <ShoppingBag className="w-4 h-4 text-gray-400" />
                    <p className="text-sm text-gray-500">Itens do Pedido</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                    {selectedClient.items.map((item: any, i: number) => (
                      <div key={i} className="flex justify-between items-center text-sm">
                        <span className="text-gray-700">
                          {item.quantity}x {item.name}
                        </span>
                        <span className="font-medium">
                          R$ {((item.finalPrice || item.price || 0) * (item.quantity || 1)).toFixed(2).replace('.', ',')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Botão WhatsApp */}
              <button
                onClick={() => openWhatsApp(selectedClient.telefone)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-medium"
              >
                <MessageCircle className="w-5 h-5" />
                Abrir WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Zerar Métricas */}
      {showClearModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-5 max-w-sm w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h3 className="font-bold">Zerar Métricas</h3>
                <p className="text-xs text-gray-500">Ação irreversível</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-4">Isso deletará todos os pedidos e zerará a receita.</p>
            <div className="flex gap-2">
              <button onClick={() => setShowClearModal(false)} className="flex-1 py-2 border rounded-lg text-sm font-medium hover:bg-gray-50">Cancelar</button>
              <button onClick={handleClearMetrics} disabled={isClearing} className="flex-1 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 disabled:opacity-50">
                {isClearing ? 'Zerando...' : 'Sim, Zerar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Top Produtos */}
      {showProductsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-5 max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold flex items-center gap-2"><TrendingUp className="w-5 h-5 text-orange-500" />Top Produtos</h3>
              <button onClick={() => setShowProductsModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            {metrics.topProducts.length > 0 ? (
              <div className="space-y-2">
                {metrics.topProducts.map((p, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <span className="w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-xs font-bold">{i+1}</span>
                    <span className="flex-1 truncate">{p.name}</span>
                    <span className="font-bold text-orange-500">{formatCurrency(p.revenue)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-center py-4">Sem dados</p>
            )}
          </div>
        </div>
      )}

      {/* Modal Top Categorias */}
      {showCategoriesModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-5 max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold flex items-center gap-2"><FolderTree className="w-5 h-5 text-purple-500" />Top Categorias</h3>
              <button onClick={() => setShowCategoriesModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            {metrics.topCategories.length > 0 ? (
              <div className="space-y-2">
                {metrics.topCategories.map((c, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <span className="w-6 h-6 bg-purple-500 text-white rounded-full flex items-center justify-center text-xs font-bold">{i+1}</span>
                    <span className="flex-1 truncate">{c.name}</span>
                    <span className="font-bold text-purple-500">{formatCurrency(c.revenue)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-center py-4">Sem dados</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
