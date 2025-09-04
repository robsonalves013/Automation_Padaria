from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

# Modelo para o produto
class Produto(db.Model):
    id = db.Column(db.String(50), primary_key=True) # Código de barras ou identificação
    nome = db.Column(db.String(100), nullable=False)
    valor = db.Column(db.Float, nullable=False)
    quantidade = db.Column(db.Integer, nullable=False, default=0)
    
    def __repr__(self):
        return f'<Produto {self.nome}>'

# Modelo para a venda
class Venda(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    data_hora = db.Column(db.DateTime, default=datetime.utcnow)
    tipo_venda = db.Column(db.String(20), nullable=False) # 'Balcao' ou 'Delivery'
    plataforma = db.Column(db.String(50), nullable=True) # Ex: 'Ifood', '99food'
    forma_pagamento = db.Column(db.String(20), nullable=False) # 'Debito', 'Credito', 'Pix', 'Dinheiro'
    valor_total = db.Column(db.Float, nullable=False)
    cancelada = db.Column(db.Boolean, default=False)
    
    # Relação com ItemVenda
    itens = db.relationship('ItemVenda', backref='venda', lazy=True)
    
    def __repr__(self):
        return f'<Venda {self.id}>'

# Modelo para os itens de uma venda
class ItemVenda(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    venda_id = db.Column(db.Integer, db.ForeignKey('venda.id'), nullable=False)
    produto_id = db.Column(db.String(50), db.ForeignKey('produto.id'), nullable=False)
    quantidade = db.Column(db.Integer, nullable=False)
    valor_unitario = db.Column(db.Float, nullable=False)
    
    # Relação com Produto
    produto = db.relationship('Produto', backref='itens_venda', lazy=True)
    
    def __repr__(self):
        return f'<ItemVenda {self.quantidade}x {self.produto.nome}>'