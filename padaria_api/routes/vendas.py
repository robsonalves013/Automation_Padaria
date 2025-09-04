from flask import Blueprint, jsonify, request
from models import db, Produto, Venda, ItemVenda
from config import Config

vendas_bp = Blueprint('vendas', __name__)

# Realizar uma venda de balcão
@vendas_bp.route('/vendas/balcao', methods=['POST'])
def vendas_balcao():
    data = request.json
    carrinho = data.get('carrinho', [])
    forma_pagamento = data.get('forma_pagamento')
    valor_recebido = data.get('valor_recebido', 0)

    if not carrinho or not forma_pagamento:
        return jsonify({"erro": "Carrinho e forma de pagamento são obrigatórios."}), 400

    total_venda = 0
    nova_venda = Venda(tipo_venda='Balcao', forma_pagamento=forma_pagamento, valor_total=0)
    db.session.add(nova_venda)
    db.session.flush() # Obtém o ID da nova venda antes de commitar

    for item in carrinho:
        produto = Produto.query.get(item['id'])
        if not produto or produto.quantidade < item['quantidade']:
            db.session.rollback() # Desfaz a transação
            return jsonify({"erro": f"Produto {item['id']} sem estoque suficiente."}), 400
        
        # Subtrai do estoque
        produto.quantidade -= item['quantidade']
        
        # Adiciona o item na venda
        valor_item = produto.valor * item['quantidade']
        total_venda += valor_item
        novo_item_venda = ItemVenda(
            venda_id=nova_venda.id,
            produto_id=produto.id,
            quantidade=item['quantidade'],
            valor_unitario=produto.valor
        )
        db.session.add(novo_item_venda)

    nova_venda.valor_total = total_venda
    db.session.commit()
    
    troco = None
    if forma_pagamento == 'Dinheiro':
        troco = valor_recebido - total_venda
    
    return jsonify({
        "mensagem": "Venda realizada com sucesso!",
        "venda_id": nova_venda.id,
        "valor_total": total_venda,
        "troco": troco
    }), 201

# Realizar uma venda delivery (apenas baixa no estoque)
@vendas_bp.route('/vendas/delivery', methods=['POST'])
def vendas_delivery():
    data = request.json
    carrinho = data.get('carrinho', [])
    plataforma = data.get('plataforma')

    if not carrinho or not plataforma:
        return jsonify({"erro": "Carrinho e plataforma são obrigatórios."}), 400
    
    nova_venda = Venda(tipo_venda='Delivery', plataforma=plataforma, forma_pagamento='Plataforma', valor_total=0)
    db.session.add(nova_venda)
    db.session.flush()

    for item in carrinho:
        produto = Produto.query.get(item['id'])
        if not produto or produto.quantidade < item['quantidade']:
            db.session.rollback()
            return jsonify({"erro": f"Produto {item['id']} sem estoque suficiente."}), 400
        
        # Subtrai do estoque
        produto.quantidade -= item['quantidade']
        
        # Adiciona o item na venda (sem valor)
        novo_item_venda = ItemVenda(
            venda_id=nova_venda.id,
            produto_id=produto.id,
            quantidade=item['quantidade'],
            valor_unitario=0 # Valor zero para vendas delivery
        )
        db.session.add(novo_item_venda)

    db.session.commit()
    
    return jsonify({"mensagem": "Venda delivery registrada com sucesso!", "venda_id": nova_venda.id}), 201


# Cancelar uma venda (requer senha mestre)
@vendas_bp.route('/vendas/cancelar/<int:venda_id>', methods=['POST'])
def cancelar_venda(venda_id):
    data = request.json
    senha_master = data.get('senha_master')
    
    if senha_master != Config.MASTER_PASSWORD:
        return jsonify({"erro": "Senha master incorreta."}), 403

    venda = Venda.query.get(venda_id)
    if not venda:
        return jsonify({"erro": "Venda não encontrada."}), 404
    
    if venda.cancelada:
        return jsonify({"mensagem": "Venda já está cancelada."}), 400

    # Retorna os itens para o estoque
    for item in venda.itens:
        produto = Produto.query.get(item.produto_id)
        if produto:
            produto.quantidade += item.quantidade
            
    # Marca a venda como cancelada
    venda.cancelada = True
    db.session.commit()

    return jsonify({"mensagem": f"Venda {venda_id} cancelada com sucesso. Estoque e relatórios atualizados."}), 200