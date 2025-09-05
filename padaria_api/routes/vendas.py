from flask import Blueprint, jsonify, request
from models import db, Venda, VendaItem, ProdutoEstoque
from datetime import datetime, date, timedelta

vendas_bp = Blueprint('vendas_bp', __name__)

@vendas_bp.route('/vendas/balcao', methods=['POST'])
def finalizar_venda_balcao():
    """
    Finaliza uma venda de balcão, registrando a transação e
    atualizando o estoque.
    """
    data = request.get_json()
    carrinho = data.get('carrinho', [])
    forma_pagamento = data.get('forma_pagamento')
    valor_recebido = data.get('valor_recebido')
    
    if not carrinho:
        return jsonify({'erro': 'O carrinho está vazio.'}), 400

    valor_total = 0
    for item in carrinho:
        produto = ProdutoEstoque.query.get(item['id'])
        if not produto or produto.quantidade < item['quantidade']:
            return jsonify({'erro': f'Produto {item["id"]} sem estoque suficiente.'}), 400

        valor_total += produto.valor * item['quantidade']

    try:
        nova_venda = Venda(
            valor_total=valor_total,
            forma_pagamento=forma_pagamento,
            valor_recebido=valor_recebido,
            data_hora=datetime.now(),
            tipo_venda='balcao',
            plataforma=None
        )
        db.session.add(nova_venda)
        db.session.flush()

        for item in carrinho:
            produto = ProdutoEstoque.query.get(item['id'])
            produto.quantidade -= item['quantidade']
            
            item_venda = VendaItem(
                venda_id=nova_venda.id,
                produto_id=item['id'],
                quantidade=item['quantidade']
            )
            db.session.add(item_venda)

        db.session.commit()
        return jsonify({'mensagem': 'Venda finalizada com sucesso!', 'venda_id': nova_venda.id})
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'erro': f'Erro ao processar a venda: {str(e)}'}), 500