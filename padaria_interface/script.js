// script.js (versão melhorada e unificada)
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

// Elementos para o histórico de vendas
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

// Novos elementos do Modal de Senha
const modalSenha = document.getElementById('modal-senha');
const senhaInput = document.getElementById('senha-input');
const confirmarCancelamentoBtn = document.getElementById('confirmar-cancelamento-btn');
const fecharModalBtn = document.getElementById('fechar-modal-btn');

let carrinho = [];
let vendaParaCancelarId = null;

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
            carregarHistoricoVendasDiarias(); // Atualiza o histórico
            visualizarEstoque(); // Atualiza a tabela de estoque
        } else {
            alert(`Erro na venda: ${result.erro}`);
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
        if (!response.ok) {
            throw new Error('Erro ao carregar estoque.');
        }
        const result = await response.json();
        const estoque = result.estoque;

        let tabelaHTML = `
            <table>
                <thead>
                    <tr>
                        <th>Cód.</th>
                        <th>Nome</th>
                        <th>Valor (R$)</th>
                        <th>Quantidade</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody>
        `;
        estoque.forEach(produto => {
            tabelaHTML += `
                <tr class="${produto.alerta_reposicao ? 'alerta' : ''}">
                    <td>${produto.id}</td>
                    <td>${produto.nome}</td>
                    <td>${produto.valor.toFixed(2)}</td>
                    <td>${produto.quantidade}</td>
                    <td><button onclick="preencherFormulario('${produto.id}', '${produto.nome}', ${produto.valor}, ${produto.quantidade})">Editar</button></td>
                </tr>
            `;
        });
        tabelaHTML += `
                </tbody>
            </table>
        `;

        tabelaEstoqueDiv.innerHTML = tabelaHTML;
    } catch (error) {
        tabelaEstoqueDiv.innerHTML = `<p class="erro">${error.message}</p>`;
        console.error('Erro:', error);
    }
}

function preencherFormulario(id, nome, valor, quantidade) {
    formIdInput.value = id;
    formNomeInput.value = nome;
    formValorInput.value = valor;
    formQuantidadeInput.value = quantidade;
}

async function manipularEstoque(event) {
    event.preventDefault();

    const produtoData = {
        id: formIdInput.value.trim(),
        nome: formNomeInput.value.trim(),
        valor: parseFloat(formValorInput.value),
        quantidade: parseInt(formQuantidadeInput.value)
    };
    
    // Validação básica
    if (!produtoData.id || !produtoData.nome || isNaN(produtoData.valor) || isNaN(produtoData.quantidade)) {
        alert('Por favor, preencha todos os campos corretamente.');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/estoque/produto`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(produtoData)
        });

        const result = await response.json();

        if (response.ok) {
            alert(`Produto ${result.mensagem}`);
            estoqueForm.reset();
            visualizarEstoque();
            verAlertasEstoque();
        } else {
            alert(`Erro: ${result.erro}`);
        }
    } catch (error) {
        alert('Erro de comunicação com a API.');
        console.error('Erro:', error);
    }
}

async function verAlertasEstoque() {
    try {
        const response = await fetch(`${API_URL}/estoque/alerta`);
        const result = await response.json();

        if (response.ok && result.produtos.length > 0) {
            const listaAlerta = result.produtos.map(p => `${p.nome} (Qtd: ${p.quantidade})`).join('<br>');
            alertaInfoDiv.innerHTML = `<h3>Produtos com Estoque Baixo:</h3><p>${listaAlerta}</p>`;
            alertaInfoDiv.style.display = 'block';
        } else {
            alertaInfoDiv.innerHTML = `<p>${result.mensagem}</p>`;
            alertaInfoDiv.style.display = 'none'; // Esconde se não houver alerta
        }
    } catch (error) {
        alertaInfoDiv.innerHTML = `<p class="erro">Erro ao buscar alertas.</p>`;
        console.error('Erro:', error);
    }
}

// Funções de Relatórios
// ---

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
                li.classList.toggle('cancelada', venda.status === 'cancelada');

                const valorTotal = venda.valor_total.toFixed(2);
                const dataHora = new Date(venda.data_hora);
                const hora = dataHora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

                let itensVendaHTML = `<ul class="detalhes-venda-lista">`;
                venda.itens_vendidos.forEach(item => {
                    itensVendaHTML += `<li>${item.quantidade}x ${item.nome}</li>`;
                });
                itensVendaHTML += `</ul>`;

                let observacaoCancelamentoHTML = '';
                if (venda.status === 'cancelada' && venda.observacao_cancelamento) {
                    observacaoCancelamentoHTML = `<p class="observacao-cancelamento"><span>Motivo:</span> ${venda.observacao_cancelamento}</p>`;
                }

                li.innerHTML = `
                    <div class="venda-resumo">
                        <span class="venda-hora">${hora}</span>
                        <span class="venda-valor">R$ ${valorTotal}</span>
                        <button class="btn-toggle-detalhes">Detalhes</button>
                        <button class="btn-cancelar" onclick="abrirModalSenha(${venda.id})">Cancelar</button>
                    </div>
                    <div class="venda-detalhes" style="display:none;">
                        ${itensVendaHTML}
                        ${observacaoCancelamentoHTML}
                    </div>
                `;

                li.querySelector('.btn-toggle-detalhes').addEventListener('click', () => {
                    const detalhes = li.querySelector('.venda-detalhes');
                    detalhes.style.display = detalhes.style.display === 'block' ? 'none' : 'block';
                });

                historicoVendasDiariasUl.appendChild(li);

                if (venda.status !== 'cancelada') {
                    totalDiario += venda.valor_total;
                }
            });
        } else {
            const li = document.createElement('li');
            li.textContent = "Nenhuma venda registrada hoje.";
            historicoVendasDiariasUl.appendChild(li);
        }

        valorFechamentoCaixaSpan.textContent = totalDiario.toFixed(2);
    } catch (error) {
        console.error('Erro ao buscar histórico de vendas diárias:', error);
        historicoVendasDiariasUl.innerHTML = `<li class="erro">Erro ao carregar o histórico.</li>`;
        valorFechamentoCaixaSpan.textContent = '0.00';
    }
}

async function gerarRelatorioMensal() {
    try {
        const response = await fetch(`${API_URL}/relatorios/mensal`);
        const result = await response.json();
        exibirRelatorio(result, 'Relatório de Vendas Mensais');
    } catch (error) {
        console.error('Erro ao gerar relatório mensal:', error);
        relatorioOutputDiv.innerHTML = `<p class="erro">Erro ao gerar o relatório mensal.</p>`;
    }
}

async function gerarRelatorioGeral() {
    try {
        const response = await fetch(`${API_URL}/relatorios/geral`);
        const result = await response.json();
        exibirRelatorio(result, 'Relatório de Vendas Geral');
    } catch (error) {
        console.error('Erro ao gerar relatório geral:', error);
        relatorioOutputDiv.innerHTML = `<p class="erro">Erro ao gerar o relatório geral.</p>`;
    }
}

async function gerarRelatorioDelivery() {
    try {
        const response = await fetch(`${API_URL}/relatorios/delivery`);
        const result = await response.json();
        exibirRelatorio(result, 'Relatório de Vendas Delivery');
    } catch (error) {
        console.error('Erro ao gerar relatório delivery:', error);
        relatorioOutputDiv.innerHTML = `<p class="erro">Erro ao gerar o relatório delivery.</p>`;
    }
}

function exibirRelatorio(relatorio, titulo) {
    if (!relatorio || !relatorio.vendas || relatorio.vendas.length === 0) {
        relatorioOutputDiv.innerHTML = `<p>${relatorio.mensagem}</p>`;
        return;
    }

    let html = `
        <h3>${titulo}</h3>
        <table>
            <thead>
                <tr>
                    <th>Data</th>
                    <th>Valor Total</th>
                    <th>Forma de Pagamento</th>
                    <th>Tipo</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
    `;
    relatorio.vendas.forEach(venda => {
        const dataHora = new Date(venda.data_hora);
        const dataFormatada = dataHora.toLocaleDateString('pt-BR');
        const horaFormatada = dataHora.toLocaleTimeString('pt-BR');
        html += `
            <tr class="${venda.status}">
                <td>${dataFormatada} ${horaFormatada}</td>
                <td>R$ ${venda.valor_total.toFixed(2)}</td>
                <td>${venda.forma_pagamento}</td>
                <td>${venda.tipo_venda}</td>
                <td>${venda.status}</td>
            </tr>
        `;
    });
    html += `
            </tbody>
        </table>
    `;

    relatorioOutputDiv.innerHTML = html;
}


// Funções do Modal de Senha
// ---
function abrirModalSenha(vendaId) {
    vendaParaCancelarId = vendaId;
    modalSenha.style.display = 'flex';
    senhaInput.focus();
}

function fecharModalSenha() {
    modalSenha.style.display = 'none';
    senhaInput.value = '';
    vendaParaCancelarId = null;
}

async function confirmarCancelamento() {
    const senha = senhaInput.value;
    if (!senha) {
        alert('Por favor, digite a senha mestre.');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/vendas/cancelar/${vendaParaCancelarId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ senha_mestre: senha })
        });

        const result = await response.json();

        if (response.ok) {
            alert(result.mensagem);
            fecharModalSenha();
            carregarHistoricoVendasDiarias(); // Atualiza a lista
            visualizarEstoque(); // Atualiza o estoque
        } else {
            alert(`Erro: ${result.erro}`);
            senhaInput.value = ''; // Limpa a senha
        }

    } catch (error) {
        alert('Erro de comunicação com a API.');
        console.error('Erro:', error);
    }
}

// Event Listeners
adicionarProdutoBtn.addEventListener('click', adicionarAoCarrinho);
finalizarVendaBtn.addEventListener('click', finalizarVenda);
lancarSaidaDeliveryBtn.addEventListener('click', lancarSaidaDelivery);
estoqueForm.addEventListener('submit', manipularEstoque);
document.getElementById('visualizar-estoque').addEventListener('click', visualizarEstoque);
document.getElementById('alerta-estoque').addEventListener('click', verAlertasEstoque);
document.getElementById('relatorio-diario').addEventListener('click', carregarHistoricoVendasDiarias);
document.getElementById('relatorio-mensal').addEventListener('click', gerarRelatorioMensal);
document.getElementById('relatorio-geral').addEventListener('click', gerarRelatorioGeral);
document.getElementById('relatorio-delivery').addEventListener('click', gerarRelatorioDelivery);
formaPagamentoSelect.addEventListener('change', () => {
    valorRecebidoInput.style.display = formaPagamentoSelect.value === 'Dinheiro' ? 'block' : 'none';
    calcularTroco();
});
valorRecebidoInput.addEventListener('input', calcularTroco);
fecharModalBtn.addEventListener('click', fecharModalSenha);
confirmarCancelamentoBtn.addEventListener('click', confirmarCancelamento);

// Carrega o histórico de vendas ao carregar a página
document.addEventListener('DOMContentLoaded', () => {
    carregarHistoricoVendasDiarias();
    visualizarEstoque();
    verAlertasEstoque();
});