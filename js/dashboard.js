/**
 * Agrega cálculos e resumos de pedidos para os cards e gráficos do dashboard.
 */
(() => {
  const statusDisponiveis = ["Pendente", "Em processamento", "Enviado", "Entregue", "Cancelado"];

  /**
   * Resume os pedidos por status, faturamento e produto mais vendido.
   * @param {Array<any>} pedidos
   * @returns {{revenue:number, average:number, completedCount:number, topProduct:Array<string|number>|null, countByStatus:Record<string, number>, totalOrders:number}}
   */
  const resumir = (pedidos) => {
    const concluidos = pedidos.filter((pedido) => pedido.status === "Entregue");
    const faturamento = concluidos.reduce((soma, pedido) => soma + pedido.total, 0);
    const vendasPorProduto = new Map();

    concluidos.forEach((pedido) => pedido.items.forEach((item) => {
      vendasPorProduto.set(item.name, (vendasPorProduto.get(item.name) || 0) + item.quantity);
    }));

    const produtoTop = [...vendasPorProduto.entries()].sort((a, b) => b[1] - a[1])[0] || null;
    const contagemPorStatus = statusDisponiveis.reduce((contagem, status) => {
      contagem[status] = pedidos.filter((pedido) => pedido.status === status).length;
      return contagem;
    }, {});

    return {
      revenue: faturamento,
      average: concluidos.length ? faturamento / concluidos.length : 0,
      completedCount: concluidos.length,
      topProduct: produtoTop,
      countByStatus: contagemPorStatus,
      totalOrders: pedidos.length,
    };
  };

  /**
   * Gera uma série de valores para os gráficos de vendas.
   * @param {Array<any>} pedidos
   * @param {string} periodo
   * @returns {Array<{label:string, total:number}>}
   */
  const obterSeriesVendas = (pedidos, periodo = "7") => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const entregues = pedidos.filter((pedido) => pedido.status === "Entregue");
    const chaveDaData = (data) => `${data.getFullYear()}-${data.getMonth()}-${data.getDate()}`;
    const totaisPorDia = entregues.reduce((totais, pedido) => {
      const data = new Date(pedido.updatedAt || pedido.createdAt);
      const chave = chaveDaData(data);
      totais.set(chave, (totais.get(chave) || 0) + pedido.total);
      return totais;
    }, new Map());

    if (periodo === "year") {
      const ano = hoje.getFullYear();
      return Array.from({ length: 12 }, (_, mes) => ({
        label: new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(new Date(ano, mes, 1)).replace(".", ""),
        total: entregues.filter((pedido) => {
          const data = new Date(pedido.updatedAt || pedido.createdAt);
          return data.getFullYear() === ano && data.getMonth() === mes;
        }).reduce((soma, pedido) => soma + pedido.total, 0),
      }));
    }

    const quantidadeDias = periodo === "30" ? 30 : 7;
    const dias = Array.from({ length: quantidadeDias }, (_, indice) => {
      const data = new Date(hoje);
      data.setDate(hoje.getDate() - (quantidadeDias - 1 - indice));
      return { data, total: totaisPorDia.get(chaveDaData(data)) || 0 };
    });

    if (periodo === "30") {
      return Array.from({ length: 6 }, (_, indice) => ({
        label: `${indice * 5 + 1}-${indice * 5 + 5}`,
        total: dias.slice(indice * 5, indice * 5 + 5).reduce((soma, dia) => soma + dia.total, 0),
      }));
    }

    return dias.map(({ data, total }) => ({
      label: new Intl.DateTimeFormat("pt-BR", { weekday: "short" }).format(data).replace(".", ""),
      total,
    }));
  };

  const summarize = resumir;
  const getSalesSeries = obterSeriesVendas;
  const statuses = statusDisponiveis;

  window.OrderFlowDashboard = { resumir, summarize, obterSeriesVendas, getSalesSeries, statuses, statusDisponiveis };
})();
