from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class ProdutoEstoque(db.Model):
    __tablename__ = 'produtos_estoque'
    id = db.Column(db.String(50), primary_key=True)
    nome = db.Column(db.String(100), nullable=False)
    valor = db.Column(db.Float, nullable=False)
    quantidade = db.Column(db.Integer, default=0)

    def to_dict(self):
        return {
            'id': self.id,
            'nome': self.nome,
            'valor': self.valor,
            'quantidade': self.quantidade
        }

class Venda(db.Model):
    __tablename__ = 'vendas'
    id = db.Column(db.Integer, primary_key=True)
    valor_total = db.Column(db.Float, nullable=False)
    forma_pagamento = db.Column(db.String(50), nullable=False)
    valor_recebido = db.Column(db.Float, nullable=True)
    data_hora = db.Column(db.DateTime, default=datetime.now)
    tipo_venda = db.Column(db.String(50), nullable=False)
    plataforma = db.Column(db.String(50), nullable=True) # NOVA COLUNA

    itens_vendidos = db.relationship('VendaItem', backref='venda', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'valor_total': self.valor_total,
            'forma_pagamento': self.forma_pagamento,
            'data_hora': self.data_hora.isoformat(),
            'tipo_venda': self.tipo_venda
        }

class VendaItem(db.Model):
    __tablename__ = 'venda_itens'
    id = db.Column(db.Integer, primary_key=True)
    venda_id = db.Column(db.Integer, db.ForeignKey('vendas.id'), nullable=False)
    produto_id = db.Column(db.String(50), db.ForeignKey('produtos_estoque.id'), nullable=False)
    quantidade = db.Column(db.Integer, nullable=False)

    produto = db.relationship('ProdutoEstoque', backref=db.backref('venda_itens', lazy=True))

    def to_dict(self):
        return {
            'id': self.id,
            'venda_id': self.venda_id,
            'produto_id': self.produto_id,
            'quantidade': self.quantidade
        }