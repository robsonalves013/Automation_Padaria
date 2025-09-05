from flask import Blueprint, jsonify, request
from .models import db, Produto, Venda, ItemVendido
from datetime import datetime

# Cria uma instância de Blueprint
api_bp = Blueprint('api_bp', __name__)

# Rota para adicionar um produto ao estoque
@api_bp.route('/estoque/adicionar', methods=['POST'])
def adicionar_produto():
    data = request.get_json()
    produto_id = data.get('id')
    
    if Produto.query.get(produto_id):
        return jsonify({'erro': 'Produto com este ID já existe.'}), 409
    
    novo_produto = Produto(
        id=produto_id,
        nome=data.get('nome'),
        valor=data.get('valor'),
        quantidade=data.get('quantidade')
    )
    db.session.add(novo_produto)
    db.session.commit()
    
    return jsonify({'mensagem': 'Produto adicionado com sucesso!'}), 201

# Rota para obter todos os produtos do estoque
@api_bp.route('/estoque', methods=['GET'])
def get_estoque():
    produtos = Produto.query.all()
    estoque_list = [
        {'id': p.id, 'nome': p.nome, 'valor': p.valor, 'quantidade': p.quantidade}
        for p in produtos
    ]
    return jsonify({'estoque': estoque_list})

# Rota para finalizar uma venda
@api_bp.route('/vendas/balcao', methods=['POST'])
def finalizar_venda():
    data = request.get_json()
    carrinho_data = data.get('carrinho', [])
    forma_pagamento = data.get('forma_pagamento')
    
    valor_total = sum(item['valor'] * item['quantidade'] for item in carrinho_data)
    
    venda = Venda(
        valor_total=valor_total,
        forma_pagamento=forma_pagamento
    )
    db.session.add(venda)
    db.session.commit()
    
    for item_data in carrinho_data:
        produto = Produto.query.get(item_data['id'])
        if produto:
            produto.quantidade -= item_data['quantidade']
            db.session.add(produto)
            
        item_vendido = ItemVendido(
            venda_id=venda.id,
            produto_id=item_data['id'],
            nome=item_data['nome'],
            quantidade=item_data['quantidade'],
            valor_unitario=item_data['valor']
        )
        db.session.add(item_vendido)
    
    db.session.commit()
    
    return jsonify({'mensagem': 'Venda finalizada com sucesso!'})

# Rota para cancelar uma venda
@api_bp.route('/vendas/cancelar/<int:venda_id>', methods=['POST'])
def cancelar_venda(venda_id):
    # Lógica para cancelar a venda, reverter o estoque e verificar a senha mestre
    # ...
    return jsonify({'mensagem': f'Venda {venda_id} cancelada com sucesso.'})

# Rota para obter o relatório diário
@api_bp.route('/relatorios/diario', methods=['GET'])
def relatorio_diario():
    # Lógica para gerar o relatório diário
    # ...
    return jsonify({'vendas': []}) # Exemplo de retorno