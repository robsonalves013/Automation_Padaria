from flask import Blueprint, jsonify, request
from models import db, Venda, VendaItem, ProdutoEstoque
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
    for item in carrinho:
        produto = ProdutoEstoque.query.get(item['id'])
        if not produto or produto.quantidade < item['quantidade']:
            return jsonify({'erro': f'Produto {item["id"]} sem estoque suficiente.'}), 400
        valor_total += produto.valor * item['quantidade']

    try:
        agora = datetime.now(fuso_horario_sp)
        nova_venda = Venda(
            valor_total=valor_total,
            forma_pagamento=forma_pagamento,
            valor_recebido=valor_recebido,
            data_hora=agora,
            tipo_venda='balcao',
            plataforma=None,
            status='concluida'
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
        return jsonify({'mensagem': 'Venda finalizada com sucesso!', 'venda_id': nova_venda.id}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'erro': str(e)}), 500

@vendas_bp.route('/vendas/delivery', methods=['POST'])
def lancar_venda_delivery():
    """Lança uma venda de delivery (iFood/99food), apenas diminuindo a quantidade do estoque."""
    data = request.get_json()
    produto_id = data.get('produto_id')
    quantidade = data.get('quantidade')
    plataforma = data.get('plataforma')

    if not produto_id or not quantidade or quantidade < 1:
        return jsonify({'erro': 'Dados de produto e quantidade inválidos.'}), 400

    produto = ProdutoEstoque.query.get(produto_id)
    if not produto:
        return jsonify({'erro': f'Produto {produto_id} não encontrado no estoque.'}), 404
    
    if produto.quantidade < quantidade:
        return jsonify({'erro': f'Produto {produto.nome} sem estoque suficiente. Disponível: {produto.quantidade}'}), 400

    try:
        produto.quantidade -= quantidade
        agora = datetime.now(fuso_horario_sp)
        
        nova_venda = Venda(
            valor_total=0,
            forma_pagamento='Plataforma Digital',
            valor_recebido=0,
            data_hora=agora,
            tipo_venda='delivery',
            plataforma=plataforma,
            status='concluida'
        )
        db.session.add(nova_venda)
        db.session.flush()
        item_venda = VendaItem(
            venda_id=nova_venda.id,
            produto_id=produto_id,
            quantidade=quantidade
        )
        db.session.add(item_venda)

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
        venda.observacao_cancelamento = f"Cancelada em {datetime.now(fuso_horario_sp).strftime('%d/%m/%Y %H:%M')}"
        db.session.commit()
        return jsonify({'mensagem': f'Venda #{venda_id} cancelada com sucesso! Estoque revertido.'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'erro': 'Erro ao cancelar a venda. ' + str(e)}), 500