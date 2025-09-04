from flask import Blueprint, jsonify
from models import Venda, ItemVenda, Produto
from datetime import date, timedelta
import pandas as pd
from utils.email_sender import send_email
from config import Config

relatorios_bp = Blueprint('relatorios', __name__)

# Função utilitária para buscar vendas e criar DataFrame
def get_vendas_df(periodo='geral'):
    query = Venda.query.filter_by(cancelada=False)
    
    if periodo == 'diario':
        hoje = date.today()
        query = query.filter(Venda.data_hora >= hoje)
    elif periodo == 'mensal':
        hoje = date.today()
        primeiro_dia_mes = hoje.replace(day=1)
        query = query.filter(Venda.data_hora >= primeiro_dia_mes)
    elif periodo == 'delivery':
        query = query.filter(Venda.tipo_venda == 'Delivery')

    vendas = query.all()
    
    if not vendas:
        return pd.DataFrame()

    data_list = []
    for venda in vendas:
        for item in venda.itens:
            produto_nome = Produto.query.get(item.produto_id).nome
            data_list.append({
                'id_venda': venda.id,
                'data': venda.data_hora.date(),
                'hora': venda.data_hora.time(),
                'tipo_venda': venda.tipo_venda,
                'plataforma': venda.plataforma,
                'forma_pagamento': venda.forma_pagamento,
                'produto': produto_nome,
                'quantidade': item.quantidade,
                'valor_total_item': item.quantidade * item.valor_unitario
            })
    
    return pd.DataFrame(data_list)

# Relatório de Vendas Diário e fechamento de caixa
@relatorios_bp.route('/relatorios/diario', methods=['GET'])
def relatorio_diario():
    df = get_vendas_df('diario')
    if df.empty:
        return jsonify({"mensagem": "Nenhuma venda registrada hoje."}), 200
    
    total_por_pagamento = df.groupby('forma_pagamento')['valor_total_item'].sum().to_dict()
    total_geral = df['valor_total_item'].sum()
    detalhes = df[['id_venda', 'hora', 'produto', 'quantidade', 'valor_total_item', 'forma_pagamento']].to_dict('records')

    return jsonify({
        "relatorio": "Relatório de Vendas Diário",
        "detalhes_vendas": detalhes,
        "total_por_forma_pagamento": total_por_pagamento,
        "total_geral_dia": total_geral
    }), 200

# Relatório de Vendas Mensal
@relatorios_bp.route('/relatorios/mensal', methods=['GET'])
def relatorio_mensal():
    df = get_vendas_df('mensal')
    if df.empty:
        return jsonify({"mensagem": "Nenhuma venda registrada neste mês."}), 200
    
    total_por_dia = df.groupby('data')['valor_total_item'].sum().to_dict()
    total_geral = df['valor_total_item'].sum()

    return jsonify({
        "relatorio": "Relatório de Vendas Mensal",
        "total_por_dia": total_por_dia,
        "total_geral_mes": total_geral
    }), 200

# Relatório de Vendas Geral
@relatorios_bp.route('/relatorios/geral', methods=['GET'])
def relatorio_geral():
    df = get_vendas_df('geral')
    if df.empty:
        return jsonify({"mensagem": "Nenhuma venda registrada."}), 200
    
    total_por_mes = df.groupby(df['data'].dt.to_period('M'))['valor_total_item'].sum().astype(float).to_dict()
    total_geral = df['valor_total_item'].sum()

    return jsonify({
        "relatorio": "Relatório de Vendas Geral",
        "total_por_mes": {str(k): v for k, v in total_por_mes.items()},
        "total_geral": total_geral
    }), 200

# Relatório de Vendas Delivery
@relatorios_bp.route('/relatorios/delivery', methods=['GET'])
def relatorio_delivery():
    df = get_vendas_df('delivery')
    if df.empty:
        return jsonify({"mensagem": "Nenhuma venda delivery registrada."}), 200
    
    total_por_plataforma = df.groupby('plataforma')['quantidade'].sum().to_dict()

    return jsonify({
        "relatorio": "Relatório de Vendas Delivery (Quantidade de Itens)",
        "itens_por_plataforma": total_por_plataforma,
        "total_itens_delivery": int(df['quantidade'].sum())
    }), 200
    
@relatorios_bp.route('/relatorios/diario/email', methods=['GET'])
def enviar_relatorio_diario_por_email():
    df = get_vendas_df('diario')
    if df.empty:
        subject = "Relatório Diário de Vendas - Nenhum Movimento"
        body = "Nenhuma venda foi registrada hoje."
        send_email(subject, body, Config.MAIL_RECEIVER)
        return jsonify({"mensagem": "Nenhuma venda registrada hoje. E-mail enviado."}), 200

    total_por_pagamento = df.groupby('forma_pagamento')['valor_total_item'].sum().to_dict()
    total_geral = df['valor_total_item'].sum()
    
    # Formata o corpo do e-mail
    body = f"""
Relatório de Vendas Diário - {date.today()}

Detalhes das Vendas:
{df[['id_venda', 'hora', 'produto', 'quantidade', 'valor_total_item']].to_string(index=False)}

---
Total por Forma de Pagamento:
{pd.DataFrame([total_por_pagamento]).to_string(index=False)}

---
Valor Total do Dia: R$ {total_geral:.2f}
"""

    subject = f"Relatório Diário de Vendas - {date.today()}"
    if send_email(subject, body, Config.MAIL_RECEIVER):
        return jsonify({"mensagem": "Relatório diário enviado com sucesso por e-mail!"}), 200
    else:
        return jsonify({"erro": "Falha ao enviar o e-mail."}), 500
