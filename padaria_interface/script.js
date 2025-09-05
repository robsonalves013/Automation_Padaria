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

// NOVOS ELEMENTOS para o histórico de vendas
const historicoVendasDiariasUl = document.getElementById('historico-vendas-diarias');
const valorFechamentoCaixaSpan = document.getElementById('valor-fechamento-caixa');

// Elementos do formulário de estoque
const estoqueForm = document.getElementById('estoque-form');
const formIdInput = document.getElementById('form-id');
const formNomeInput = document.getElementById('form-nome');
const formValorInput = document.getElementById('form-valor');
const formQuantidadeInput = document.getElementById('form-quantidade');

// Novos elementos para Vendas Delivery
const plataformaDeliverySelect = document.getElementById('plataforma-delivery');
const produtoIdDeliveryInput = document.getElementById('produto-id-delivery');
const produtoQuantidadeDeliveryInput = document.getElementById('produto-quantidade-delivery');
const lancarSaidaDeliveryBtn = document.getElementById('lancar-saida-delivery');


let carrinho = [];

// Funções de Vendas
// ---

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
    calcularTroco();
}

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
            carrinho = [];
            atualizarCarrinhoUI();
            trocoInfo.style.display = 'none';
            // Chama a função para atualizar o histórico de vendas após o sucesso
            carregarHistoricoVendasDiarias();
        } else {
            alert(`Erro na venda: ${result.erro}`);
        }
    } catch (error) {
        alert('Erro de comunicação com a API.');
        console.error('Erro:', error);
    }
}

async function carregarHistoricoVendasDiarias() {
    try {
        const response = await fetch(`${API_URL}/relatorios/diario`);
        
        if (!response.ok) {
            throw new Error(`Erro de rede: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        
        historicoVendasDiariasUl.innerHTML = '';
        let totalDiario = 0;

        if (result.vendas && result.vendas.length > 0) {
            result.vendas.forEach(venda => {
                const li = document.createElement('li');
                const valorTotal = venda.valor_total.toFixed(2);
                const hora = new Date(venda.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                
                // CRIA A LISTA DE ITENS OCULTA
                let itensVendaHTML = `<ul style="display: none;" class="detalhes-venda-lista">`;
                venda.itens_vendidos.forEach(item => {
                    itensVendaHTML += `<li>${item.quantidade}x ${item.nome}</li>`;
                });
                itensVendaHTML += `</ul>`;

                li.innerHTML = `
                    <div class="venda-resumo">
                        <strong>[${hora}]</strong> Venda #${venda.id} - R$ ${valorTotal}
                        <button class="btn-detalhes">+ Detalhes</button>
                        <button class="btn-cancelar" data-venda-id="${venda.id}">Cancelar Venda</button>
                    </div>
                    ${itensVendaHTML}
                `;
                historicoVendasDiariasUl.appendChild(li);
                
                totalDiario += venda.valor_total;
            });

            // Adiciona o evento de clique aos botões de detalhes
            document.querySelectorAll('.btn-detalhes').forEach(btn => {
                btn.addEventListener('click', (event) => {
                    const listaItens = event.target.closest('li').querySelector('.detalhes-venda-lista');
                    if (listaItens.style.display === 'none') {
                        listaItens.style.display = 'block';
                        event.target.textContent = '- Fechar';
                    } else {
                        listaItens.style.display = 'none';
                        event.target.textContent = '+ Detalhes';
                    }
                });
            });

            // Adiciona o evento de clique aos botões de cancelar
            document.querySelectorAll('.btn-cancelar').forEach(btn => {
                btn.addEventListener('click', (event) => {
                    const vendaId = event.target.dataset.vendaId;
                    cancelarVenda(vendaId);
                });
            });

        } else {
            historicoVendasDiariasUl.innerHTML = '<li>Nenhuma venda registrada hoje.</li>';
        }

        valorFechamentoCaixaSpan.textContent = totalDiario.toFixed(2);

    } catch (error) {
        console.error('Erro ao carregar histórico de vendas:', error);
        historicoVendasDiariasUl.innerHTML = '<li>Erro ao carregar o histórico.</li>';
        valorFechamentoCaixaSpan.textContent = '0.00';
    }
}

// Nova função para Lançamento de Vendas Delivery
async function lancarSaidaDelivery() {
    const plataforma = plataformaDeliverySelect.value;
    const produtoId = produtoIdDeliveryInput.value.trim();
    const quantidade = parseInt(produtoQuantidadeDeliveryInput.value);

    if (!produtoId || quantidade < 1) {
        alert('Por favor, insira um código de produto e uma quantidade válida.');
        return;
    }

    const saidaData = {
        plataforma: plataforma,
        id: produtoId,
        quantidade: quantidade
    };

    try {
        const response = await fetch(`${API_URL}/estoque/saida`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(saidaData)
        });

        const result = await response.json();

        if (response.ok) {
            alert(`Saída de estoque lançada com sucesso: ${result.mensagem}`);
            produtoIdDeliveryInput.value = '';
            produtoQuantidadeDeliveryInput.value = 1;
            visualizarEstoque();
            // ADICIONADO: Chama a função para atualizar o histórico de vendas após o sucesso
            carregarHistoricoVendasDiarias();
        } else {
            alert(`Erro: ${result.erro}`);
        }
    } catch (error) {
        alert('Erro de comunicação com a API.');
        console.error('Erro:', error);
    }
}

async function cancelarVenda(vendaId) {
    const senhaMestre = prompt('Para cancelar a venda, digite a senha mestre:');
    if (!senhaMestre) {
        return; // Usuário cancelou
    }

    try {
        const response = await fetch(`${API_URL}/vendas/cancelar/${vendaId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ senha_mestre: senhaMestre })
        });

        const result = await response.json();

        if (response.ok) {
            alert(result.mensagem);
            carregarHistoricoVendasDiarias(); // Recarrega o histórico
        } else {
            alert(`Erro ao cancelar a venda: ${result.erro}`);
        }
    } catch (error) {
        alert('Erro de comunicação com a API.');
        console.error('Erro:', error);
    }
}


// Funções de Estoque
// ---

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
            formIdInput.disabled = true;
            alert('Formulário preenchido! Altere os dados e clique em Salvar para atualizar.');
        }
    } catch (error) {
        alert('Erro ao buscar dados do produto para edição.');
        console.error('Erro:', error);
    }
}

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
            formIdInput.disabled = false;
            visualizarEstoque();
        } else {
            alert(`Erro: ${result.erro}`);
        }
    } catch (error) {
        alert('Erro de comunicação com a API.');
        console.error('Erro:', error);
    }
}

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
estoqueForm.addEventListener('submit', handleSubmitEstoque);
document.getElementById('visualizar-estoque').addEventListener('click', visualizarEstoque);
document.getElementById('alerta-estoque').addEventListener('click', verAlertas);
document.getElementById('relatorio-diario').addEventListener('click', () => gerarRelatorio('diario'));
document.getElementById('relatorio-mensal').addEventListener('click', () => gerarRelatorio('mensal'));
document.getElementById('relatorio-geral').addEventListener('click', () => gerarRelatorio('geral'));
document.getElementById('relatorio-delivery').addEventListener('click', () => gerarRelatorio('delivery'));
lancarSaidaDeliveryBtn.addEventListener('click', lancarSaidaDelivery);
produtoIdDeliveryInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        event.preventDefault();
        lancarSaidaDelivery();
    }
});

// Carrega as tabelas de estoque e histórico de vendas ao iniciar a página
document.addEventListener('DOMContentLoaded', () => {
    visualizarEstoque();
    carregarHistoricoVendasDiarias();
});