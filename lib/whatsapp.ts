export interface WhatsAppCustomerData {
  phone: string;
  name?: string | null;
  address?: string | null;
  items?: any;
}

export function formatCustomerName(name?: string | null): string {
  if (!name || !name.trim()) return '';
  const trimmed = name.trim();
  // Se estiver tudo em maiúsculo (caps lock), converte para Title Case (ex: "CAMILLY VITORIA" -> "Camilly Vitoria")
  if (trimmed === trimmed.toUpperCase() && trimmed.length > 2) {
    return trimmed
      .toLowerCase()
      .split(' ')
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }
  return trimmed;
}

export function formatOrderItems(items: any): string {
  if (!items) return 'Itens do carrinho';
  let list = items;
  if (typeof items === 'string') {
    try {
      list = JSON.parse(items);
    } catch {
      return items;
    }
  }
  if (Array.isArray(list) && list.length > 0) {
    return list
      .map((it: any) => `${it.quantity || 1}x ${it.name || 'Produto'}`)
      .join(', ');
  }
  return 'Itens do carrinho';
}

export function createPendingOrderWhatsAppMessage(params: {
  name?: string | null;
  address?: string | null;
  items?: any;
}): string {
  const name = formatCustomerName(params.name);
  const saudacao = name ? `Olá, *${name}*! Tudo bem? 👋` : `Olá! Tudo bem? 👋`;
  const items = formatOrderItems(params.items);
  const address = params.address?.trim() || 'Endereço cadastrado';

  return (
    `${saudacao}\n\n` +
    `*Seu pedido:* ${items}\n` +
    `*Para o endereço:* ${address}\n\n` +
    `Ainda consta como pendente em nosso sistema. Deseja continuar?`
  );
}

export function openCustomerWhatsApp(customer: WhatsAppCustomerData) {
  const cleaned = (customer.phone || '').replace(/\D/g, '');
  if (!cleaned) return;
  const phoneWithCountry = cleaned.startsWith('55') ? cleaned : `55${cleaned}`;
  const message = createPendingOrderWhatsAppMessage({
    name: customer.name,
    address: customer.address,
    items: customer.items,
  });

  window.open(`https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(message)}`, '_blank');
}
