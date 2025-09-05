from flask import Flask, request, jsonify
from flask_cors import CORS
import datetime
import uuid
import json
import os

# Inicializa o aplicativo Flask e o CORS
app = Flask(__name__)
CORS(app)

# Nome do arquivo onde os dados serão salvos
DATA_FILE = 'data.json'

# Dicionários para armazenar os dados do aplicativo
estoque = {}
vendas = {}
senha_mestre = "120724" # Senha para operações administrativas

def carregar_dados():
    """
    Carrega os dados de estoque e vendas de um arquivo JSON.
    Se o arquivo não existir, inicializa com dados padrão.
    """
    global estoque, vendas
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
            estoque = data.get('estoque', {})
            vendas = data.get('vendas', {})
    else:
        # Inicializa com dados padrão se o arquivo não existir
        estoque = {
            "P001": {"id": "P001", "nome": "Refrigerante Cola", "valor": 5.00, "quantidade": 50},
            "P002": {"id": "P002", "nome": "Salgadinho de Queijo", "valor": 3.50, "quantidade": 100},
        }
        vendas = {}
    
    # Garante que os IDs sejam chaves de string
    estoque = {str(k): v for k, v in estoque.items()}
    vendas = {str(k): v for k, v in vendas.items()}

def salvar_dados():
    """
    Salva os dados de estoque e vendas em um arquivo JSON.
    """
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump({'estoque': estoque, 'vendas': vendas}, f, indent=4)

# Rota para adicionar ou atualizar um produto no estoque
@app.route('/api/estoque', methods=['POST'])
def adicionar_produto():
    dados = request.get_json()
    id_produto = dados.get('id')
    nome = dados.get('nome')
    valor = dados.get('valor')
    quantidade = dados.get('quantidade')

    if not all([id_produto, nome, valor, quantidade is not None]):
        return jsonify({"erro": "Dados incompletos"}), 400

    if id_produto in estoque:
        estoque[id_produto]['nome'] = nome
        estoque[id_produto]['valor'] = valor
        estoque[id_produto]['quantidade'] = quantidade
        salvar_dados()
        return jsonify({"mensagem": "atualizado com sucesso!"}), 200
    else:
        estoque[id_produto] = {
            "id": id_produto,
            "nome": nome,
            "valor": valor,
            "quantidade": quantidade
        }
        salvar_dados()
        return jsonify({"mensagem": "cadastrado com sucesso!"}), 201

# Rota para obter o estoque completo
@app.route('/api/estoque', methods=['GET'])
def get_estoque():
    return jsonify({"estoque": list(estoque.values())}), 200

# Rota para registrar uma venda no balcão
@app.route('/api/vendas/balcao', methods=['POST'])
def finalizar_venda():
    dados = request.get_json()
    carrinho_itens = dados.get('carrinho', [])
    forma_pagamento = dados.get('forma_pagamento')
    
    if not carrinho_itens:
        return jsonify({"erro": "Carrinho vazio"}), 400

    valor_total = 0
    itens_vendidos = []

    for item in carrinho_itens:
        id_produto = item.get('id')
        quantidade = item.get('quantidade')

        if id_produto not in estoque or estoque[id_produto]['quantidade'] < quantidade:
            return jsonify({"erro": f"Produto '{id_produto}' fora de estoque ou quantidade insuficiente"}), 400

        produto = estoque[id_produto]
        valor_total += produto['valor'] * quantidade
        
        # Diminui a quantidade no estoque
        estoque[id_produto]['quantidade'] -= quantidade
        
        itens_vendidos.append({
            "id": produto['id'],
            "nome": produto['nome'],
            "valor": produto['valor'],
            "quantidade": quantidade,
            "valor_total_item": produto['valor'] * quantidade
        })

    venda_id = str(uuid.uuid4())
    vendas[venda_id] = {
        "id": venda_id,
        "data_hora": datetime.datetime.now().isoformat(),
        "itens_vendidos": itens_vendidos,
        "valor_total": valor_total,
        "forma_pagamento": forma_pagamento,
        "status": "finalizada"
    }

    salvar_dados()
    return jsonify({"mensagem": "Venda finalizada com sucesso!"}), 200

# Rota para obter o relatório de vendas diárias
@app.route('/api/relatorios/diario', methods=['GET'])
def get_relatorio_diario():
    vendas_hoje = [venda for venda in vendas.values() if datetime.datetime.fromisoformat(venda['data_hora']).date() == datetime.date.today()]
    return jsonify({"vendas": vendas_hoje}), 200

# Rota para cancelar uma venda
@app.route('/api/vendas/cancelar/<venda_id>', methods=['POST'])
def cancelar_venda(venda_id):
    dados = request.get_json()
    senha = dados.get('senha')
    motivo = dados.get('motivo')

    if senha != senha_mestre:
        return jsonify({"erro": "Senha incorreta"}), 401

    if venda_id not in vendas:
        return jsonify({"erro": "Venda não encontrada"}), 404
        
    venda = vendas[venda_id]
    if venda['status'] == 'cancelada':
        return jsonify({"erro": "Esta venda já está cancelada"}), 400

    venda['status'] = 'cancelada'
    venda['observacao_cancelamento'] = motivo

    # Repõe os itens no estoque
    for item in venda['itens_vendidos']:
        id_produto = item['id']
        quantidade_reposta = item['quantidade']
        if id_produto in estoque:
            estoque[id_produto]['quantidade'] += quantidade_reposta
    
    salvar_dados()
    return jsonify({"mensagem": "Venda cancelada com sucesso!"}), 200

# Rota para registrar saída de estoque (ex: vendas delivery)
@app.route('/api/estoque/saida', methods=['POST'])
def lancar_saida():
    dados = request.get_json()
    id_produto = dados.get('id')
    quantidade = dados.get('quantidade')

    if not all([id_produto, quantidade]):
        return jsonify({"erro": "Dados incompletos"}), 400

    if id_produto not in estoque:
        return jsonify({"erro": "Produto não encontrado"}), 404
    
    if estoque[id_produto]['quantidade'] < quantidade:
        return jsonify({"erro": "Quantidade insuficiente em estoque"}), 400

    estoque[id_produto]['quantidade'] -= quantidade
    salvar_dados()
    return jsonify({"mensagem": f"Saída de {quantidade} unidades de '{estoque[id_produto]['nome']}' registrada."}), 200

# Inicia o servidor Flask
if __name__ == '__main__':
    # Carrega os dados existentes ao iniciar a aplicação
    carregar_dados()
    app.run(debug=True)
