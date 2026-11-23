// Gabriel RA: 25004669

# Modelo de dados — AgroRecursos MarketPlace

Banco: MongoDB (`agrorecursos`). Acesso pelo driver oficial `mongodb`. Os índices são criados na inicialização (`backend/src/config/database.js`).

<!-- Diagrama de relacionamento entre as colecoes do banco de dados -->
## Modelo lógico

```mermaid
erDiagram
    users ||--|| profiles : "userId"
    users ||--o{ pedidos : "userId"
    users ||--o{ cotacoes : "userId"
    users ||--o{ avaliacoes : "userId"
    users ||--o{ auditoria : "userId"
    users ||--o| fornecedores : "userId (fornecedor)"
    fornecedores ||--o{ produtos : "fornecedorId"
    produtos ||--o| laudos : "laudoId / produtoId"
    produtos ||--o{ avaliacoes : "produtoId"
    pedidos }o--o{ produtos : "itens[].produtoId"
    cotacoes ||--o{ propostas : "embutidas"
    fornecedores ||--o{ propostas : "fornecedorId"
```

<!-- Justificativa de quando usamos referencia por ID e quando embutimos documentos -->
## Decisões de normalização

- **Referência** entre entidades que existem sozinhas e são consultadas por diferentes telas: `users`, `profiles`, `fornecedores`, `produtos`, `laudos`, `avaliacoes`.
- **Incorporação (embedding)** onde o dado só faz sentido dentro do dono e é lido junto com ele: `propostas` dentro de `cotacoes`; `itens`, `entrega` e `pagamento` dentro de `pedidos`.
- Os `itens` do pedido guardam uma **cópia** de nome e preço no momento da compra (histórico imutável); o total é sempre recalculado no servidor a partir do preço do produto.
- Médias (`fornecedores.avaliacao`) são recalculadas a cada avaliação nova e guardadas, para evitar agregação a cada leitura do catálogo.
- Produtos nunca são apagados fisicamente: `ativo: false` preserva pedidos e laudos antigos.

<!-- Estrutura detalhada dos campos e tipos de cada colecao no MongoDB -->
## Modelo físico (coleções)

### users
| Campo | Tipo | Observação |
|---|---|---|
| _id | ObjectId | |
| email | string | único por tipo de conta (o mesmo e-mail pode ter uma conta de produtor e outra de fornecedor) |
| accountType | string | `produtor` ou `fornecedor` (copiado do perfil) |
| passwordHash | string | bcrypt, custo 12 |
| status | string | `active` ou `inactive` |
| emailVerified | bool | |
| createdAt / updatedAt | date | |

### profiles
| Campo | Tipo | Observação |
|---|---|---|
| userId | ObjectId | único, referencia `users` |
| name, accountType | string | `produtor` ou `fornecedor` |
| document | string | CPF/CNPJ só com dígitos; único por tipo de conta (documento + accountType) quando preenchido |
| phone | string | |
| companyName, tradeName, stateRegistration | string | fornecedor |
| categories | string[] | categorias que o fornecedor vende |
| addresses | array | endereços do usuário: id, label, cep, street, number, complement, neighborhood, city, state, observacoes, principal (um é o principal) |
| address | objeto | cópia do endereço principal (cep, street, number, complement, neighborhood, city, state) |
| registrationStatus | string | `basic` ou `complete` |

### fornecedores
`userId` (opcional), `nome`, `nomeFantasia`, `avaliacao` (média 0–5), `totalAvaliacoes`, `criadoEm`.

### produtos
| Campo | Tipo | Observação |
|---|---|---|
| nome, categoria, marca, regiao | string | categoria: Sementes, Fertilizantes, Defensivos, Outros |
| preco | number | em reais, 2 casas |
| entregaDias, estoque, vendidos | number | |
| cultura, tecnologia, embalagem, descricao, vencimento, condicao | string | |
| germinacao, vigor, pureza | number | sementes |
| fornecedorId | ObjectId | referencia `fornecedores` |
| laudoId | ObjectId ou null | referencia `laudos` |
| chave | string | `nome|marca` normalizado; impede duplicados por fornecedor |
| ativo | bool | exclusão lógica |
| imagens | string[] | fotos do produto; a primeira é a capa e pode ser um data URI (JPEG em base64) gravado direto no banco |

### laudos
`numero` (único, ex.: `MAPA-00123`), `orgao`, `produtoId`, `fornecedorId`, `emissao`, `validade`, `resultados` (objeto), `criadoEm`.

### avaliacoes
`produtoId`, `userId`, `nota` (1–5), `comentario`, `autor`, `verificado` (comprou o produto), `criadoEm`, `atualizadoEm`. Uma por usuário e produto.

### cotacoes
`codigo` (único, `CR00001`), `userId`, `item`, `quantidade`, `produtoId` (opcional), `criadoEm`, `vencimento`, `status` (`aguardando`, `analise`, `fechada`, `recusada`), `propostaAprovadaId`, `propostas[]` com `_id`, `fornecedorId`, `fornecedor`, `preco`, `prazo`, `laudo`, `avaliacao`.
Documentos com `modelo: true` são modelos de exemplo copiados para cada produtor no primeiro acesso.

### pedidos
`numero` (`PED000001`), `userId`, `itens[]` (produtoId, fornecedorId, nome, preco, quantidade, subtotal), `subtotal`, `frete` (valor, prazo), `total`, `entrega` (endereço), `pagamento` (metodo, parcelas, valorParcelas[], status), `status` (`criado`, `confirmado`, `em_separacao`, `enviado`, `entregue`, `cancelado`; os antigos `aguardando_pagamento`, `em_analise` e `pago` ainda são aceitos). Total e parcelas são calculados pelo servidor Java (`servidor-java/`) e, se ele estiver fora do ar, pelo Node.

### auditoria
`userId`, `acao` (ex.: `login`, `produto.criado`, `pedido.criado`, `cotacao.aprovada`), `entidade`, `entidadeId`, `detalhes`, `ip`, `criadoEm`. Nunca guarda senhas.

### Coleções de apoio
A coleção `addresses` foi removida: os endereços ficam em `profiles.addresses`.

`sessions` (connect-mongo; criada automaticamente),  `password_resets` (token em hash SHA-256, expira em 1 h por índice TTL), `counters` (sequências de cotação e pedido).

## Índices

| Coleção | Índice | Tipo |
|---|---|---|
| users | email; email+accountType | o segundo é único (só quando accountType existe) |
| profiles | userId; document+accountType | únicos (document só quando existe) |
| produtos | categoria+marca; fornecedorId; vendidos; fornecedorId+chave (ativos) | o último é único |
| laudos | numero | único |
| avaliacoes | produtoId+userId | |
| cotacoes | userId+criadoEm; codigo | codigo único |
| pedidos | userId+criadoEm; itens.fornecedorId | |
| auditoria | userId+criadoEm | |
| password_resets | expiresAt (TTL); tokenHash | |

## Regras de integridade aplicadas na API

- Produto duplicado (mesmo nome e marca para o mesmo fornecedor) é recusado, inclusive na importação CSV.
- Produto com pedido em andamento não pode ser removido; cotação com propostas não pode ser excluída.
- Conta com pedidos em andamento não pode ser encerrada (a conta fica `inactive`, não é apagada).
- Exportação de pedidos em CSV só é liberada quando nenhum pedido está aguardando pagamento ou em análise.
