/**
 * Validações reutilizáveis para clientes, produtos e pedidos.
 */
(() => {
  const normalizar = (valor) => String(valor || "").trim();

  /**
   * Garante que um texto atende ao tamanho mínimo exigido.
   * @param {string} valor
   * @param {string} rotulo
   * @param {number} tamanhoMinimo
   * @returns {string}
   */
  const exigirTexto = (valor, rotulo, tamanhoMinimo = 2) => {
    const texto = normalizar(valor);
    if (texto.length < tamanhoMinimo) {
      throw new Error(`${rotulo} precisa ter pelo menos ${tamanhoMinimo} caracteres.`);
    }
    return texto;
  };

  /**
   * Valida os dados de um cliente.
   * @param {Record<string, any>} dados
   * @param {Array<any>} clientes
   * @param {string|null} idEdicao
   * @returns {{name:string, email:string, phone:string}}
   */
  const validarCliente = (dados, clientes = [], idEdicao = null) => {
    const nome = exigirTexto(dados.name, "O nome", 2);
    const email = normalizar(dados.email).toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error("Informe um e-mail válido.");
    }

    if (clientes.some((cliente) => cliente.id !== idEdicao && cliente.email.toLowerCase() === email)) {
      throw new Error("Já existe um cliente cadastrado com este e-mail.");
    }

    const telefone = normalizar(dados.phone);
    if (telefone && telefone.replace(/\D/g, "").length < 10) {
      throw new Error("Informe um telefone com DDD ou deixe o campo vazio.");
    }

    return { name: nome, email, phone: telefone };
  };

  /**
   * Valida os dados de um produto.
   * @param {Record<string, any>} dados
   * @returns {{name:string, category:string, price:number, stock:number}}
   */
  const validarProduto = (dados) => {
    const nome = exigirTexto(dados.name, "O nome do produto", 2);
    const categoria = normalizar(dados.category);
    if (!["Vestuário", "Acessórios", "Casa"].includes(categoria)) {
      throw new Error("Selecione uma categoria válida.");
    }

    const preco = Number(dados.price);
    const estoque = Number(dados.stock);
    if (!Number.isFinite(preco) || preco <= 0) {
      throw new Error("O preço deve ser maior que zero.");
    }

    if (!Number.isInteger(estoque) || estoque < 0) {
      throw new Error("O estoque deve ser um número inteiro igual ou maior que zero.");
    }

    return { name: nome, category: categoria, price: Math.round(preco * 100) / 100, stock: estoque };
  };

  /**
   * Valida os dados da criação ou atualização de um pedido.
   * @param {Record<string, any>} dados
   * @param {Array<any>} clientes
   * @param {Array<any>} produtos
   * @returns {any}
   */
  const validarPedido = (dados, clientes, produtos) => {
    const cliente = clientes.find((item) => item.id === dados.customerId);
    if (!cliente) throw new Error("Selecione um cliente cadastrado.");
    if (!Array.isArray(dados.items) || dados.items.length === 0) {
      throw new Error("Adicione pelo menos um produto ao pedido.");
    }

    dados.items.forEach((item) => {
      const produto = produtos.find((entry) => entry.id === item.productId);
      if (!produto) throw new Error("Um dos produtos do pedido não está mais disponível.");
      if (!Number.isInteger(item.quantity) || item.quantity < 1) {
        throw new Error("A quantidade deve ser um número inteiro maior que zero.");
      }
      if (item.quantity > produto.stock) {
        throw new Error(`Estoque insuficiente para ${produto.name}. Disponível: ${produto.stock} unidade(s).`);
      }
    });

    if (!["Capital", "Interior", "Outras regiões"].includes(dados.region)) {
      throw new Error("Selecione a região de entrega.");
    }

    if (!["Pix", "Cartão de crédito", "Boleto"].includes(dados.payment)) {
      throw new Error("Selecione uma forma de pagamento.");
    }

    return cliente;
  };

  const requireText = exigirTexto;
  const validateCustomer = validarCliente;
  const validateProduct = validarProduto;
  const validateOrder = validarPedido;

  window.OrderFlowValidation = {
    exigirTexto,
    requireText,
    validarCliente,
    validateCustomer,
    validarProduto,
    validateProduct,
    validarPedido,
    validateOrder,
  };
})();
