"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Search,
  ShoppingBag,
  Loader2,
  Clock,
  CheckCircle,
  XCircle,
  Truck,
  Package,
  Eye,
} from "lucide-react";
import { toast } from "sonner";

const statusLabels: Record<string, { label: string; color: string; icon: any }> = {
  PENDING: { label: "Pendente", color: "bg-amber-100 text-amber-700", icon: Clock },
  PROCESSING: { label: "Processando", color: "bg-blue-100 text-blue-700", icon: Package },
  CONFIRMED: { label: "Confirmado", color: "bg-green-100 text-green-700", icon: CheckCircle },
  DELIVERED: { label: "Entregue", color: "bg-emerald-100 text-emerald-700", icon: Truck },
  CANCELLED: { label: "Cancelado", color: "bg-red-100 text-red-700", icon: XCircle },
};

export function OrdersList() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [filter, setFilter] = useState("");

  const fetchOrders = async () => {
    try {
      const url = filter ? `/api/admin/orders?status=${filter}` : "/api/admin/orders";
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setOrders(data ?? []);
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [filter]);

  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        toast.success("Status atualizado!");
        fetchOrders();
        if (selectedOrder?.id === orderId) {
          setSelectedOrder({ ...selectedOrder, status });
        }
      } else {
        toast.error("Erro ao atualizar status");
      }
    } catch (error) {
      toast.error("Erro ao atualizar status");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Pedidos</h1>
        <p className="text-gray-600 mt-1">Gerencie os pedidos da loja</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter("")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === "" ? "bg-green-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Todos
          </button>
          {Object.entries(statusLabels).map(([key, value]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === key ? "bg-green-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {value.label}
            </button>
          ))}
        </div>
      </div>

      {/* Orders list */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
        </div>
      ) : (orders ?? []).length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {(orders ?? []).map((order: any, index: number) => {
            const statusInfo = statusLabels[order?.status ?? 'PENDING'] ?? statusLabels.PENDING;
            const StatusIcon = statusInfo.icon;

            return (
              <motion.div
                key={order?.id ?? index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedOrder(order)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="font-semibold text-gray-900">{order?.customerName ?? 'Cliente'}</p>
                    <p className="text-sm text-gray-500">{order?.customerPhone ?? ''}</p>
                  </div>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusInfo.color}`}>
                    <StatusIcon className="w-4 h-4 mr-1" />
                    {statusInfo.label}
                  </span>
                </div>

                <div className="space-y-2 text-sm text-gray-600">
                  <p className="truncate">{order?.address ?? ''}</p>
                  <p>{order?.createdAt ? new Date(order.createdAt).toLocaleString("pt-BR") : ''}</p>
                </div>

                <div className="mt-4 pt-4 border-t flex items-center justify-between">
                  <span className="text-lg font-bold text-green-600">
                    R$ {(order?.total ?? 0).toFixed(2)}
                  </span>
                  <button className="text-gray-500 hover:text-green-600 transition-colors">
                    <Eye className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-xl p-12 text-center shadow-sm">
          <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">Nenhum pedido encontrado</h3>
          <p className="text-gray-500">Os pedidos aparecerão aqui quando forem realizados</p>
        </div>
      )}

      {/* Order detail modal */}
      {selectedOrder && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedOrder(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold text-gray-900">Detalhes do Pedido</h2>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <p className="text-sm text-gray-500">Cliente</p>
                <p className="font-medium">{selectedOrder?.customerName ?? 'Cliente'}</p>
                <p className="text-sm text-gray-600">{selectedOrder?.customerPhone ?? ''}</p>
                {selectedOrder?.customerEmail && (
                  <p className="text-sm text-gray-600">{selectedOrder.customerEmail}</p>
                )}
              </div>

              <div>
                <p className="text-sm text-gray-500">Endereço</p>
                <p className="font-medium">{selectedOrder?.address ?? ''}</p>
                {selectedOrder?.complement && <p className="text-sm text-gray-600">{selectedOrder.complement}</p>}
                <p className="text-sm text-gray-600">
                  {[selectedOrder?.neighborhood, selectedOrder?.city, selectedOrder?.state].filter(Boolean).join(" - ")}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500 mb-2">Itens</p>
                <div className="space-y-2">
                  {(selectedOrder?.items ?? []).map((item: any, i: number) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span>{item?.quantity ?? 1}x {item?.name ?? 'Produto'}</span>
                      <span>R$ {((item?.finalPrice ?? 0) * (item?.quantity ?? 1)).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>R$ {(selectedOrder?.subtotal ?? 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Entrega</span>
                  <span>R$ {(selectedOrder?.deliveryFee ?? 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span className="text-green-600">R$ {(selectedOrder?.total ?? 0).toFixed(2)}</span>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-500 mb-2">Atualizar Status</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(statusLabels).map(([key, value]) => (
                    <button
                      key={key}
                      onClick={() => updateOrderStatus(selectedOrder.id, key)}
                      className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                        selectedOrder.status === key
                          ? value.color
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {value.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 border-t">
              <button
                onClick={() => setSelectedOrder(null)}
                className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors"
              >
                Fechar
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
