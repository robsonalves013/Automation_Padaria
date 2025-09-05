from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class ProdutoEstoque(db.Model):
    __tablename__ = 'produto_estoque'
    id = db.Column(db.String(50), primary_key=True)
    nome = db.Column(db.String(100), nullable=False)
    valor = db.Column(db.Float, nullable=False)
    quantidade = db.Column(db.Integer, nullable=False)

    def __repr__(self):
        return f"<ProdutoEstoque {self.nome} ({self.id})>"

class Venda(db.Model):
    __tablename__ = 'venda'
    id = db.Column(db.Integer, primary_key=True)
    valor_total = db.Column(db.Float, nullable=False)
    data_hora = db.Column(db.DateTime, nullable=False, default=datetime.now)
    forma_pagamento = db.Column(db.String(50), nullable=False)
    valor_recebido = db.Column(db.Float, nullable=False)
    tipo_venda = db.Column(db.String(20), nullable=False) # 'balcao', 'delivery'
    plataforma = db.Column(db.String(50), nullable=True) # Ex: 'iFood', 'Uber Eats' para delivery

    # Novos campos para status e observação de cancelamento
    status = db.Column(db.String(20), default='concluida', nullable=False) # 'concluida', 'cancelada'
    observacao_cancelamento = db.Column(db.Text, nullable=True)

    itens_vendidos = db.relationship('VendaItem', backref='venda', lazy=True, cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Venda {self.id} - R$ {self.valor_total:.2f}>"

    def to_dict(self):
        return {
            'id': self.id,
            'valor_total': self.valor_total,
            'data_hora': self.data_hora.isoformat(),
            'forma_pagamento': self.forma_pagamento,
            'valor_recebido': self.valor_recebido,
            'tipo_venda': self.tipo_venda,
            'plataforma': self.plataforma,
            'status': self.status, # Inclui o status
            'observacao_cancelamento': self.observacao_cancelamento, # Inclui a observação
            'itens_vendidos': [item.to_dict() for item in self.itens_vendidos]
        }


class VendaItem(db.Model):
    __tablename__ = 'venda_item'
    id = db.Column(db.Integer, primary_key=True)
    venda_id = db.Column(db.Integer, db.ForeignKey('venda.id'), nullable=False)
    produto_id = db.Column(db.String(50), db.ForeignKey('produto_estoque.id'), nullable=False)
    quantidade = db.Column(db.Integer, nullable=False)

    produto = db.relationship('ProdutoEstoque')

    def __repr__(self):
        return f"<VendaItem Venda:{self.venda_id} Produto:{self.produto_id} Qtd:{self.quantidade}>"
    
    def to_dict(self):
        return {
            'produto_id': self.produto_id,
            'nome': self.produto.nome if self.produto else 'Produto Desconhecido',
            'quantidade': self.quantidade
        }