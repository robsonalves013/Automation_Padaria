// Onde sua API está rodando
const API_URL = 'http://127.0.0.1:5000/api';

// Cache dos elementos do DOM
const produtoIdInput = document.getElementById('produto-id');
const produtoQuantidadeInput = document.getElementById('produto-quantidade');
const adicionarProdutoBtn = document.getElementById('adicionar-produto');
const listaCarrinho = document.getElementById('lista-carrinho');
const valorTotalSpan = document.getElementById('valor-total');
const formaPagamentoSelect = document.getElementById('forma-pagamento');
const valorRecebidoInput = document.getElementById('valor-recebido');
const finalizarVendaBtn = document.getElementById('finalizar-venda');
const trocoInfo = document.getElementById('troco-info');
const tabelaEstoqueDiv = document.getElementById('tabela-estoque');
const alertaInfoDiv = document.getElementById('alerta-info');
const relatorioOutputDiv = document.getElementById('relatorio-output');

let carrinho = [];

// Função para buscar um produto e adicionar ao carrinho
async function adicionarAoCarrinho() {
    const produtoId = produtoIdInput.value.trim();
    const quantidade = parseInt(produtoQuantidadeInput.value);

    if (!produtoId || quantidade < 1) {
        alert('Por favor, insira um código de produto e uma quantidade válida.');
        return;
    }

    try {
        // Simulação: em um sistema real, você buscaria o produto na API para obter o valor e nome
        // Como o carrinho é local, vamos adicionar com valores simulados.
        // A API irá validar o estoque.
        const produto = { id: produtoId, nome: `Produto ${produtoId}`, valor: 5.00, quantidade: quantidade };
        carrinho.push(produto);
        
        atualizarCarrinhoUI();
        produtoIdInput.value = '';
        produtoQuantidadeInput.value = 1;
        produtoIdInput.focus();

    } catch (error) {
        alert('Erro ao adicionar produto. Verifique o código de barras.');
    }
}

// Atualiza a interface do carrinho
function atualizarCarrinhoUI() {
    listaCarrinho.innerHTML = '';
    let total = 0;
    carrinho.forEach(item => {
        const li = document.createElement('li');
        li.textContent = `${item.quantidade}x ${item.nome} - R$ ${(item.quantidade * item.valor).toFixed(2)}`;
        listaCarrinho.appendChild(li);
        total += item.quantidade * item.valor;
    });
    valorTotalSpan.textContent = total.toFixed(2);
}

// Lida com a finalização da venda
async function finalizarVenda() {
    if (carrinho.length === 0) {
        alert('O carrinho está vazio.');
        return;
    }

    const formaPagamento = formaPagamentoSelect.value;
    const valorRecebido = parseFloat(valorRecebidoInput.value) || 0;

    const vendaData = {
        carrinho: carrinho.map(item => ({ id: item.id, quantidade: item.quantidade })),
        forma_pagamento: formaPagamento,
        valor_recebido: valorRecebido
    };

    try {
        const response = await fetch(`${API_URL}/vendas/balcao`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(vendaData)
        });

        const result = await response.json();

        if (response.ok) {
            alert('Venda finalizada com sucesso!');
            carrinho = []; // Limpa o carrinho
            atualizarCarrinhoUI();

            if (result.troco !== undefined) {
                trocoInfo.textContent = `Troco: R$ ${result.troco.toFixed(2)}`;
                trocoInfo.style.display = 'block';
            } else {
                trocoInfo.style.display = 'none';
            }
        } else {
            alert(`Erro na venda: ${result.erro}`);
        }
    } catch (error) {
        alert('Erro de comunicação com a API.');
    }
}

// Evento para mostrar/esconder o campo de valor recebido
formaPagamentoSelect.addEventListener('change', () => {
    if (formaPagamentoSelect.value === 'Dinheiro') {
        valorRecebidoInput.style.display = 'block';
    } else {
        valorRecebidoInput.style.display = 'none';
    }
});

// Lidar com a visualização do estoque
async function visualizarEstoque() {
    try {
        const response = await fetch(`${API_URL}/estoque`);
        const result = await response.json();
        const estoque = result.estoque;

        let tabelaHTML = '<table><thead><tr><th>ID</th><th>Nome</th><th>Quantidade</th><th>Valor</th></tr></thead><tbody>';
        estoque.forEach(item => {
            tabelaHTML += `<tr><td>${item.id}</td><td>${item.nome}</td><td>${item.quantidade}</td><td>R$ ${item.valor.toFixed(2)}</td></tr>`;
        });
        tabelaHTML += '</tbody></table>';

        tabelaEstoqueDiv.innerHTML = tabelaHTML;
        tabelaEstoqueDiv.style.display = 'block';
    } catch (error) {
        alert('Erro ao carregar estoque.');
    }
}

// Lidar com os alertas de estoque
async function verAlertas() {
    try {
        const response = await fetch(`${API_URL}/estoque/alerta`);
        const result = await response.json();
        
        if (response.ok) {
            if (result.produtos) {
                let listaAlerta = '<h3>Produtos com Estoque Baixo</h3><ul>';
                result.produtos.forEach(p => {
                    listaAlerta += `<li class="alerta">${p.nome} - Qtd: ${p.quantidade_atual}</li>`;
                });
                listaAlerta += '</ul>';
                alertaInfoDiv.innerHTML = listaAlerta;
            } else {
                alertaInfoDiv.innerHTML = `<p>${result.mensagem}</p>`;
            }
            alertaInfoDiv.style.display = 'block';
        } else {
            alert('Erro ao buscar alertas.');
        }

    } catch (error) {
        alert('Erro de comunicação com a API.');
    }
}

// Lidar com os relatórios
async function gerarRelatorio(tipo) {
    try {
        const response = await fetch(`${API_URL}/relatorios/${tipo}`);
        const result = await response.json();

        if (response.ok) {
            relatorioOutputDiv.innerHTML = `<pre>${JSON.stringify(result, null, 2)}</pre>`;
        } else {
            alert(`Erro ao gerar relatório: ${result.erro}`);
        }
    } catch (error) {
        alert('Erro ao buscar relatórios.');
    }
}

// Adicionar eventos aos botões
adicionarProdutoBtn.addEventListener('click', adicionarAoCarrinho);
finalizarVendaBtn.addEventListener('click', finalizarVenda);
document.getElementById('visualizar-estoque').addEventListener('click', visualizarEstoque);
document.getElementById('alerta-estoque').addEventListener('click', verAlertas);
document.getElementById('relatorio-diario').addEventListener('click', () => gerarRelatorio('diario'));
document.getElementById('relatorio-mensal').addEventListener('click', () => gerarRelatorio('mensal'));
document.getElementById('relatorio-geral').addEventListener('click', () => gerarRelatorio('geral'));
document.getElementById('relatorio-delivery').addEventListener('click', () => gerarRelatorio('delivery'));

// Evento para o botão Enter no input de produto
produtoIdInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        event.preventDefault();
        adicionarAoCarrinho();
    }
});