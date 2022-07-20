const mongoose = require('mongoose');
const AutoIncrement = require('mongoose-sequence')(mongoose);

const pagamentoSchema = new mongoose.Schema({
    _id: Number,
    user_id: String,
    pagamento_confirmado: Boolean,
    data: String
});

const produtoSchema = new mongoose.Schema({
    _id: Number,
    server_id: String,
    nome: String,
    valor: Number,
    quantidade: { type: Number, default: 0 }
}, { _id: false });

produtoSchema.plugin(AutoIncrement);


const produtoEstoqueSchema = new mongoose.Schema({
    produtoId: Number,
    server_id: String,
    conteudo: String
});

const msgProdutoSchema = new mongoose.Schema({
    canal_id: String,
    msg_id: String,
    server_id: String,
    produtoId: Number
});

module.exports.Pagamento = mongoose.model('pagamento', pagamentoSchema);
module.exports.Produto = mongoose.model('produto', produtoSchema);
module.exports.ProdutoEstoque = mongoose.model('produto_estoque', produtoEstoqueSchema);
module.exports.MsgProduto = mongoose.model('mensagem_produto', msgProdutoSchema);