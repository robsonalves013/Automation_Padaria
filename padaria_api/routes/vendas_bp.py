from flask import Blueprint, jsonify, request
from extensions import db
from models import ProdutoEstoque, Venda, VendaItem
from datetime import datetime
import pytz
from config import Config

vendas_bp = Blueprint('vendas_bp', __name__)

# Fuso horário de São Paulo
fuso_horario_sp = pytz.timezone('America/Sao_Paulo')

@vendas_bp.route('/vendas/balcao', methods=['POST'])
def finalizar_venda_balcao():
    """Finaliza uma venda de balcão, registrando a transação e atualizando o estoque."""
    data = request.get_json()
    carrinho = data.get('carrinho', [])
    forma_pagamento = data.get('forma_pagamento')
    valor_recebido = data.get('valor_recebido')
    
    if not carrinho:
        return jsonify({'erro': 'O carrinho está vazio.'}), 400

    valor_total = 0
    itens_venda_db = []
    try:
        for item in carrinho:
            produto = ProdutoEstoque.query.get(item['id'])
            if not produto or produto.quantidade < item['quantidade']:
                return jsonify({'erro': f'Produto {item["id"]} sem estoque suficiente.'}), 400
            
            valor_total += produto.valor * item['quantidade']
            
            # Atualiza o estoque
            produto.quantidade -= item['quantidade']
            
            # Prepara o item para ser adicionado à venda
            itens_venda_db.append(VendaItem(produto_id=item['id'], quantidade=item['quantidade']))

        agora = datetime.now(fuso_horario_sp)
        nova_venda = Venda(
            valor_total=valor_total,
            forma_pagamento=forma_pagamento,
            valor_recebido=valor_recebido,
            data_hora=agora,
            tipo_venda='balcao',
            status='concluida'
        )
        db.session.add(nova_venda)
        
        # Adiciona os itens à venda
        for item_db in itens_venda_db:
            item_db.venda = nova_venda
            db.session.add(item_db)

        db.session.commit()
        return jsonify({'mensagem': 'Venda de balcão finalizada com sucesso!', 'venda_id': nova_venda.id}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'erro': str(e)}), 500

@vendas_bp.route('/vendas/delivery', methods=['POST'])
def lancar_venda_delivery():
    """Lança uma venda de delivery, registrando a transação e atualizando o estoque."""
    data = request.get_json()
    plataforma = data.get('plataforma')
    carrinho = data.get('carrinho', [])
    
    if not carrinho:
        return jsonify({'erro': 'O carrinho está vazio.'}), 400

    valor_total = 0
    itens_venda_db = []
    try:
        for item in carrinho:
            produto = ProdutoEstoque.query.get(item['id'])
            if not produto or produto.quantidade < item['quantidade']:
                return jsonify({'erro': f'Produto {item["id"]} sem estoque suficiente.'}), 400
            
            valor_total += produto.valor * item['quantidade']
            
            produto.quantidade -= item['quantidade']
            
            itens_venda_db.append(VendaItem(produto_id=item['id'], quantidade=item['quantidade']))

        agora = datetime.now(fuso_horario_sp)
        nova_venda = Venda(
            valor_total=valor_total,
            forma_pagamento='Cartao', # Ou outra forma padrão para delivery
            valor_recebido=valor_total,
            data_hora=agora,
            tipo_venda='delivery',
            plataforma=plataforma,
            status='concluida'
        )
        db.session.add(nova_venda)

        for item_db in itens_venda_db:
            item_db.venda = nova_venda
            db.session.add(item_db)

        db.session.commit()
        return jsonify({'mensagem': 'Venda de delivery lançada com sucesso!', 'venda_id': nova_venda.id}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'erro': str(e)}), 500

@vendas_bp.route('/vendas/cancelar/<int:venda_id>', methods=['POST'])
def cancelar_venda(venda_id):
    """Cancela uma venda, revertendo o estoque e atualizando o status."""
    data = request.get_json()
    senha_informada = data.get('senha_mestre')

    if not senha_informada or senha_informada != Config.MASTER_PASSWORD:
        return jsonify({'erro': 'Senha mestre incorreta.'}), 401
    
    venda = Venda.query.get(venda_id)
    if not venda:
        return jsonify({'erro': 'Venda não encontrada.'}), 404
    
    if venda.status == 'cancelada':
        return jsonify({'mensagem': 'Esta venda já está cancelada.'}), 200

    try:
        for item_venda in venda.itens_vendidos:
            produto = ProdutoEstoque.query.get(item_venda.produto_id)
            if produto:
                produto.quantidade += item_venda.quantidade
        venda.status = 'cancelada'
        venda.observacao_cancelamento = f"Cancelada em {datetime.now(fuso_horario_sp).isoformat()} via interface web."
        db.session.commit()
        return jsonify({'mensagem': f'Venda {venda_id} cancelada com sucesso.'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'erro': str(e)}), 500