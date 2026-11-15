/**
 * Armazena e recupera os dados do fluxo de pedidos em localStorage.
 */
(() => {
  const PREFIXO = "orderflow.v1";
  const CHAVES = {
    customers: `${PREFIXO}.customers`,
    products: `${PREFIXO}.products`,
    orders: `${PREFIXO}.orders`,
    initialized: `${PREFIXO}.initialized`,
  };

  /**
   * Cria um identificador único para os registros persistidos.
   * @param {string} prefixo Prefixo usado para identificar o tipo de registro.
   * @returns {string} ID único do registro.
   */
  const criarId = (prefixo) => {
    const id = globalThis.crypto?.randomUUID
      ? globalThis.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    return `${prefixo}-${id}`;
  };

  /**
   * Lê uma lista salva no localStorage e valida que o conteúdo seja um array.
   * @param {string} chave Chave do armazenamento.
   * @returns {Array<any>} Lista recuperada.
   */
  const lerLista = (chave) => {
    const bruto = localStorage.getItem(chave);
    if (bruto === null) return [];

    try {
      const valor = JSON.parse(bruto);
      if (!Array.isArray(valor)) throw new TypeError("O formato salvo não é uma lista.");
      return valor;
    } catch (erro) {
      console.error(`Não foi possível ler os dados em ${chave}.`, erro);
      throw new Error("Os dados salvos parecem estar corrompidos. Exporte ou limpe os dados do navegador para continuar.");
    }
  };

  /**
   * Persiste uma lista em localStorage.
   * @param {string} chave Chave do armazenamento.
   * @param {Array<any>} itens Lista a ser salva.
   */
  const salvarLista = (chave, itens) => {
    try {
      localStorage.setItem(chave, JSON.stringify(itens));
    } catch (erro) {
      console.error(`Não foi possível salvar os dados em ${chave}.`, erro);
      throw new Error("Não foi possível salvar. Verifique o espaço disponível e as permissões do navegador.");
    }
  };

  /**
   * Retorna todos os itens de uma entidade salva no armazenamento local.
   * @param {string} entidade Nome da entidade.
   * @returns {Array<any>} Registros da entidade.
   */
  const obter = (entidade) => lerLista(CHAVES[entidade]);

  /**
   * Salva a lista de uma entidade no localStorage.
   * @param {string} entidade Nome da entidade.
   * @param {Array<any>} itens Registros a serem persistidos.
   */
  const salvar = (entidade, itens) => salvarLista(CHAVES[entidade], itens);

  /**
   * Insere um novo registro em uma entidade.
   * @param {string} entidade Nome da entidade.
   * @param {Record<string, any>} registro Dados do novo registro.
   * @returns {Record<string, any>} Registro criado com ID.
   */
  const inserir = (entidade, registro) => {
    const registros = obter(entidade);
    const item = { ...registro, id: registro.id || criarId(entidade.slice(0, -1)) };
    registros.push(item);
    salvar(entidade, registros);
    return item;
  };

  /**
   * Atualiza um registro específico pela chave id.
   * @param {string} entidade Nome da entidade.
   * @param {string} id Identificador do registro.
   * @param {Record<string, any>} alteracoes Novos valores para atualizar.
   * @returns {Record<string, any>} Registro atualizado.
   */
  const atualizar = (entidade, id, alteracoes) => {
    const registros = obter(entidade);
    const indice = registros.findIndex((registro) => registro.id === id);
    if (indice < 0) throw new Error("Este registro não foi encontrado. Atualize a tela e tente novamente.");

    registros[indice] = { ...registros[indice], ...alteracoes, id };
    salvar(entidade, registros);
    return registros[indice];
  };

  /**
   * Remove um registro da entidade com base no ID.
   * @param {string} entidade Nome da entidade.
   * @param {string} id Identificador do registro.
   */
  const remover = (entidade, id) => {
    const registros = obter(entidade);
    const restantes = registros.filter((registro) => registro.id !== id);
    if (restantes.length === registros.length) {
      throw new Error("Este registro não foi encontrado. Atualize a tela e tente novamente.");
    }

    salvar(entidade, restantes);
  };

  /**
   * Cria um pedido novo e desconta os itens do estoque em lote.
   * @param {Record<string, any>} pedido Dados do pedido a ser salvo.
   * @returns {Record<string, any>} Pedido persistido.
   */
  const criarPedido = (pedido) => {
    const produtos = obter("products");
    const pedidos = obter("orders");
    const quantidades = pedido.items.reduce((mapa, item) => {
      mapa.set(item.productId, (mapa.get(item.productId) || 0) + item.quantity);
      return mapa;
    }, new Map());

    quantidades.forEach((quantidade, productId) => {
      const produto = produtos.find((entry) => entry.id === productId);
      if (!produto || produto.stock < quantidade) {
        throw new Error(`O estoque de ${produto?.name || "um produto"} mudou. Revise os itens do pedido.`);
      }
      produto.stock -= quantidade;
    });

    const item = { ...pedido, id: pedido.id || criarId("order") };
    const produtosAntes = localStorage.getItem(CHAVES.products);
    const pedidosAntes = localStorage.getItem(CHAVES.orders);

    try {
      salvarLista(CHAVES.products, produtos);
      salvarLista(CHAVES.orders, [...pedidos, item]);
    } catch (erro) {
      if (produtosAntes === null) localStorage.removeItem(CHAVES.products);
      else localStorage.setItem(CHAVES.products, produtosAntes);
      if (pedidosAntes === null) localStorage.removeItem(CHAVES.orders);
      else localStorage.setItem(CHAVES.orders, pedidosAntes);
      throw erro;
    }

    return item;
  };

  /**
   * Atualiza o status de um pedido e ajusta o estoque quando o pedido for cancelado.
   * @param {string} id Identificador do pedido.
   * @param {string} status Novo status do pedido.
   * @returns {Record<string, any>} Pedido atualizado.
   */
  const alterarStatusPedido = (id, status) => {
    const pedidos = obter("orders");
    const produtos = obter("products");
    const pedido = pedidos.find((entry) => entry.id === id);

    if (!pedido) throw new Error("Este pedido não foi encontrado. Atualize a tela e tente novamente.");

    const proximosStatus = {
      Pendente: ["Em processamento", "Cancelado"],
      "Em processamento": ["Enviado", "Cancelado"],
      Enviado: ["Entregue", "Cancelado"],
      Entregue: [],
      Cancelado: [],
    };

    if (!proximosStatus[pedido.status]?.includes(status)) {
      throw new Error("Esta mudança de status não é permitida.");
    }

    if (status === "Cancelado") {
      pedido.items.forEach((item) => {
        const produto = produtos.find((entry) => entry.id === item.productId);
        if (produto) produto.stock += item.quantity;
      });
    }

    pedido.status = status;
    pedido.updatedAt = new Date().toISOString();

    const produtosAntes = localStorage.getItem(CHAVES.products);
    const pedidosAntes = localStorage.getItem(CHAVES.orders);

    try {
      if (status === "Cancelado") salvarLista(CHAVES.products, produtos);
      salvarLista(CHAVES.orders, pedidos);
    } catch (erro) {
      if (produtosAntes !== null) localStorage.setItem(CHAVES.products, produtosAntes);
      if (pedidosAntes !== null) localStorage.setItem(CHAVES.orders, pedidosAntes);
      throw erro;
    }

    return pedido;
  };

  /**
   * Exclui um pedido e retorna os itens ao estoque quando o pedido ainda não foi concluído.
   * @param {string} id Identificador do pedido.
   */
  const excluirPedido = (id) => {
    const pedidos = obter("orders");
    const produtos = obter("products");
    const indicePedido = pedidos.findIndex((entry) => entry.id === id);

    if (indicePedido < 0) throw new Error("Este pedido não foi encontrado. Atualize a tela e tente novamente.");

    const [pedido] = pedidos.splice(indicePedido, 1);
    const deveRestaurarEstoque = !["Cancelado", "Entregue"].includes(pedido.status);

    if (deveRestaurarEstoque) {
      pedido.items.forEach((item) => {
        const produto = produtos.find((entry) => entry.id === item.productId);
        if (produto) produto.stock += item.quantity;
      });
    }

    const produtosAntes = localStorage.getItem(CHAVES.products);
    const pedidosAntes = localStorage.getItem(CHAVES.orders);

    try {
      if (deveRestaurarEstoque) salvarLista(CHAVES.products, produtos);
      salvarLista(CHAVES.orders, pedidos);
    } catch (erro) {
      if (produtosAntes !== null) localStorage.setItem(CHAVES.products, produtosAntes);
      if (pedidosAntes !== null) localStorage.setItem(CHAVES.orders, pedidosAntes);
      throw erro;
    }
  };

  /**
   * Carrega os dados iniciais de demonstração da aplicação quando o armazenamento ainda não foi populado.
   */
  const inicializarDados = () => {
    if (localStorage.getItem(CHAVES.initialized) === "true") return;

    const clientes = [
      { id: "customer-ana", name: "Ana Souza", email: "ana.souza@email.com", phone: "(11) 99912-3456", createdAt: new Date().toISOString() },
      { id: "customer-rafael", name: "Rafael Lima", email: "rafael.lima@email.com", phone: "(21) 99876-5432", createdAt: new Date().toISOString() },
      { id: "customer-camila", name: "Camila Martins", email: "camila.m@email.com", phone: "(41) 99765-4321", createdAt: new Date().toISOString() },
      { id: "customer-bruno", name: "Bruno Ferreira", email: "bruno.f@email.com", phone: "(31) 99654-3210", createdAt: new Date().toISOString() },
    ];
    const produtos = [
      { id: "product-bolsa", name: "Bolsa Aurora", category: "Acessórios", sku: "ACC-001", price: 189, stock: 23, createdAt: new Date().toISOString() },
      { id: "product-caneca", name: "Caneca Serena", category: "Casa", sku: "CAS-014", price: 65, stock: 7, createdAt: new Date().toISOString() },
      { id: "product-oculos", name: "Óculos Solar", category: "Acessórios", sku: "ACC-008", price: 149.9, stock: 0, createdAt: new Date().toISOString() },
      { id: "product-blusa", name: "Blusa Essencial", category: "Vestuário", sku: "VES-021", price: 119, stock: 40, createdAt: new Date().toISOString() },
    ];

    /**
     * Cria uma data em relação ao dia atual, deslocada por um número de dias.
     * @param {number} deslocamento Quantidade de dias para retroceder.
     * @returns {string} Data ISO calculada.
     */
    const dia = (deslocamento) => {
      const data = new Date();
      data.setDate(data.getDate() - deslocamento);
      return data.toISOString();
    };

    /**
     * Cria um pedido de demonstração a partir de dados prontos.
     * @param {number} numero Número do pedido.
     * @param {string} customerId Identificador do cliente.
     * @param {string} productId Identificador do produto.
     * @param {string} nome Nome do produto.
     * @param {number} preco Preço unitário do produto.
     * @param {number} quantidade Quantidade vendida.
     * @param {string} status Status inicial do pedido.
     * @param {number} diasAtras Quantidade de dias atrás para a data do pedido.
     * @returns {Record<string, any>} Pedido demo pronto para persistir.
     */
    const criarPedidoDemo = (numero, customerId, productId, nome, preco, quantidade, status, diasAtras) => ({
      id: `order-demo-${numero}`,
      number: `OF-${String(numero).padStart(4, "0")}`,
      customerId,
      items: [{ productId, name: nome, price: preco, quantity: quantidade }],
      subtotal: preco * quantidade,
      shipping: 0,
      discount: 0,
      total: preco * quantidade,
      coupon: "",
      region: "Capital",
      payment: "Pix",
      notes: "",
      status,
      createdAt: dia(diasAtras),
      updatedAt: dia(diasAtras),
    });

    const pedidos = [
      criarPedidoDemo(1, "customer-ana", "product-bolsa", "Bolsa Aurora", 189, 1, "Entregue", 0),
      criarPedidoDemo(2, "customer-rafael", "product-caneca", "Caneca Serena", 65, 2, "Enviado", 1),
      criarPedidoDemo(3, "customer-camila", "product-blusa", "Blusa Essencial", 119, 1, "Pendente", 2),
      criarPedidoDemo(4, "customer-bruno", "product-bolsa", "Bolsa Aurora", 189, 1, "Em processamento", 4),
    ];

    try {
      salvarLista(CHAVES.customers, clientes);
      salvarLista(CHAVES.products, produtos);
      salvarLista(CHAVES.orders, pedidos);
      localStorage.setItem(CHAVES.initialized, "true");
    } catch (erro) {
      localStorage.removeItem(CHAVES.initialized);
      throw erro;
    }
  };

  /**
   * Gera o próximo número sequencial de pedido para manter a numeração consistente.
   * @returns {string} Código do próximo pedido.
   */
  const proximoNumeroPedido = () => {
    const maximoNumero = obter("orders").reduce((maximo, pedido) => {
      const numero = Number.parseInt(pedido.number?.replace(/\D/g, "") || "0", 10);
      return Math.max(maximo, numero);
    }, 0);

    return `OF-${String(maximoNumero + 1).padStart(4, "0")}`;
  };

  /**
   * Remove todos os dados salvos pelo sistema localmente.
   */
  const limparTudo = () => {
    Object.values(CHAVES).forEach((chave) => localStorage.removeItem(chave));
  };

  const get = obter;
  const save = salvar;
  const insert = inserir;
  const update = atualizar;
  const remove = remover;
  const createOrder = criarPedido;
  const changeOrderStatus = alterarStatusPedido;
  const deleteOrder = excluirPedido;
  const seed = inicializarDados;
  const nextOrderNumber = proximoNumeroPedido;
  const clearAll = limparTudo;

  window.OrderFlowStorage = {
    obter,
    get,
    salvar,
    save,
    inserir,
    insert,
    atualizar,
    update,
    remover,
    remove,
    criarPedido,
    createOrder,
    alterarStatusPedido,
    changeOrderStatus,
    excluirPedido,
    deleteOrder,
    inicializarDados,
    seed,
    proximoNumeroPedido,
    nextOrderNumber,
    limparTudo,
    clearAll,
  };
})();
