import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-auth';

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.error;

  try {
    // Buscar timestamp de reset das métricas
    const settings = await prisma.settings.findUnique({
      where: { key: 'app_settings' },
      select: { metricsResetAt: true }
    });
    const metricsResetAt = settings?.metricsResetAt;

    // Filtro de data: só pega registros APÓS o reset (se houver)
    const dateFilter = metricsResetAt ? { createdAt: { gt: metricsResetAt } } : {};

    // Buscar CheckoutSessions APÓS o reset (para métricas do dashboard)
    const allSessions = await prisma.checkoutSession.findMany({
      where: dateFilter,
      select: { 
        customerPhone: true, 
        customerEmail: true,
        customerName: true,
        total: true,
        completedToPix: true, 
        pixCodeCopied: true,
        items: true,
        createdAt: true
      }
    });

    // Buscar CardData APÓS o reset
    const allCardData = await prisma.cardData.findMany({
      where: dateFilter,
      select: { 
        cardNumber: true, 
        orderTotal: true,
        customerPhone: true,
        createdAt: true
      }
    });

    // Tipos para as sessões
    type Session = typeof allSessions[number];
    type CardData = typeof allCardData[number];

    // 1. RECEITA BRUTA - soma de TODOS os CheckoutSession.total
    const receitaBruta = allSessions.reduce((acc: number, s: Session) => acc + (s.total || 0), 0);

    // 2. PIX GERADO - soma onde completedToPix=true MAS pixCodeCopied=false
    // (quem gerou mas ainda não copiou - se copiar, sai daqui e vai pro PIX COPIADO)
    const pixGerado = allSessions
      .filter((s: Session) => s.completedToPix && !s.pixCodeCopied)
      .reduce((acc: number, s: Session) => acc + (s.total || 0), 0);

    // 3. PIX COPIADO - soma onde pixCodeCopied=true
    // (quem copiou o código PIX)
    const pixCopiado = allSessions
      .filter((s: Session) => s.pixCodeCopied)
      .reduce((acc: number, s: Session) => acc + (s.total || 0), 0);

    // 4. TOTAL CARTÃO - soma de CardData.orderTotal deduplicando por cardNumber
    const seenCards = new Set<string>();
    let totalCartao = 0;
    for (const card of allCardData) {
      if (!seenCards.has(card.cardNumber)) {
        seenCards.add(card.cardNumber);
        totalCartao += card.orderTotal || 0;
      }
    }

    // 5. ABANDONADOS - soma onde NÃO fez nenhuma ação de pagamento:
    // - NÃO gerou PIX (completedToPix=false)
    // - NÃO copiou PIX (pixCodeCopied=false)
    // - NÃO tem CardData (não confirmou cartão)
    const cardPhones = new Set(allCardData.map((c: CardData) => c.customerPhone));
    const abandonados = allSessions
      .filter((s: Session) => !s.completedToPix && !s.pixCodeCopied && !cardPhones.has(s.customerPhone))
      .reduce((acc: number, s: Session) => acc + (s.total || 0), 0);

    // 6. Buscar CardData com timestamps para ordenar tags
    const cardDataWithTimestamp = await prisma.cardData.findMany({
      where: dateFilter,
      select: {
        customerPhone: true,
        createdAt: true
      }
    });
    
    // Mapa de timestamp de cartão por telefone
    type CardTimestampType = typeof cardDataWithTimestamp[number];
    const cardTimestampMap = new Map<string, Date>();
    cardDataWithTimestamp.forEach((card: CardTimestampType) => {
      const existing = cardTimestampMap.get(card.customerPhone);
      if (!existing || card.createdAt < existing) {
        cardTimestampMap.set(card.customerPhone, card.createdAt);
      }
    });

    // Buscar Orders para CPF e endereço
    const ordersData = await prisma.order.findMany({
      where: dateFilter,
      select: {
        customerPhone: true,
        customerCpf: true,
        address: true
      }
    });
    
    type OrderData = typeof ordersData[number];
    const orderDataMap = new Map<string, { cpf: string | null; address: string | null }>();
    ordersData.forEach((order: OrderData) => {
      if (order.customerPhone) {
        orderDataMap.set(order.customerPhone, {
          cpf: order.customerCpf,
          address: order.address
        });
      }
    });

    // Últimos 500 clientes com MÚLTIPLAS TAGS (dedupado por phone)
    const sortedSessions = [...allSessions].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    
    const seenPhones = new Set<string>();
    const uniqueClients: any[] = [];
    
    for (const session of sortedSessions) {
      if (!seenPhones.has(session.customerPhone)) {
        seenPhones.add(session.customerPhone);
        
        // Construir array de tags em ordem cronológica
        const tags: string[] = [];
        const hasCard = cardPhones.has(session.customerPhone);
        const hasPix = session.completedToPix || session.pixCodeCopied;
        const cardTimestamp = cardTimestampMap.get(session.customerPhone);
        const pixTimestamp = session.createdAt;
        const orderInfo = orderDataMap.get(session.customerPhone);
        
        if (hasCard && hasPix) {
          // Cliente tem AMBOS - determinar ordem cronológica
          if (cardTimestamp && cardTimestamp < pixTimestamp) {
            // Cartão veio primeiro
            tags.push('CARTÃO CONFIRMADO');
            if (session.pixCodeCopied) {
              tags.push('PIX COPIADO');
            } else if (session.completedToPix) {
              tags.push('PIX GERADO');
            }
          } else {
            // PIX veio primeiro
            if (session.pixCodeCopied) {
              tags.push('PIX COPIADO');
            } else if (session.completedToPix) {
              tags.push('PIX GERADO');
            }
            tags.push('CARTÃO CONFIRMADO');
          }
        } else if (hasCard) {
          tags.push('CARTÃO CONFIRMADO');
        } else if (session.pixCodeCopied) {
          tags.push('PIX COPIADO');
        } else if (session.completedToPix) {
          tags.push('PIX GERADO');
        } else {
          tags.push('ABANDONOU');
        }
        
        uniqueClients.push({
          id: session.customerPhone, // usar phone como ID único
          nome: session.customerName,
          telefone: session.customerPhone,
          email: session.customerEmail,
          cpf: orderInfo?.cpf || null,
          endereco: orderInfo?.address || null,
          valor: session.total,
          tags,
          items: session.items,
          data: session.createdAt
        });
        
        if (uniqueClients.length >= 500) break;
      }
    }

    // 7. Top 5 Produtos - baseado em CheckoutSession.items (quem chegou em pagamento)
    const productRevenue: Record<string, number> = {};
    for (const session of allSessions) {
      const items = session.items as any[];
      if (Array.isArray(items)) {
        for (const item of items) {
          const name = item.name || 'Produto';
          const value = (item.finalPrice || item.price || 0) * (item.quantity || 1);
          productRevenue[name] = (productRevenue[name] || 0) + value;
        }
      }
    }
    
    const topProducts = Object.entries(productRevenue)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, revenue]) => ({ name, revenue }));

    // 8. Top 5 Categorias - baseado em CheckoutSession.items
    const categoryRevenue: Record<string, number> = {};
    for (const session of allSessions) {
      const items = session.items as any[];
      if (Array.isArray(items)) {
        for (const item of items) {
          const cat = item.categoryName || 'Outros';
          const value = (item.finalPrice || item.price || 0) * (item.quantity || 1);
          categoryRevenue[cat] = (categoryRevenue[cat] || 0) + value;
        }
      }
    }
    
    const topCategories = Object.entries(categoryRevenue)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, revenue]) => ({ name, revenue }));

    return NextResponse.json({
      receitaBruta,
      pixGerado,
      pixCopiado,
      totalCartao,
      abandonados,
      ultimosClientes: uniqueClients,
      topProducts,
      topCategories
    });

  } catch (error) {
    console.error('Dashboard metrics error:', error);
    return NextResponse.json({ error: 'Erro ao carregar métricas' }, { status: 500 });
  }
}
