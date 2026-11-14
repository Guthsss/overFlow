/**
 * Módulo responsável por calcular valores do pedido, descontos e formatação.
 */
(() => {
  const fretePorRegiao = {
    Capital: 15,
    Interior: 25,
    "Outras regiões": 35,
  };

  const cupons = {
    BEMVINDO10: { tipo: "percentual", valor: 10, minimo: 0 },
    FLOW15: { tipo: "percentual", valor: 15, minimo: 500 },
    FRETEGRATIS: { tipo: "frete", valor: 0, minimo: 0 },
  };

  /**
   * Calcula subtotal, frete, desconto e valor total do pedido.
   * @param {Array<{price: number, quantity: number}>} itens
   * @param {string} regiao
   * @param {string} codigoCupom
   * @returns {{subtotal:number, shipping:number, discount:number, total:number, coupon:string, couponMessage:string}}
   */
  const calcular = (itens, regiao, codigoCupom = "") => {
    const subtotal = Math.round(itens.reduce((total, item) => total + item.price * item.quantity, 0) * 100) / 100;
    let frete = subtotal === 0 ? 0 : (fretePorRegiao[regiao] ?? 0);
    if (subtotal >= 500) frete = 0;

    const codigo = String(codigoCupom).trim().toUpperCase();
    const cupom = codigo ? cupons[codigo] : null;
    let desconto = 0;
    let mensagemCupom = "";

    if (codigo && !cupom) {
      mensagemCupom = "Cupom não reconhecido. Confira o código e tente novamente.";
    } else if (cupom && subtotal < cupom.minimo) {
      mensagemCupom = `Este cupom vale para compras a partir de ${formatarMoeda(cupom.minimo)}.`;
    } else if (cupom?.tipo === "percentual") {
      desconto = Math.round(subtotal * cupom.valor) / 100;
      mensagemCupom = `Cupom aplicado: ${cupom.valor}% de desconto.`;
    } else if (cupom?.tipo === "frete") {
      frete = 0;
      mensagemCupom = "Cupom aplicado: frete grátis.";
    }

    desconto = Math.min(desconto, subtotal);
    const total = Math.max(0, Math.round((subtotal + frete - desconto) * 100) / 100);

    return {
      subtotal,
      shipping: frete,
      discount: desconto,
      total,
      coupon: cupom && !mensagemCupom.startsWith("Este cupom") ? codigo : "",
      couponMessage: mensagemCupom,
    };
  };

  /**
   * Formata valores para moeda brasileira.
   * @param {number|string} valor
   * @returns {string}
   */
  const formatarMoeda = (valor) => new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(valor) || 0);

  const calculate = calcular;
  const formatCurrency = formatarMoeda;

  window.OrderFlowCalculator = {
    calcular,
    calculate,
    formatarMoeda,
    formatCurrency,
    shippingByRegion: fretePorRegiao,
    coupons: cupons,
  };
})();
