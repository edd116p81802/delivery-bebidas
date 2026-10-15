'use client';

import { useState, useEffect, useMemo } from 'react';
import { Trash2, AlertTriangle, Users, Search, Filter, MessageCircle, Eye, ChevronLeft, ChevronRight, X, Phone, Mail, MapPin, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';

interface Client {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerCpf: string | null;
  customerAddress: string | null;
  total: number;
  items: any[];
  tags: string[];
  createdAt: string;
}

const ITEMS_PER_PAGE = 20;

const TAG_COLORS: Record<string, string> = {
  'CARTÃO CONFIRMADO': 'bg-blue-100 text-blue-700',
  'PIX COPIADO': 'bg-green-100 text-green-700',
  'PIX GERADO': 'bg-yellow-100 text-yellow-700',
  'ABANDONOU': 'bg-red-100 text-red-700'
};

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showClearModal, setShowClearModal] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [searchName, setSearchName] = useState('');
  const [searchCpf, setSearchCpf] = useState('');
  const [filterTag, setFilterTag] = useState('TODOS');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const res = await fetch('/api/admin/clients');
      const data = await res.json();
      setClients(data.clients || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  // Filtrar clientes por busca (nome E cpf) e tag
  const filteredClients = useMemo(() => {
    return clients.filter(client => {
      // 1. Busca por NOME (parcial, case-insensitive)
      const nameLower = searchName.toLowerCase().trim();
      const clientName = (client.customerName || '').toLowerCase();
      const matchesName = !nameLower || clientName.includes(nameLower);
      
      // 2. Busca por CPF (parcial, apenas números)
      const cpfDigits = searchCpf.replace(/\D/g, '');
      const clientCpf = (client.customerCpf || '').replace(/\D/g, '');
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
  }, [clients, searchName, searchCpf, filterTag]);

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

  const handleClearAll = async () => {
    setIsClearing(true);
    try {
      const res = await fetch('/api/admin/clear-clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmation: 'APAGAR CLIENTES' })
      });

      if (res.ok) {
        toast.success('Clientes apagados com sucesso!');
        setShowClearModal(false);
        fetchClients();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Erro ao apagar clientes');
      }
    } catch (error) {
      toast.error('Erro ao apagar clientes');
    } finally {
      setIsClearing(false);
    }
  };

  const formatCpf = (cpf: string) => {
    if (!cpf) return '-';
    const cleaned = cpf.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9)}`;
    }
    return cpf;
  };

  const formatPhone = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
    }
    return phone;
  };

  const openWhatsApp = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    const phoneWithCountry = cleaned.startsWith('55') ? cleaned : `55${cleaned}`;
    window.open(`https://wa.me/${phoneWithCountry}?text=Olá`, '_blank');
  };

  // Extrai endereço resumido: Estado, Cidade, Bairro
  const getShortAddress = (address: string | null) => {
    if (!address) return null;
    // Tenta extrair partes do endereço (formato comum: "Rua X, 123, Bairro, Cidade - UF")
    const parts = address.split(',').map(p => p.trim());
    if (parts.length >= 3) {
      // Pega os últimos elementos (geralmente Bairro, Cidade-UF)
      const lastParts = parts.slice(-2);
      return lastParts.join(', ');
    }
    // Se não conseguir parsear, retorna os últimos 30 caracteres
    return address.length > 35 ? '...' + address.slice(-32) : address;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Users className="w-6 h-6 text-blue-500" />
          <h1 className="text-2xl font-bold">Clientes</h1>
          <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-medium">
            {filteredClients.length}/{clients.length}
          </span>
        </div>
        {clients.length > 0 && (
          <button
            onClick={() => setShowClearModal(true)}
            className="flex items-center gap-1 bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs"
          >
            <Trash2 className="w-3 h-3" />
            Apagar
          </button>
        )}
      </div>

      {/* Filtros - 2 caixas de busca */}
      <div className="flex flex-wrap gap-2">
        {/* Busca por NOME */}
        <div className="relative flex-1 min-w-[150px]">
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
        <div className="relative w-36">
          <input
            type="text"
            placeholder="Buscar CPF..."
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

      {/* Lista de Clientes - Layout Compacto */}
      <div className="bg-white rounded-2xl shadow-md overflow-hidden">
        {isLoading ? (
          <div className="p-4 text-center">
            <div className="animate-spin w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
          </div>
        ) : paginatedClients.length === 0 ? (
          <p className="text-center py-6 text-gray-500 text-sm">Nenhum cliente encontrado</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              {/* Cabeçalho */}
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Cliente</th>
                  <th className="text-center px-3 py-2 text-xs font-semibold text-gray-500 uppercase w-36">Status</th>
                  <th className="text-right px-3 py-2 text-xs font-semibold text-gray-500 uppercase w-44">Valor / Ações</th>
                </tr>
              </thead>
              {/* Corpo */}
              <tbody className="divide-y divide-gray-100">
                {paginatedClients.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    {/* Cliente - Compacto com endereço */}
                    <td className="px-3 py-1.5">
                      <p className="font-semibold text-gray-900 text-sm truncate max-w-[220px]">{c.customerName}</p>
                      <p className="text-gray-400 text-[11px]">{formatPhone(c.customerPhone)}</p>
                      {c.customerAddress && (
                        <p className="text-gray-300 text-[10px] truncate max-w-[220px]">{getShortAddress(c.customerAddress)}</p>
                      )}
                    </td>

                    {/* Tags - Empilhadas verticalmente */}
                    <td className="px-3 py-2">
                      <div className="flex flex-col items-center gap-0.5">
                        {c.tags.map((tag, i) => (
                          <span 
                            key={i} 
                            className={`px-2 py-0.5 rounded text-[10px] font-medium whitespace-nowrap ${TAG_COLORS[tag] || 'bg-gray-100 text-gray-700'}`}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* Valor + Ações juntos */}
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-end gap-2">
                        <span className="font-bold text-green-600 text-sm whitespace-nowrap">
                          R$ {c.total.toFixed(2).replace('.', ',')}
                        </span>
                        <button
                          onClick={() => openWhatsApp(c.customerPhone)}
                          className="p-1.5 bg-green-500 hover:bg-green-600 text-white rounded"
                          title="WhatsApp"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setSelectedClient(c)}
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
        )}

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="flex items-center gap-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
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
              className="flex items-center gap-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
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
                <p className="font-bold text-lg">{selectedClient.customerName}</p>
              </div>

              {/* Telefone */}
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Telefone</p>
                  <p className="font-medium">{formatPhone(selectedClient.customerPhone)}</p>
                </div>
              </div>

              {/* Email */}
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium">{selectedClient.customerEmail || '-'}</p>
                </div>
              </div>

              {/* CPF */}
              {selectedClient.customerCpf && (
                <div>
                  <p className="text-sm text-gray-500">CPF</p>
                  <p className="font-medium font-mono">{formatCpf(selectedClient.customerCpf)}</p>
                </div>
              )}

              {/* Endereço */}
              {selectedClient.customerAddress && (
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-gray-400 mt-1" />
                  <div>
                    <p className="text-sm text-gray-500">Endereço</p>
                    <p className="font-medium">{selectedClient.customerAddress}</p>
                  </div>
                </div>
              )}

              {/* Valor Total */}
              <div className="bg-green-50 p-4 rounded-xl">
                <p className="text-sm text-green-600">Valor Total</p>
                <p className="font-bold text-2xl text-green-700">
                  R$ {selectedClient.total.toFixed(2).replace('.', ',')}
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
                onClick={() => openWhatsApp(selectedClient.customerPhone)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-medium"
              >
                <MessageCircle className="w-5 h-5" />
                Abrir WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação Apagar */}
      {showClearModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Apagar Todos os Clientes</h3>
                <p className="text-sm text-gray-500">Esta ação não pode ser desfeita</p>
              </div>
            </div>
            
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
              <p className="text-sm text-red-700">
                <strong>Atenção:</strong> Isso irá deletar TODOS os {clients.length} clientes registrados.
              </p>
            </div>

            <p className="text-center text-gray-700 mb-6 font-medium">
              Realmente deseja apagar todos os clientes?
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowClearModal(false)}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 font-medium"
              >
                Não
              </button>
              <button
                onClick={handleClearAll}
                disabled={isClearing}
                className="flex-1 px-4 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 disabled:opacity-50 font-medium"
              >
                {isClearing ? 'Apagando...' : 'Sim, Apagar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
