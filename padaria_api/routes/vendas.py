from flask import Blueprint, jsonify, request
from models import db, Venda, VendaItem, ProdutoEstoque
from datetime import datetime
import pytz
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from config import Config

vendas_bp = Blueprint('vendas_bp', __name__)

# Fuso horário de São Paulo
fuso_horario_sp = pytz.timezone('America/Sao_Paulo')

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
    """
    Lança uma venda de delivery (iFood/99food), apenas
    diminuindo a quantidade do estoque sem registrar valor.
    """
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
        # Diminui a quantidade do estoque
        produto.quantidade -= quantidade

        agora = datetime.now(fuso_horario_sp)
        
        # Cria um registro de venda com valor 0
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

        # Cria o item de venda
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
    """
    Cancela uma venda pelo seu ID, revertendo a quantidade de estoque e
    atualizando o status da venda para 'cancelada'.
    Requer a senha mestre.
    """
    from config import Config

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
        # Reverter o estoque para cada item da venda
        for item_venda in venda.itens_vendidos:
            produto = ProdutoEstoque.query.get(item_venda.produto_id)
            if produto:
                produto.quantidade += item_venda.quantidade

        # Atualizar o status da venda para 'cancelada'
        venda.status = 'cancelada'
        venda.observacao_cancelamento = f"Cancelada em {datetime.now(fuso_horario_sp).strftime('%d/%m/%Y %H:%M')}"
        
        db.session.commit()

        return jsonify({'mensagem': f'Venda #{venda_id} cancelada com sucesso! Estoque revertido.'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'erro': 'Erro ao cancelar a venda. ' + str(e)}), 500

@vendas_bp.route('/relatorios/enviar-email', methods=['POST'])
def enviar_relatorio_email():
    """
    Envia um relatório por e-mail.
    """
    data = request.get_json()
    email_destinatario = data.get('email')
    tipo_relatorio = data.get('tipo_relatorio')

    if not email_destinatario or not tipo_relatorio:
        return jsonify({'erro': 'Dados insuficientes.'}), 400

    # Lógica para obter os dados do relatório com base no tipo
    # Reutilize as funções que já geram os relatórios
    if tipo_relatorio == 'diario':
        from .relatorios import vendas_diarias
        relatorio_data = vendas_diarias()
        assunto = 'Relatório Diário de Vendas'
    elif tipo_relatorio == 'mensal':
        from .relatorios import vendas_mensais
        relatorio_data = vendas_mensais()
        assunto = 'Relatório Mensal de Vendas'
    elif tipo_relatorio == 'geral':
        from .relatorios import vendas_gerais
        relatorio_data = vendas_gerais()
        assunto = 'Relatório Geral de Vendas'
    elif tipo_relatorio == 'delivery':
        from .relatorios import vendas_delivery
        relatorio_data = vendas_delivery()
        assunto = 'Relatório de Vendas Delivery'
    else:
        return jsonify({'erro': 'Tipo de relatório inválido.'}), 400

    # Converte os dados do relatório em uma string HTML ou texto
    corpo_email = "<h2>Relatório de Vendas</h2>"
    for venda in relatorio_data['vendas']:
        corpo_email += f"<p>Data/Hora: {venda['data_hora']}, Valor: R$ {venda['valor_total']}, Tipo: {venda['tipo_venda']}</p>"

    # Lógica para enviar o e-mail
    try:
        msg = MIMEMultipart()
        msg['From'] = Config.EMAIL_HOST_USER
        msg['To'] = email_destinatario
        msg['Subject'] = assunto
        
        msg.attach(MIMEText(corpo_email, 'html'))

        server = smtplib.SMTP(Config.EMAIL_HOST, Config.EMAIL_PORT)
        server.starttls()
        server.login(Config.EMAIL_HOST_USER, Config.EMAIL_HOST_PASSWORD)
        text = msg.as_string()
        server.sendmail(Config.EMAIL_HOST_USER, email_destinatario, text)
        server.quit()

        return jsonify({'mensagem': 'Relatório enviado com sucesso!'}), 200

    except Exception as e:
        return jsonify({'erro': f'Erro ao enviar e-mail: {str(e)}'}), 500