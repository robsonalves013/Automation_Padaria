// Onde sua API está rodando
const API_URL = 'http://127.0.0.1:5000/api';

// Cache dos elementos do DOM para melhor performance
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

// Elementos do formulário de estoque
const estoqueForm = document.getElementById('estoque-form');
const formIdInput = document.getElementById('form-id');
const formNomeInput = document.getElementById('form-nome');
const formValorInput = document.getElementById('form-valor');
const formQuantidadeInput = document.getElementById('form-quantidade');

// NOVOS ELEMENTOS para o histórico de vendas
const historicoVendasDiariasUl = document.getElementById('historico-vendas-diarias');
const valorFechamentoCaixaSpan = document.getElementById('valor-fechamento-caixa');

let carrinho = [];

// Funções de Vendas
// ---

/**
 * Adiciona um produto ao carrinho de compras.
 * Busca os dados do produto na API para garantir a precisão.
 */
async function adicionarAoCarrinho() {
    const produtoId = produtoIdInput.value.trim();
    const quantidade = parseInt(produtoQuantidadeInput.value);

    if (!produtoId || quantidade < 1) {
        alert('Por favor, insira um código de produto e uma quantidade válida.');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/estoque`);
        const result = await response.json();
        const produto = result.estoque.find(p => p.id === produtoId);

        if (!produto) {
            alert('Produto não encontrado no estoque.');
            return;
        }

        // Adiciona o produto ao carrinho
        carrinho.push({
            id: produto.id,
            nome: produto.nome,
            valor: produto.valor,
            quantidade: quantidade
        });
        
        atualizarCarrinhoUI();
        produtoIdInput.value = '';
        produtoQuantidadeInput.value = 1;
        produtoIdInput.focus();

    } catch (error) {
        alert('Erro ao buscar produto. Tente novamente.');
        console.error('Erro:', error);
    }
}

/**
 * Atualiza a interface do carrinho com os itens e o valor total.
 */
function atualizarCarrinhoUI() {
    listaCarrinho.innerHTML = '';
    let total = 0;
    carrinho.forEach(item => {
        const li = document.createElement('li');
        const valorItem = item.quantidade * item.valor;
        li.textContent = `${item.quantidade}x ${item.nome} - R$ ${valorItem.toFixed(2)}`;
        listaCarrinho.appendChild(li);
        total += valorItem;
    });
    valorTotalSpan.textContent = total.toFixed(2);

    // Adiciona a lógica do troco
    calcularTroco();
}

/**
 * Calcula e exibe o troco antes da venda ser finalizada.
 */
function calcularTroco() {
    const totalVenda = parseFloat(valorTotalSpan.textContent);
    const formaPagamento = formaPagamentoSelect.value;
    const valorRecebido = parseFloat(valorRecebidoInput.value) || 0;

    if (formaPagamento === 'Dinheiro') {
        if (valorRecebido >= totalVenda) {
            const troco = valorRecebido - totalVenda;
            trocoInfo.textContent = `Troco: R$ ${troco.toFixed(2)}`;
            trocoInfo.style.display = 'block';
        } else {
            trocoInfo.textContent = `Faltam R$ ${(totalVenda - valorRecebido).toFixed(2)}`;
            trocoInfo.style.display = 'block';
        }
    } else {
        trocoInfo.style.display = 'none';
    }
}

/**
 * Finaliza a venda enviando os dados do carrinho para a API.
 */
async function finalizarVenda() {
    if (carrinho.length === 0) {
        alert('O carrinho está vazio.');
        return;
    }

    const formaPagamento = formaPagamentoSelect.value;
    const valorRecebido = parseFloat(valorRecebidoInput.value) || 0;
    const totalVenda = parseFloat(valorTotalSpan.textContent);

    if (formaPagamento === 'Dinheiro' && valorRecebido < totalVenda) {
        alert('O valor recebido é menor que o valor total da venda. A venda não pode ser finalizada.');
        return;
    }

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
            trocoInfo.style.display = 'none'; // Esconde a mensagem de troco
            
            // Recarrega o histórico de vendas para mostrar a nova venda
            carregarHistoricoVendasDiarias();

        } else {
            alert(`Erro na venda: ${result.erro}`);
        }
    } catch (error) {
        alert('Erro de comunicação com a API.');
        console.error('Erro:', error);
    }
}

/**
 * Carrega e exibe o histórico de vendas diárias.
 */
async function carregarHistoricoVendasDiarias() {
    try {
        const response = await fetch(`${API_URL}/relatorios/diario`);
        const result = await response.json();
        
        historicoVendasDiariasUl.innerHTML = '';
        let totalDiario = 0;

        if (result.vendas && result.vendas.length > 0) {
            result.vendas.forEach(venda => {
                const li = document.createElement('li');
                const valorTotal = venda.valor_total.toFixed(2);
                const hora = new Date(venda.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                
                // Formata os itens da venda
                const itensVenda = venda.itens_vendidos.map(item => `${item.quantidade}x ${item.nome}`).join(', ');

                li.innerHTML = `<strong>[${hora}]</strong> Venda #${venda.id} - R$ ${valorTotal} <br> <em>Itens: ${itensVenda}</em>`;
                historicoVendasDiariasUl.appendChild(li);
                
                totalDiario += venda.valor_total;
            });
        } else {
            historicoVendasDiariasUl.innerHTML = '<li>Nenhuma venda registrada hoje.</li>';
        }

        valorFechamentoCaixaSpan.textContent = totalDiario.toFixed(2);

    } catch (error) {
        console.error('Erro ao carregar histórico de vendas:', error);
        historicoVendasDiariasUl.innerHTML = '<li>Erro ao carregar o histórico.</li>';
    }
}

// Funções de Estoque
// ---

/**
 * Exibe a tabela completa de itens em estoque.
 */
async function visualizarEstoque() {
    try {
        const response = await fetch(`${API_URL}/estoque`);
        const result = await response.json();
        const estoque = result.estoque;

        let tabelaHTML = '<table><thead><tr><th>ID</th><th>Nome</th><th>Valor</th><th>Quantidade</th><th>Ações</th></tr></thead><tbody>';
        estoque.forEach(item => {
            const rowClass = item.alerta_reposicao ? 'class="alerta-linha"' : '';
            tabelaHTML += `<tr ${rowClass}>
                <td>${item.id}</td>
                <td>${item.nome}</td>
                <td>R$ ${item.valor.toFixed(2)}</td>
                <td class="${item.alerta_reposicao ? 'alerta' : ''}">${item.quantidade}</td>
                <td><button class="btn-secondary btn-editar" data-id="${item.id}">Editar</button></td>
            </tr>`;
        });
        tabelaHTML += '</tbody></table>';

        tabelaEstoqueDiv.innerHTML = tabelaHTML;

        // Adiciona evento de clique para os botões de edição
        document.querySelectorAll('.btn-editar').forEach(btn => {
            btn.addEventListener('click', () => {
                const produtoId = btn.dataset.id;
                preencherFormularioParaEdicao(produtoId);
            });
        });

    } catch (error) {
        alert('Erro ao carregar estoque.');
        console.error('Erro:', error);
    }
}

/**
 * Preenche o formulário de estoque com os dados de um produto para edição.
 * @param {string} produtoId O ID do produto a ser editado.
 */
async function preencherFormularioParaEdicao(produtoId) {
    try {
        const response = await fetch(`${API_URL}/estoque`);
        const result = await response.json();
        const produto = result.estoque.find(p => p.id === produtoId);

        if (produto) {
            formIdInput.value = produto.id;
            formNomeInput.value = produto.nome;
            formValorInput.value = produto.valor;
            formQuantidadeInput.value = produto.quantidade;
            formIdInput.disabled = true; // Impede a edição do ID
            alert('Formulário preenchido! Altere os dados e clique em Salvar para atualizar.');
        }
    } catch (error) {
        alert('Erro ao buscar dados do produto para edição.');
        console.error('Erro:', error);
    }
}

/**
 * Envia o formulário de cadastro/atualização para a API.
 */
async function handleSubmitEstoque(event) {
    event.preventDefault();

    const produtoData = {
        id: formIdInput.value,
        nome: formNomeInput.value,
        valor: parseFloat(formValorInput.value),
        quantidade: parseInt(formQuantidadeInput.value)
    };

    try {
        const response = await fetch(`${API_URL}/estoque/produto`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(produtoData)
        });

        const result = await response.json();

        if (response.ok) {
            alert(`Sucesso: ${result.mensagem}`);
            estoqueForm.reset();
            formIdInput.disabled = false; // Habilita o campo de ID
            visualizarEstoque(); // Atualiza a tabela de estoque
        } else {
            alert(`Erro: ${result.erro}`);
        }
    } catch (error) {
        alert('Erro de comunicação com a API.');
        console.error('Erro:', error);
    }
}

/**
 * Exibe os produtos com estoque abaixo do limite.
 */
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
            alert(`Erro ao buscar alertas: ${result.erro}`);
        }

    } catch (error) {
        alert('Erro de comunicação com a API.');
        console.error('Erro:', error);
    }
}

// Funções de Relatórios
// ---

/**
 * Gera e exibe o relatório de vendas de um tipo específico.
 * @param {string} tipo O tipo de relatório (diario, mensal, etc.).
 */
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
        console.error('Erro:', error);
    }
}

// Adicionar Event Listeners
// ---

// Vendas
adicionarProdutoBtn.addEventListener('click', adicionarAoCarrinho);
finalizarVendaBtn.addEventListener('click', finalizarVenda);
produtoIdInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        event.preventDefault();
        adicionarAoCarrinho();
    }
});
formaPagamentoSelect.addEventListener('change', () => {
    valorRecebidoInput.style.display = formaPagamentoSelect.value === 'Dinheiro' ? 'block' : 'none';
    calcularTroco();
});
valorRecebidoInput.addEventListener('input', calcularTroco);


// Estoque
estoqueForm.addEventListener('submit', handleSubmitEstoque);
document.getElementById('visualizar-estoque').addEventListener('click', visualizarEstoque);
document.getElementById('alerta-estoque').addEventListener('click', verAlertas);

// Relatórios
document.getElementById('relatorio-diario').addEventListener('click', () => gerarRelatorio('diario'));
document.getElementById('relatorio-mensal').addEventListener('click', () => gerarRelatorio('mensal'));
document.getElementById('relatorio-geral').addEventListener('click', () => gerarRelatorio('geral'));
document.getElementById('relatorio-delivery').addEventListener('click', () => gerarRelatorio('delivery'));

// Carrega as tabelas de estoque e histórico de vendas ao iniciar a página
document.addEventListener('DOMContentLoaded', () => {
    visualizarEstoque();
    carregarHistoricoVendasDiarias();
});