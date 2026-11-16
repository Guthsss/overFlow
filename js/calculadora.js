/**
 * Módulo responsável por calcular valores do pedido, descontos e formatação.
 */
(() => {
  const fretePorRegiao = {
    Capital: 15,
    Interior: 25,
    "Outras regiões": 35,
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
    const cupom = codigo
      ? window.OrderFlowStorage.get("coupons").find((item) => item.name.toUpperCase() === codigo)
      : null;
    let desconto = 0;
    let mensagemCupom = "";

    if (codigo && !cupom) {
      mensagemCupom = "Cupom não reconhecido. Confira o código e tente novamente.";
    } else if (cupom) {
      desconto = Math.round(subtotal * cupom.discount) / 100;
      mensagemCupom = `Cupom aplicado: ${cupom.discount}% de desconto.`;
    }

    desconto = Math.min(desconto, subtotal);
    const total = Math.max(0, Math.round((subtotal + frete - desconto) * 100) / 100);

    return {
      subtotal,
      shipping: frete,
      discount: desconto,
      total,
      coupon: cupom ? codigo : "",
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
  };
})();
