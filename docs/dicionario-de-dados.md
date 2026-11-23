# Dicionário de Dados: AgroRecursos MarketPlace

> **Observação importante:** este dicionário descreve os dados do projeto **AgroRecursos MarketPlace** como estão implementados na branch `Develop` (código em `backend/src/` e banco MongoDB `agrorecursos`). Os exemplos de documentos foram extraídos do banco real, com os campos sensíveis (como o hash de senha) substituídos por texto explicativo e as imagens truncadas. O projeto usa MongoDB; por isso o desdobramento principal é o documental (seção 4.1). O desdobramento relacional (seção 4.2) é uma **proposta equivalente**, escrita para fins de documentação e comparação.

O AgroRecursos é um marketplace de insumos agropecuários. Ele conecta **produtores rurais** (compradores) a **fornecedores** (vendedores): o produtor consulta o catálogo, pede cotações, compara propostas, confere laudos técnicos e fecha pedidos; o fornecedor cadastra produtos, responde cotações e acompanha as vendas. Este dicionário documenta as entidades necessárias para isso: usuários, perfis e endereços, fornecedores, produtos, laudos, avaliações, cotações e propostas, pedidos e itens, auditoria e as estruturas de apoio.

## 1. Histórico de versões

| Data | Autor | Versão | Comentários |
| :---: | :---: | ---: | :--- |
| 17/11/2026 | Equipe AgroRecursos (Time 15) | 1.0.0 | Versão inicial do dicionário de dados do AgroRecursos MarketPlace, com base na branch `Develop`. Segue o modelo de dicionário de dados do condomínio residencial. |

## 2. Entidades e atributos conceituais

Convenções usadas nas tabelas de atributos:

- **Característica:** *Simples*, *Composto (C)*, *Multivalorado (M)* ou *Multivalorado e composto (MC)*, como na seção 3.2.
- **Relacionamento:** o atributo guarda o `_id` de outra entidade.
- **Sistema:** valor preenchido pelo servidor, sem digitação do usuário.
- Todo documento tem um `_id` (tipo `ObjectId`) gerado pelo MongoDB, exceto onde indicado.

### 2.1. Usuário

Usuário representa a **conta de acesso** à plataforma: guarda o e-mail, a senha (em hash) e a situação da conta. Os dados pessoais e comerciais ficam no Perfil (seção 2.2). O mesmo e-mail pode ter uma conta de produtor e outra de fornecedor, mas não duas do mesmo tipo.

#### Atributos de Usuário

| Atributo / Dado | Tipo conceitual | Obrigatório | Característica | Ex. aceitos | Ex. não aceitos | Comentários |
| :--- | :---: | :---: | :---: | :--- | :--- | :--- |
| _id | Código | Sim | Simples | 6afc6ba6541f1a70b15cd38c | vazio, nulo | Identificador da conta (sistema). |
| email | Texto | Sim | Simples | maria@email.com | "maria", "a@b", e-mail com mais de 254 caracteres | Guardado em minúsculas. Único por tipo de conta (`accountType`). |
| accountType | Texto enumerado | Sim (contas novas) | Simples | produtor, fornecedor | qualquer valor fora da lista | Tipo da conta, copiado do perfil. Usado no índice de unicidade do e-mail. |
| passwordHash | Texto | Sim | Simples | $2a$12$... | senha em texto puro | Hash bcrypt (custo 12). A senha original tem de 8 a 72 caracteres e **nunca** é guardada. |
| status | Texto enumerado | Sim | Simples | active, inactive | qualquer valor fora da lista | `inactive` quando o usuário encerra a conta; a conta não é apagada. |
| emailVerified | Booleano | Sim | Simples | true, false | sim, não | Indica se o e-mail foi confirmado (contas de demonstração: `true`). |
| createdAt | Data e hora | Sim | Simples | 2026-11-17T14:58:46Z | data impossível | Criação da conta (sistema). |
| updatedAt | Data e hora | Sim | Simples | 2026-11-17T14:58:46Z | data impossível | Última alteração (sistema). |
| seed | Booleano | Não | Simples | true | — | Marca os usuários de demonstração criados pelo `npm run seed`. |

### 2.2. Perfil

Perfil representa os **dados pessoais e comerciais** do usuário: nome, documento, telefone, endereços, preferências e, para fornecedores, os dados da empresa. Cada usuário tem exatamente um perfil.

#### Atributos de Perfil

| Atributo / Dado | Tipo conceitual | Obrigatório | Característica | Ex. aceitos | Ex. não aceitos | Comentários |
| :--- | :---: | :---: | :---: | :--- | :--- | :--- |
| userId | Usuário | Sim | Relacionamento | 6afc6ba6541f1a70b15cd38e | nulo | Conta dona do perfil. Único. |
| name | Texto alfanumérico | Sim | Simples | Ana Souza | "", "A", nome com mais de 100 caracteres | Entre 2 e 100 caracteres. |
| accountType | Texto enumerado | Sim | Simples | produtor, fornecedor | qualquer valor fora da lista | Define as permissões: produtor compra; fornecedor vende. |
| phone | Texto | Não | Simples | (19) 99999-8888 | "12345", texto sem número | De 10 a 13 dígitos, com DDD. Até 20 caracteres. |
| document | Documento de identificação | Não | Composto (C) | 52998224725 (CPF), 11222333000181 (CNPJ) | 11111111111, CPF ou CNPJ com dígito verificador errado | Só dígitos. Validado pelos dígitos verificadores. **Fornecedor deve informar CNPJ (14 dígitos).** Único por tipo de conta. |
| companyName | Texto alfanumérico | Não | Simples | AgroVant Insumos Agrícolas Ltda | texto com mais de 120 caracteres | Razão social (fornecedor). |
| tradeName | Texto alfanumérico | Não | Simples | AgroVant | texto com mais de 120 caracteres | Nome fantasia (fornecedor). |
| stateRegistration | Texto | Não | Simples | 123456789 | texto com mais de 20 caracteres | Inscrição estadual (fornecedor). |
| categories | Texto enumerado | Não | Multivalorado (M) | ["Sementes", "Defensivos"] | ["Máquinas"] | Categorias que o fornecedor vende; valores fora da lista são descartados. |
| address | Endereço | Não | Composto (C) | ver seção 3.1 | UF com mais de 2 letras | Cópia do endereço principal (compatibilidade com telas antigas). |
| addresses | Endereço | Não | Multivalorado e composto (MC) | lista com 1 a 15 endereços | mais de 15 endereços | Endereços de entrega do usuário; um é o principal. |
| registrationStatus | Texto enumerado | Sim | Simples | basic, complete | qualquer valor fora da lista | `complete` exige telefone, documento (CPF ou CNPJ) e endereço completo (CEP, rua, número, bairro, cidade e UF). |
| darkMode | Booleano | Não | Simples | true, false | sim, não | Preferência de tema escuro. Ausente em perfis antigos (tratado como `false`). |
| favoritos | Código | Não | Multivalorado (M) | ["b20000000000000000000001"] | ids inexistentes ou fora do formato | Produtos favoritos (até 200 ids). |
| createdAt / updatedAt | Data e hora | Sim | Simples | 2026-11-17T14:58:46Z | data impossível | Controle de criação e alteração (sistema). |
| seed | Booleano | Não | Simples | true | — | Marca perfis de demonstração. |

### 2.3. Fornecedor

Fornecedor representa a **empresa que vende** produtos na plataforma. Ele é criado junto com a conta do tipo fornecedor (ou na primeira vez que o fornecedor precisa dele). Os fornecedores de demonstração não têm usuário (`userId` nulo). A nota (`avaliacao`) é a média das avaliações dos produtos do fornecedor.

#### Atributos de Fornecedor

| Atributo / Dado | Tipo conceitual | Obrigatório | Característica | Ex. aceitos | Ex. não aceitos | Comentários |
| :--- | :---: | :---: | :---: | :--- | :--- | :--- |
| _id | Código | Sim | Simples | a10000000000000000000001 | nulo | Identificador do fornecedor (sistema). |
| userId | Usuário | Não | Relacionamento | 6afc6ba6541f1a70b15cd38e, nulo | id de usuário inexistente | Conta que administra o fornecedor. Nulo nos fornecedores de demonstração. |
| nome | Texto alfanumérico | Sim | Simples | AgroVant Insumos Agrícolas Ltda | "", "A", mais de 120 caracteres | Razão social (de 2 a 120 caracteres). |
| nomeFantasia | Texto alfanumérico | Sim | Simples | AgroVant | "", "A", mais de 120 caracteres | Nome exibido no catálogo (de 2 a 120 caracteres). |
| avaliacao | Número decimal | Sim | Simples | 0, 4.5, 5 | -1, 5.5 | Média das notas, com 1 casa decimal. Recalculada a cada avaliação nova. |
| totalAvaliacoes | Número inteiro | Sim | Simples | 0, 47, 128 | -1, texto | Quantidade de avaliações consideradas. |
| criadoEm | Data e hora | Sim | Simples | 2026-01-15T12:00:00Z | data impossível | Criação (sistema). |
| atualizadoEm | Data e hora | Não | Simples | 2026-11-01T10:00:00Z | data impossível | Última alteração dos dados da empresa. |
| seed | Booleano | Não | Simples | true | — | Marca fornecedores de demonstração. |

### 2.4. Produto

Produto representa o **insumo agropecuário** anunciado por um fornecedor (semente, fertilizante, defensivo ou outro). Produtos **nunca são apagados fisicamente**: a remoção marca `ativo: false`, o que preserva pedidos e laudos antigos.

#### Atributos de Produto

| Atributo / Dado | Tipo conceitual | Obrigatório | Característica | Ex. aceitos | Ex. não aceitos | Comentários |
| :--- | :---: | :---: | :---: | :--- | :--- | :--- |
| _id | Código | Sim | Simples | b20000000000000000000001 | nulo | Identificador do produto (sistema). |
| nome | Texto alfanumérico | Sim | Simples | Semente Soja RR Super 40kg | "", "ab", mais de 120 caracteres | De 3 a 120 caracteres. |
| categoria | Texto enumerado | Sim | Simples | Sementes, Fertilizantes, Defensivos, Outros | Máquinas, vazio | Classificação do produto. |
| marca | Texto alfanumérico | Sim | Simples | Monsanto | vazio, mais de 60 caracteres | Marca ou fabricante. |
| regiao | Texto enumerado | Sim | Simples | Sudeste, Sul, Centro-Oeste, Nordeste, Norte | Lua, vazio | Região de atendimento. |
| preco | Número decimal | Sim | Simples | 180, 10.5, "1.234,50" (aceito na importação) | 0, -5, texto | Maior que zero, com 2 casas decimais, em reais. |
| entregaDias | Número inteiro | Sim | Simples | 3, 60 | 0, 61, 2.5 | Prazo de preparo do fornecedor, de 1 a 60 dias. |
| estoque | Número inteiro | Sim | Simples | 0, 500 | -1, 2.5 | Quantidade em estoque (padrão 0). O pedido só é aceito se houver estoque, e o estoque é baixado na compra e devolvido no cancelamento. |
| vendidos | Número inteiro | Sim | Simples | 0, 120 | -1, texto | Unidades vendidas; soma a cada pedido (sistema). |
| cultura | Texto | Não | Simples | Soja, Milho | mais de 60 caracteres | Padrão "Diversas". |
| tecnologia | Texto | Não | Simples | RR Super | mais de 60 caracteres | Tecnologia ou característica técnica. |
| embalagem | Texto | Não | Simples | Saco: 40kg | mais de 60 caracteres | Tipo e tamanho da embalagem. |
| descricao | Texto | Não | Simples | Semente Soja RR Super 40kg. | mais de 1000 caracteres | Descrição técnica. |
| vencimento | Texto | Não | Simples | 06/2027 | mais de 10 caracteres | Validade do lote (texto livre, no formato MM/AAAA). |
| condicao | Texto enumerado | Sim | Simples | Novo, Usado | qualquer valor fora da lista | Padrão "Novo". |
| germinacao, vigor, pureza | Número decimal | Não | Simples | 92, 88, 99.5 | texto | Dados de qualidade de sementes, em % (padrão 0). |
| fornecedorId | Fornecedor | Sim | Relacionamento | a10000000000000000000001 | nulo | Fornecedor dono do produto. |
| laudoId | Laudo | Não | Relacionamento | c30000000000000000000001, nulo | id inexistente | Laudo técnico vinculado; nulo quando não há. |
| chave | Texto | Sim | Simples | semente soja rr super 40kg\|monsanto | — | `nome\|marca` em minúsculas e sem acentos (sistema). Impede produto repetido ativo do mesmo fornecedor. |
| imagens | Arquivo ou URL | Não | Multivalorado (M) | ["data:image/jpeg;base64,...", "https://site/foto.jpg", "/img/x.png"] | arquivo de outro formato (ex.: PDF), imagem com mais de 2.000.000 caracteres | Até 6 imagens; a primeira é a capa. Ver seção 3.4. |
| ativo | Booleano | Sim | Simples | true, false | sim, não | Exclusão lógica. |
| criadoEm | Data e hora | Sim | Simples | 2026-02-01T12:00:00Z | data impossível | Criação (sistema). |
| atualizadoEm | Data e hora | Não | Simples | 2026-11-10T09:00:00Z | data impossível | Última alteração (sistema). |
| seed | Booleano | Não | Simples | true | — | Marca produtos de demonstração. |

### 2.5. Laudo

Laudo representa o **laudo de conformidade técnica** (órgão de referência MAPA) de um produto, consultável pelo número e baixável em PDF. Um laudo é vinculado a um produto do próprio fornecedor.

#### Atributos de Laudo

| Atributo / Dado | Tipo conceitual | Obrigatório | Característica | Ex. aceitos | Ex. não aceitos | Comentários |
| :--- | :---: | :---: | :---: | :--- | :--- | :--- |
| _id | Código | Sim | Simples | c30000000000000000000001 | nulo | Identificador (sistema). |
| numero | Texto alfanumérico | Sim | Simples | MAPA-00123 | "ab", "mapa 12", mais de 40 caracteres | De 4 a 40 caracteres: letras, números e hífen. Guardado em maiúsculas. Único. |
| orgao | Texto | Sim | Simples | MAPA | vazio | Órgão de referência (fixo em "MAPA"). |
| produtoId | Produto | Sim | Relacionamento | b20000000000000000000001 | produto de outro fornecedor ou inexistente | Produto coberto pelo laudo. |
| fornecedorId | Fornecedor | Sim | Relacionamento | a10000000000000000000001 | nulo | Fornecedor que cadastrou o laudo. |
| emissao | Data | Sim | Simples | 2026-03-10 | data impossível | Data de emissão. |
| validade | Data | Sim | Simples | 2027-03-10 | data igual ou anterior à emissão | Data de validade. |
| resultados | Resultado de laudo | Não | Composto (C) | {"Germinação": "92%", "Vigor": "88%"} | mais de 12 itens | Pares nome/valor dos ensaios. Ver seção 3.2. |
| criadoEm | Data e hora | Sim | Simples | 2026-03-10T12:00:00Z | data impossível | Criação (sistema). |
| seed | Booleano | Não | Simples | true | — | Marca laudos de demonstração. |

### 2.6. Avaliação

Avaliação representa a **nota e o comentário** de um usuário sobre um produto. Cada usuário tem no máximo uma avaliação por produto (uma nova substitui a anterior). A avaliação é "verificada" quando o usuário comprou o produto.

#### Atributos de Avaliação

| Atributo / Dado | Tipo conceitual | Obrigatório | Característica | Ex. aceitos | Ex. não aceitos | Comentários |
| :--- | :---: | :---: | :---: | :--- | :--- | :--- |
| _id | Código | Sim | Simples | 6ae13280a807aeb695edb2df | nulo | Identificador (sistema). |
| produtoId | Produto | Sim | Relacionamento | b20000000000000000000005 | produto inexistente | Produto avaliado. |
| userId | Usuário | Não | Relacionamento | 6ae131e18785f9861d988dfb, nulo | — | Autor. Nulo nas avaliações de demonstração. |
| nota | Número inteiro | Sim | Simples | 1, 3, 5 | 0, 6, 4.5 | De 1 a 5. |
| comentario | Texto | Não | Simples | Ótimo vigor e germinação. | mais de 500 caracteres | Texto livre. |
| autor | Texto | Sim | Simples | Produtor Verificado - Marcos | — | Rótulo exibido (tipo da conta, "Verificado" e primeiro nome) (sistema). |
| verificado | Booleano | Sim | Simples | true, false | sim, não | `true` quando o usuário já comprou o produto (sistema). |
| criadoEm / atualizadoEm | Data e hora | Sim | Simples | 2026-10-27T23:23:44Z | data impossível | Controle (sistema). |
| seed | Booleano | Não | Simples | true | — | Marca avaliações de demonstração. |

### 2.7. Cotação

Cotação representa o **pedido de orçamento** de um produtor: ele descreve o item e a quantidade, e os fornecedores respondem com propostas (seção 2.8). A cotação fica aberta por um prazo de 1 a 30 dias; com duas ou mais propostas passa para "em análise"; o produtor então aprova uma proposta (fecha) ou recusa. Cotação com propostas não pode ser excluída.

#### Atributos de Cotação

| Atributo / Dado | Tipo conceitual | Obrigatório | Característica | Ex. aceitos | Ex. não aceitos | Comentários |
| :--- | :---: | :---: | :---: | :--- | :--- | :--- |
| _id | Código | Sim | Simples | 6afc6ba6541f1a70b15cd400 | nulo | Identificador (sistema). |
| codigo | Texto alfanumérico | Sim | Simples | CR00001, CR00015 | vazio | `CR` + sequência de 5 dígitos (sistema, via contador). Único. |
| userId | Usuário | Sim | Relacionamento | 6afc6567f1b79309ed2a1695 | usuário que não é produtor | Produtor que pediu a cotação. |
| item | Texto alfanumérico | Sim | Simples | Ureia 45% | "", "ab", mais de 120 caracteres | O que está sendo cotado (de 3 a 120 caracteres). |
| quantidade | Texto | Sim | Simples | 200 Sacos, 5 t | "", mais de 40 caracteres | Quantidade em texto livre. |
| produtoId | Produto | Não | Relacionamento | b20000000000000000000001, nulo | produto inexistente | Produto do catálogo ligado à cotação, se houver. |
| criadoEm | Data e hora | Sim | Simples | 2026-11-15T10:00:00Z | data impossível | Criação (sistema). |
| vencimento | Data e hora | Sim | Simples | 2026-11-20T10:00:00Z | data impossível | Criação + `diasValidade` (de 1 a 30 dias; padrão 3). |
| status | Texto enumerado | Sim | Simples | aguardando, analise, fechada, recusada | qualquer valor fora da lista | Situação da cotação. |
| propostas | Proposta | Não | Multivalorado e composto (MC) | lista de propostas | — | Respostas dos fornecedores (embutidas). |
| propostaAprovadaId | Proposta | Não | Relacionamento | 6afc6ba6541f1a70b15cd401, nulo | proposta de outra cotação | Proposta escolhida, quando `status` é `fechada`. |
| encerradoEm | Data e hora | Não | Simples | 2026-11-16T09:00:00Z | data impossível | Quando foi aprovada ou recusada (sistema). |

### 2.8. Proposta

Proposta representa a **resposta de um fornecedor** a uma cotação. Fica **embutida** na cotação. Cada fornecedor tem no máximo uma proposta por cotação (reenviar substitui a anterior).

#### Atributos de Proposta

| Atributo / Dado | Tipo conceitual | Obrigatório | Característica | Ex. aceitos | Ex. não aceitos | Comentários |
| :--- | :---: | :---: | :---: | :--- | :--- | :--- |
| _id | Código | Sim | Simples | 6afc6ba6541f1a70b15cd401 | nulo | Identificador da proposta dentro da cotação (sistema). |
| fornecedorId | Fornecedor | Sim | Relacionamento | a10000000000000000000001 | nulo | Fornecedor que propôs. |
| fornecedor | Texto | Sim | Simples | AgroVant | vazio | Nome fantasia no momento da proposta (cópia). |
| preco | Número decimal | Sim | Simples | 36000, 100.5 | 0, -1, texto | Valor total proposto, maior que zero, com 2 casas decimais. |
| prazo | Número inteiro | Sim | Simples | 3, 60 | 0, 61, 2.5 | Prazo de entrega, de 1 a 60 dias. |
| laudo | Booleano | Sim | Simples | true, false | sim, não | Indica se a proposta inclui laudo. |
| avaliacao | Número decimal | Sim | Simples | 4.5 | -1, 6 | Nota do fornecedor no momento da proposta (cópia). |
| criadoEm | Data e hora | Não | Simples | 2026-11-15T11:00:00Z | data impossível | Envio da proposta (sistema). |

### 2.9. Pedido

Pedido representa a **compra** feita por um produtor, com itens de um ou mais fornecedores. O valor de cada item é uma **cópia** do produto no momento da compra (histórico imutável). O total e as parcelas são calculados pelo **servidor Java** (`servidor-java/`), e, se ele estiver fora do ar, pelo próprio Node.

#### Atributos de Pedido

| Atributo / Dado | Tipo conceitual | Obrigatório | Característica | Ex. aceitos | Ex. não aceitos | Comentários |
| :--- | :---: | :---: | :---: | :--- | :--- | :--- |
| _id | Código | Sim | Simples | 6afc6cf42337bab143c49692 | nulo | Identificador (sistema). |
| numero | Texto alfanumérico | Sim | Simples | PED000006 | vazio | `PED` + sequência de 6 dígitos (sistema, via contador). Único. |
| userId | Usuário | Sim | Relacionamento | 6afc6567f1b79309ed2a1695 | usuário que não é produtor | Produtor que comprou. |
| itens | Item do pedido | Sim | Multivalorado e composto (MC) | de 1 a 50 itens | lista vazia | Produtos comprados (embutidos). Ver seção 2.10. |
| subtotal | Número decimal | Sim | Simples | 168 | -1 | Soma dos subtotais dos itens. |
| frete | Frete | Sim | Composto (C) | {"valor": 50, "prazo": 3} | CEP inválido | Valor do frete e prazo de transporte (dias úteis), calculados pelo CEP. Ver seção 3.3. |
| total | Número decimal | Sim | Simples | 218 | -1 | Subtotal + frete. |
| entrega | Entrega | Sim | Composto (C) | ver seção 3.3 | rua, número, bairro ou cidade vazios | Endereço de entrega do pedido. |
| pagamento | Pagamento | Sim | Composto (C) | {"metodo": "cartao", "parcelas": 1, "valorParcelas": [218], "status": "confirmado"} | método fora da lista, parcelas fora de 1 a 12 | Forma de pagamento e parcelas. Ver seção 3.3. |
| status | Texto enumerado | Sim | Simples | criado, confirmado, em_separacao, enviado, entregue, cancelado | qualquer valor fora da lista | Situação do pedido. Os status antigos `aguardando_pagamento`, `em_analise` e `pago` ainda são aceitos. |
| criadoEm | Data e hora | Sim | Simples | 2026-11-17T15:04:20Z | data impossível | Criação (sistema). |
| atualizadoEm | Data e hora | Não | Simples | 2026-11-18T09:00:00Z | data impossível | Última mudança de status (sistema). |

### 2.10. Item do pedido

Item do pedido representa **um produto comprado** dentro de um pedido. Fica **embutido** no pedido. Nome e preço são cópias do produto no momento da compra.

#### Atributos de Item do pedido

| Atributo / Dado | Tipo conceitual | Obrigatório | Característica | Ex. aceitos | Ex. não aceitos | Comentários |
| :--- | :---: | :---: | :---: | :--- | :--- | :--- |
| produtoId | Produto | Sim | Relacionamento | b20000000000000000000025 | produto inativo ou inexistente | Produto comprado. |
| fornecedorId | Fornecedor | Sim | Relacionamento | a10000000000000000000004 | nulo | Fornecedor vendedor (cópia do produto). |
| nome | Texto | Sim | Simples | Fertilizante NPK 20-05-20 50kg | vazio | Nome do produto na hora da compra (cópia). |
| preco | Número decimal | Sim | Simples | 168 | 0, -1 | Preço unitário na hora da compra (cópia). |
| quantidade | Número inteiro | Sim | Simples | 1, 10000 | 0, 10001, 2.5 | De 1 a 10.000. Itens repetidos no carrinho são somados. |
| subtotal | Número decimal | Sim | Simples | 168 | -1 | `preco × quantidade`, com 2 casas decimais. |
| status | Texto | Sim | Simples | criado, enviado, cancelado | outro valor | Status do item: cada fornecedor muda só os seus itens. Pedidos antigos sem este campo usam o status do pedido. |

### 2.11. Registro de Auditoria

Registro de Auditoria representa **uma ação relevante** feita no sistema (login, cadastro, criação de pedido, aprovação de cotação etc.). É um histórico: nunca guarda senhas.

#### Atributos de Registro de Auditoria

| Atributo / Dado | Tipo conceitual | Obrigatório | Característica | Ex. aceitos | Ex. não aceitos | Comentários |
| :--- | :---: | :---: | :---: | :--- | :--- | :--- |
| _id | Código | Sim | Simples | 6ae1327f6067bae2ea61958e | nulo | Identificador (sistema). |
| userId | Usuário | Não | Relacionamento | 6ae131e18785f9861d988dfb, nulo | — | Autor da ação; nulo quando não havia sessão. |
| acao | Texto | Sim | Simples | login, produto.criado, pedido.criado, cotacao.aprovada | vazio | Nome da ação (`entidade.verbo`). |
| entidade | Texto | Não | Simples | usuario, produto, pedido, cotacao | — | Tipo do objeto afetado. |
| entidadeId | Texto | Não | Simples | 6ae131e18785f9861d988dfb | — | Id do objeto afetado, em texto. |
| detalhes | Objeto | Não | Composto (C) | {"numero": "PED000006", "total": 218} | senha, token | Dados extras da ação. |
| ip | Texto | Não | Simples | ::1, 177.10.20.30 | — | Endereço IP de quem fez a ação. |
| criadoEm | Data e hora | Sim | Simples | 2026-10-27T23:23:43Z | data impossível | Momento da ação (sistema). |

### 2.12. Contador

Contador representa uma **sequência numérica** usada para gerar os números de pedido e de cotação sem repetição.

#### Atributos de Contador

| Atributo / Dado | Tipo conceitual | Obrigatório | Característica | Ex. aceitos | Ex. não aceitos | Comentários |
| :--- | :---: | :---: | :---: | :--- | :--- | :--- |
| _id | Texto enumerado | Sim | Simples | pedido, cotacao | qualquer outro nome | Nome da sequência (aqui o `_id` é texto, não `ObjectId`). |
| seq | Número inteiro | Sim | Simples | 6, 15 | negativo | Último número emitido; é incrementado de forma atômica. |

### 2.13. Redefinição de senha

Redefinição de senha representa o **pedido temporário de troca de senha**. Só o hash do token é guardado; o token em si vai no link enviado ao usuário.

#### Atributos de Redefinição de senha

| Atributo / Dado | Tipo conceitual | Obrigatório | Característica | Ex. aceitos | Ex. não aceitos | Comentários |
| :--- | :---: | :---: | :---: | :--- | :--- | :--- |
| userId | Usuário | Sim | Relacionamento | 6afc6567f1b79309ed2a1695 | nulo | Usuário que pediu a troca. Um pedido novo apaga o anterior. |
| tokenHash | Texto | Sim | Simples | 9f86d081884c7d65... | token em texto puro | SHA-256 do token de 64 caracteres hexadecimais. |
| createdAt | Data e hora | Sim | Simples | 2026-11-17T10:00:00Z | data impossível | Criação (sistema). |
| expiresAt | Data e hora | Sim | Simples | 2026-11-17T11:00:00Z | data no passado | Criação + 1 hora. O MongoDB apaga o documento sozinho depois dessa data. |

### 2.14. Sessão

Sessão representa o **login ativo** de um usuário (cookie `agrorecursos.sid`, válido por 8 horas). É criada e removida automaticamente pelo `connect-mongo`; o projeto não grava nela diretamente.

#### Atributos de Sessão

| Atributo / Dado | Tipo conceitual | Obrigatório | Característica | Ex. aceitos | Ex. não aceitos | Comentários |
| :--- | :---: | :---: | :---: | :--- | :--- | :--- |
| _id | Texto | Sim | Simples | identificador da sessão | vazio | Id da sessão (texto). |
| session | Texto (JSON) | Sim | Simples | {"userId": "..."} | — | Dados da sessão, em JSON (guarda o `userId`). |
| expires | Data e hora | Sim | Simples | 2026-11-17T23:00:00Z | data no passado | Fim da sessão; índice TTL remove o documento. |

## 3. Tipos especiais, compostos ou específicos

### 3.1. Endereço

Estrutura composta usada em `profiles.address` (um endereço) e `profiles.addresses` (lista de até 15).

| Atributo / Dado | Tipo conceitual | Obrigatório | Comentários |
| :--- | :--- | :---: | :--- |
| id | Texto (UUID) | Sim (em `addresses`) | Identificador do endereço dentro do perfil (até 64 caracteres). |
| label | Texto | Não | Apelido, como "Endereço principal" (até 60 caracteres). |
| cep | Texto | Não | 8 dígitos, sem hífen. |
| street | Texto | Não | Rua / logradouro (até 120 caracteres). |
| number | Texto | Não | Número (até 20 caracteres). |
| complement | Texto | Não | Complemento (até 80 caracteres). |
| neighborhood | Texto | Não | Bairro (até 80 caracteres). |
| city | Texto | Não | Cidade (até 80 caracteres). |
| state | Texto | Não | UF com 2 letras maiúsculas, como SP. |
| observacoes | Texto | Não | Observações de entrega (até 300 caracteres). |
| principal | Booleano | Sim (em `addresses`) | Indica o endereço principal; sempre há um quando a lista não está vazia. |

### 3.2. Resultado de laudo

Estrutura composta de pares nome/valor, usada em `laudos.resultados`. O nome tem até 40 caracteres e o valor até 80; no máximo 12 pares.

| Atributo / Dado | Tipo conceitual | Obrigatório | Comentários |
| :--- | :--- | :---: | :--- |
| (nome do ensaio) | Texto | Sim | Ex.: `Germinação`, `Vigor`, `Pureza`. |
| (valor do ensaio) | Texto | Sim | Ex.: `92%`, `99.5%`. |

### 3.3. Estruturas do pedido

| Estrutura | Campos | Regras |
| :--- | :--- | :--- |
| `frete` | `valor` (número), `prazo` (inteiro, dias úteis) | `valor = 45 + 5 × (1º dígito do CEP)`; o `prazo` depende da região do CEP (de 3 a 9 dias úteis, origem em SP). |
| `entrega` | `cep` (8 dígitos), `rua` (≤120), `numero` (≤20), `complemento` (≤80), `bairro` (≤80), `cidade` (≤80), `estado` (UF), `observacoes` (≤300) | Rua, número, bairro e cidade são obrigatórios; UF com 2 letras maiúsculas. |
| `pagamento` | `metodo` (boleto, cartao, credito_rural), `parcelas` (1 a 12), `valorParcelas` (lista de números), `status` (confirmado, pendente, cancelado) | `parcelas` só passa de 1 no cartão. A soma de `valorParcelas` é igual ao `total`; a última parcela leva a sobra dos centavos. |

### 3.4. Imagem do produto

Cada item de `produtos.imagens` é um texto em um destes formatos: **data URI** (`data:image/png|jpeg|webp|gif|svg+xml;base64,...`, a imagem gravada dentro do próprio documento), **URL** `http(s)://` ou **caminho relativo** (`/img/foto.png`). Cada imagem tem no máximo 2.000.000 caracteres e cada produto no máximo 6 imagens. Os produtos de demonstração têm a foto gravada como data URI (JPEG de até 520 px).

### 3.5. Padrões de atributos especiais

| Código | Significado | Uso no dicionário |
| :---: | :--- | :--- |
| C | Composto | Usado quando um atributo possui partes internas (documento, endereço, frete, entrega, pagamento, resultados). |
| M | Multivalorado | Usado quando um atributo pode ter vários valores (categorias, favoritos, imagens). |
| MC | Multivalorado e composto | Usado quando há uma lista de estruturas compostas (endereços, propostas, itens do pedido). |

## 4. Desdobramento físico ou tecnológico

### 4.1. Desdobramento para banco não relacional orientado a documentos: MongoDB (implementação real)

O projeto usa o banco `agrorecursos`, no MongoDB Atlas, acessado pelo driver oficial `mongodb`. Os índices são criados na inicialização do servidor (`backend/src/config/database.js`). A modelagem segue a regra: **dados lidos juntos ficam embutidos; entidades que existem sozinhas ficam em coleções próprias e se ligam por referência (`ObjectId`)**.

#### Coleções

| Coleção | Finalidade | Estratégia documental |
| :--- | :--- | :--- |
| `users` | Contas de acesso | Documento próprio; referenciado por `profiles.userId` e por quase todas as outras coleções. |
| `profiles` | Dados pessoais e comerciais | Documento próprio por usuário; **embute** `addresses` (lista) e `favoritos`. |
| `fornecedores` | Empresas vendedoras | Documento próprio; referenciado por `produtos`, `laudos` e `pedidos.itens`. |
| `produtos` | Catálogo | Documento próprio; referencia o fornecedor e o laudo; **embute** `imagens`. |
| `laudos` | Laudos técnicos | Documento próprio; **embute** `resultados`. |
| `avaliacoes` | Notas e comentários | Documento próprio por usuário e produto (consultado por produto). |
| `cotacoes` | Pedidos de orçamento | Documento próprio; **embute** `propostas`. |
| `pedidos` | Compras | Documento próprio; **embute** `itens`, `frete`, `entrega` e `pagamento`. |
| `auditoria` | Histórico de ações | Eventos históricos, um documento por ação. |
| `counters` | Sequências de número | Um documento por sequência (`pedido`, `cotacao`). |
| `password_resets` | Trocas de senha pendentes | Documento temporário, removido por índice TTL. |
| `sessions` | Logins ativos | Gerenciada pelo `connect-mongo`; removida por índice TTL. |

A coleção `addresses` existiu nas primeiras versões e foi **removida**: os endereços agora ficam em `profiles.addresses`.

#### Exemplo de documento da coleção `users`

```json
{
  "_id": "6afc6ba6541f1a70b15cd38c",
  "email": "demo.produtor@agrorecursos.com",
  "accountType": "produtor",
  "passwordHash": "(hash bcrypt, custo 12)",
  "status": "active",
  "emailVerified": true,
  "createdAt": "2026-11-17T14:58:46.314Z",
  "updatedAt": "2026-11-17T14:58:46.314Z",
  "seed": true
}
```

#### Exemplo de documento da coleção `profiles`

```json
{
  "_id": "6afc6ba6541f1a70b15cd38f",
  "userId": "6afc6ba6541f1a70b15cd38e",
  "name": "Ana Souza",
  "accountType": "fornecedor",
  "phone": "(19) 3333-4444",
  "document": "11222333000181",
  "companyName": "AgroVant Insumos Agrícolas Ltda",
  "tradeName": "AgroVant",
  "address": { "cep": "13010111", "street": "Rua Barão de Jaguara", "number": "100", "complement": "", "neighborhood": "Centro", "city": "Campinas", "state": "SP" },
  "addresses": [
    { "id": "7b7df6b9-893a-4944-94f3-b9e0b3db1602", "label": "Endereço principal", "cep": "13010111", "street": "Rua Barão de Jaguara", "number": "100", "complement": "", "neighborhood": "Centro", "city": "Campinas", "state": "SP", "observacoes": "", "principal": true }
  ],
  "registrationStatus": "complete",
  "darkMode": false,
  "favoritos": [],
  "createdAt": "2026-11-17T14:58:46.314Z",
  "updatedAt": "2026-11-17T14:58:46.314Z"
}
```

Os endereços ficam embutidos no perfil porque são lidos junto com ele (tela Minha Conta e checkout) e só fazem sentido para o dono.

#### Exemplo de documento da coleção `produtos`

```json
{
  "_id": "b20000000000000000000001",
  "nome": "Semente Soja RR Super 40kg",
  "categoria": "Sementes",
  "marca": "Monsanto",
  "regiao": "Centro-Oeste",
  "preco": 180,
  "entregaDias": 3,
  "estoque": 500,
  "vendidos": 120,
  "cultura": "Soja",
  "tecnologia": "RR Super",
  "embalagem": "Saco: 40kg",
  "descricao": "Semente Soja RR Super 40kg. Tecnologia: RR Super. Saco: 40kg.",
  "vencimento": "06/2027",
  "condicao": "Novo",
  "germinacao": 92,
  "vigor": 88,
  "pureza": 99.5,
  "fornecedorId": "a10000000000000000000001",
  "laudoId": "c30000000000000000000001",
  "chave": "semente soja rr super 40kg|monsanto",
  "imagens": ["data:image/jpeg;base64,/9j/4AAQ... (imagem gravada no banco)"],
  "ativo": true,
  "criadoEm": "2026-02-01T12:00:00.000Z"
}
```

#### Exemplo de documento da coleção `laudos`

```json
{
  "_id": "c30000000000000000000001",
  "numero": "MAPA-00123",
  "orgao": "MAPA",
  "produtoId": "b20000000000000000000001",
  "fornecedorId": "a10000000000000000000001",
  "emissao": "2026-03-10T00:00:00.000Z",
  "validade": "2027-03-10T00:00:00.000Z",
  "resultados": { "Germinação": "92%", "Vigor": "88%", "Pureza": "99.5%" },
  "criadoEm": "2026-03-10T12:00:00.000Z"
}
```

#### Exemplo de documento da coleção `cotacoes`

```json
{
  "_id": "6afc6ba6541f1a70b15cd400",
  "codigo": "CR00016",
  "userId": "6afc6567f1b79309ed2a1695",
  "item": "Ureia 45%",
  "quantidade": "5 t",
  "produtoId": null,
  "criadoEm": "2026-11-17T15:30:00.000Z",
  "vencimento": "2026-11-20T15:30:00.000Z",
  "status": "analise",
  "propostas": [
    { "_id": "6afc6ba6541f1a70b15cd401", "fornecedorId": "a10000000000000000000001", "fornecedor": "AgroVant", "preco": 36000, "prazo": 3, "laudo": true, "avaliacao": 4.5, "criadoEm": "2026-11-17T16:00:00.000Z" },
    { "_id": "6afc6ba6541f1a70b15cd402", "fornecedorId": "a10000000000000000000002", "fornecedor": "CampoLimpo", "preco": 37400, "prazo": 4, "laudo": true, "avaliacao": 4, "criadoEm": "2026-11-17T16:20:00.000Z" }
  ]
}
```

As propostas ficam dentro da cotação porque só fazem sentido nela e são lidas junto com ela.

#### Exemplo de documento da coleção `pedidos`

```json
{
  "_id": "6afc6cf42337bab143c49692",
  "numero": "PED000006",
  "userId": "6afc6567f1b79309ed2a1695",
  "itens": [
    { "produtoId": "b20000000000000000000025", "fornecedorId": "a10000000000000000000004", "nome": "Fertilizante NPK 20-05-20 50kg", "preco": 168, "quantidade": 1, "subtotal": 168, "status": "criado" }
  ],
  "subtotal": 168,
  "frete": { "valor": 50, "prazo": 3 },
  "total": 218,
  "entrega": { "cep": "13912474", "rua": "Rua Custódio", "numero": "57", "complemento": "", "bairro": "Jardim Elisa", "cidade": "Jaguariúna", "estado": "SP", "observacoes": "" },
  "pagamento": { "metodo": "cartao", "parcelas": 1, "valorParcelas": [218], "status": "confirmado" },
  "status": "criado",
  "criadoEm": "2026-11-17T15:04:20.730Z"
}
```

Os itens guardam uma **cópia** de nome e preço no momento da compra: se o produto mudar depois, o histórico do pedido não muda.

#### Exemplo de documento da coleção `avaliacoes`

```json
{
  "_id": "6ae13280a807aeb695edb2df",
  "produtoId": "b20000000000000000000005",
  "userId": "6ae131e18785f9861d988dfb",
  "nota": 4,
  "comentario": "Boa relação custo-benefício.",
  "autor": "Produtor Verificado - Marcos",
  "verificado": true,
  "criadoEm": "2026-10-27T23:23:44.234Z",
  "atualizadoEm": "2026-10-27T23:24:51.111Z"
}
```

#### Observações sobre a modelagem documental

- Dados consultados juntos são embutidos: endereços no perfil, propostas na cotação, itens/frete/entrega/pagamento no pedido, imagens no produto.
- Entidades que existem sozinhas ficam em coleções próprias e se ligam por `ObjectId`: usuário, perfil, fornecedor, produto, laudo, avaliação.
- Pedidos e propostas guardam **cópias** de dados (nome e preço do produto, nome e nota do fornecedor) para preservar o histórico do momento da compra ou da proposta.
- A média do fornecedor (`avaliacao`) é recalculada e guardada a cada avaliação nova, para não calcular a cada leitura do catálogo.
- As imagens dos produtos de demonstração ficam **dentro do banco** (data URI), e não como arquivos do projeto.
- O servidor Java (`servidor-java/`) **não acessa o banco**: ele só recebe subtotal, frete e parcelas e devolve total e valor da parcela.

### 4.2. Desdobramento para banco relacional (proposta equivalente)

Esta seção mostra como o mesmo modelo ficaria em um banco relacional. **O projeto não usa estas tabelas.** As listas embutidas (endereços, imagens, propostas, itens) viram tabelas filhas, e as referências viram chaves estrangeiras.

#### Tabela `USUARIOS`

| Campo | Tipo físico | Obrigatório | Chave | Observação |
| :--- | :---: | :---: | :---: | :--- |
| id_usuario | integer | Sim | PK | Código único da conta. |
| email | varchar(254) | Sim | UK (com tipo_conta) | E-mail em minúsculas. |
| tipo_conta | varchar(20) | Sim | UK (com email) | PRODUTOR ou FORNECEDOR. |
| senha_hash | varchar(100) | Sim |  | Hash bcrypt. |
| status | varchar(10) | Sim |  | ACTIVE ou INACTIVE. |
| email_verificado | boolean | Sim |  | |
| criado_em / atualizado_em | timestamp | Sim |  | |

#### Tabela `PERFIS`

| Campo | Tipo físico | Obrigatório | Chave | Observação |
| :--- | :---: | :---: | :---: | :--- |
| id_perfil | integer | Sim | PK | |
| id_usuario | integer | Sim | FK, UK | Referência para `USUARIOS` (1 para 1). |
| nome | varchar(100) | Sim |  | |
| telefone | varchar(20) | Não |  | |
| documento | varchar(14) | Não | UK (com tipo_conta) | CPF ou CNPJ só com dígitos. |
| razao_social | varchar(120) | Não |  | Fornecedor. |
| nome_fantasia | varchar(120) | Não |  | Fornecedor. |
| inscricao_estadual | varchar(20) | Não |  | Fornecedor. |
| situacao_cadastro | varchar(10) | Sim |  | BASIC ou COMPLETE. |
| tema_escuro | boolean | Sim |  | |
| criado_em / atualizado_em | timestamp | Sim |  | |

#### Tabelas `PERFIS_CATEGORIAS` e `PERFIS_FAVORITOS`

| Campo | Tipo físico | Obrigatório | Chave | Observação |
| :--- | :---: | :---: | :---: | :--- |
| id_perfil | integer | Sim | PK, FK | Referência para `PERFIS`. |
| categoria | varchar(20) | Sim | PK | Em `PERFIS_CATEGORIAS`: Sementes, Fertilizantes, Defensivos, Outros. |
| id_produto | integer | Sim | PK, FK | Em `PERFIS_FAVORITOS`: referência para `PRODUTOS` (substitui a coluna `categoria`). |

#### Tabela `ENDERECOS`

| Campo | Tipo físico | Obrigatório | Chave | Observação |
| :--- | :---: | :---: | :---: | :--- |
| id_endereco | uuid | Sim | PK | |
| id_perfil | integer | Sim | FK | Referência para `PERFIS`. |
| apelido | varchar(60) | Não |  | |
| cep | char(8) | Não |  | |
| rua | varchar(120) | Não |  | |
| numero | varchar(20) | Não |  | |
| complemento | varchar(80) | Não |  | |
| bairro | varchar(80) | Não |  | |
| cidade | varchar(80) | Não |  | |
| uf | char(2) | Não |  | |
| observacoes | varchar(300) | Não |  | |
| principal | boolean | Sim |  | Só um por perfil. |

#### Tabela `FORNECEDORES`

| Campo | Tipo físico | Obrigatório | Chave | Observação |
| :--- | :---: | :---: | :---: | :--- |
| id_fornecedor | integer | Sim | PK | |
| id_usuario | integer | Não | FK | Referência para `USUARIOS`. |
| razao_social | varchar(120) | Sim |  | |
| nome_fantasia | varchar(120) | Sim |  | |
| avaliacao | numeric(2,1) | Sim |  | Média de 0 a 5. |
| total_avaliacoes | integer | Sim |  | |
| criado_em / atualizado_em | timestamp | Sim / Não |  | |

#### Tabela `PRODUTOS`

| Campo | Tipo físico | Obrigatório | Chave | Observação |
| :--- | :---: | :---: | :---: | :--- |
| id_produto | integer | Sim | PK | |
| id_fornecedor | integer | Sim | FK, UK (com chave) | Referência para `FORNECEDORES`. |
| id_laudo | integer | Não | FK | Referência para `LAUDOS`. |
| nome | varchar(120) | Sim |  | |
| categoria | varchar(20) | Sim |  | SEMENTES, FERTILIZANTES, DEFENSIVOS, OUTROS. |
| marca | varchar(60) | Sim |  | |
| regiao | varchar(20) | Sim |  | |
| preco | numeric(12,2) | Sim |  | Maior que zero. |
| entrega_dias | integer | Sim |  | De 1 a 60. |
| estoque | integer | Sim |  | |
| vendidos | integer | Sim |  | |
| cultura / tecnologia / embalagem | varchar(60) | Não |  | |
| descricao | varchar(1000) | Não |  | |
| vencimento | varchar(10) | Não |  | |
| condicao | varchar(10) | Sim |  | NOVO ou USADO. |
| germinacao / vigor / pureza | numeric(5,2) | Não |  | |
| chave | varchar(200) | Sim | UK (com id_fornecedor, para ativos) | `nome\|marca` normalizado. |
| ativo | boolean | Sim |  | Exclusão lógica. |
| criado_em / atualizado_em | timestamp | Sim / Não |  | |

#### Tabela `PRODUTOS_IMAGENS`

| Campo | Tipo físico | Obrigatório | Chave | Observação |
| :--- | :---: | :---: | :---: | :--- |
| id_produto_imagem | integer | Sim | PK | |
| id_produto | integer | Sim | FK | Referência para `PRODUTOS`. |
| posicao | smallint | Sim |  | De 1 a 6; 1 é a capa. |
| conteudo | text | Sim |  | Data URI, URL ou caminho relativo. |

#### Tabelas `LAUDOS` e `LAUDOS_RESULTADOS`

| Campo | Tipo físico | Obrigatório | Chave | Observação |
| :--- | :---: | :---: | :---: | :--- |
| id_laudo | integer | Sim | PK | |
| numero | varchar(40) | Sim | UK | Em maiúsculas. |
| orgao | varchar(20) | Sim |  | MAPA. |
| id_produto | integer | Sim | FK | Referência para `PRODUTOS`. |
| id_fornecedor | integer | Sim | FK | Referência para `FORNECEDORES`. |
| emissao / validade | date | Sim |  | Validade posterior à emissão. |
| criado_em | timestamp | Sim |  | |
| (`LAUDOS_RESULTADOS`) id_laudo, nome, valor | integer, varchar(40), varchar(80) | Sim | PK (id_laudo, nome), FK | Até 12 linhas por laudo. |

#### Tabela `AVALIACOES`

| Campo | Tipo físico | Obrigatório | Chave | Observação |
| :--- | :---: | :---: | :---: | :--- |
| id_avaliacao | integer | Sim | PK | |
| id_produto | integer | Sim | FK, UK (com id_usuario) | |
| id_usuario | integer | Não | FK, UK (com id_produto) | Nulo nas avaliações de demonstração. |
| nota | smallint | Sim |  | De 1 a 5. |
| comentario | varchar(500) | Não |  | |
| autor | varchar(120) | Sim |  | |
| verificado | boolean | Sim |  | |
| criado_em / atualizado_em | timestamp | Sim |  | |

#### Tabelas `COTACOES` e `PROPOSTAS`

| Campo | Tipo físico | Obrigatório | Chave | Observação |
| :--- | :---: | :---: | :---: | :--- |
| id_cotacao | integer | Sim | PK | |
| codigo | varchar(10) | Sim | UK | CR00001. |
| id_usuario | integer | Sim | FK | Produtor. |
| item | varchar(120) | Sim |  | |
| quantidade | varchar(40) | Sim |  | |
| id_produto | integer | Não | FK | |
| criado_em / vencimento | timestamp | Sim |  | |
| status | varchar(15) | Sim |  | AGUARDANDO, ANALISE, FECHADA, RECUSADA. |
| id_proposta_aprovada | integer | Não | FK | Referência para `PROPOSTAS`. |
| encerrado_em | timestamp | Não |  | |
| (`PROPOSTAS`) id_proposta, id_cotacao, id_fornecedor, preco, prazo, laudo, nome_fornecedor, avaliacao, criado_em | integer, integer, integer, numeric(12,2), smallint, boolean, varchar(120), numeric(2,1), timestamp | Sim | PK, FK, UK (id_cotacao, id_fornecedor) | Uma proposta por fornecedor em cada cotação. |

#### Tabelas `PEDIDOS` e `PEDIDOS_ITENS`

| Campo | Tipo físico | Obrigatório | Chave | Observação |
| :--- | :---: | :---: | :---: | :--- |
| id_pedido | integer | Sim | PK | |
| numero | varchar(12) | Sim | UK | PED000001. |
| id_usuario | integer | Sim | FK | Produtor. |
| subtotal / frete_valor / total | numeric(12,2) | Sim |  | |
| frete_prazo | smallint | Sim |  | Dias úteis. |
| entrega_cep | char(8) | Sim |  | |
| entrega_rua, entrega_numero, entrega_complemento, entrega_bairro, entrega_cidade, entrega_uf, entrega_observacoes | varchar | Sim / Não |  | Cópia do endereço de entrega. |
| pagamento_metodo | varchar(15) | Sim |  | BOLETO, CARTAO, CREDITO_RURAL. |
| pagamento_parcelas | smallint | Sim |  | De 1 a 12. |
| pagamento_status | varchar(10) | Sim |  | CONFIRMADO, PENDENTE, CANCELADO. |
| status | varchar(20) | Sim |  | CRIADO, CONFIRMADO, EM_SEPARACAO, ENVIADO, ENTREGUE, CANCELADO (e os antigos). |
| criado_em / atualizado_em | timestamp | Sim / Não |  | |
| (`PEDIDOS_ITENS`) id_pedido_item, id_pedido, id_produto, id_fornecedor, nome, preco, quantidade, subtotal | integer, integer, integer, integer, varchar(120), numeric(12,2), integer, numeric(12,2) | Sim | PK, FK | Itens do pedido, com cópia de nome e preço. |
| (`PEDIDOS_PARCELAS`) id_pedido, numero_parcela, valor | integer, smallint, numeric(12,2) | Sim | PK (id_pedido, numero_parcela), FK | Substitui `valorParcelas`. |

#### Tabelas `AUDITORIA`, `CONTADORES` e `REDEFINICOES_SENHA`

| Campo | Tipo físico | Obrigatório | Chave | Observação |
| :--- | :---: | :---: | :---: | :--- |
| (`AUDITORIA`) id_auditoria, id_usuario, acao, entidade, entidade_id, detalhes, ip, criado_em | integer, integer, varchar(60), varchar(30), varchar(40), json, varchar(45), timestamp | Sim / Não | PK, FK | Histórico de ações; nunca guarda senhas. |
| (`CONTADORES`) nome, seq | varchar(20), integer | Sim | PK (nome) | Sequências `pedido` e `cotacao`. |
| (`REDEFINICOES_SENHA`) id_usuario, token_hash, criado_em, expira_em | integer, char(64), timestamp, timestamp | Sim | FK | Expira em 1 hora; remover as expiradas por rotina. |

### 4.3. Justificativa do desdobramento documental

O MongoDB foi escolhido porque os dados do marketplace são lidos em blocos: a tela do pedido mostra itens, frete, entrega e pagamento juntos; a cotação, as propostas juntas; o perfil, os endereços juntos. Embutir esses dados evita junções e deixa cada leitura em uma consulta só. Os produtos têm campos que variam por categoria (sementes têm germinação e vigor; máquinas não), o que é natural em documentos.

As referências foram mantidas onde a entidade existe sozinha ou é consultada por vários caminhos (usuário, fornecedor, produto, laudo, avaliação). Em pedidos e propostas, os dados copiados garantem que o histórico não mude quando o produto ou o fornecedor mudarem.

## 5. Consultas, índices e observações de arquitetura

### 5.1. Consultas esperadas

| Consulta esperada | Campos envolvidos | Índices | Observações |
| :--- | :--- | :--- | :--- |
| Login por e-mail | `users.email` | `email_1` | Pode haver até duas contas (produtor e fornecedor) com o mesmo e-mail; a senha decide qual entra. |
| Login por CPF ou CNPJ | `profiles.document` | `document_1_accountType_1` | Pode haver um perfil de cada tipo com o mesmo documento. |
| Carregar perfil do usuário | `profiles.userId` | `userId_1` | Consulta em toda requisição autenticada. |
| Listar o catálogo com filtros e ordenação | `produtos.categoria`, `marca`, `regiao`, `preco`, `laudoId`, `ativo`, `vendidos`, `entregaDias` | `categoria_1_marca_1`, `vendidos_-1` | Busca por texto usa expressão regular (nome, marca, cultura, categoria, tecnologia). Máximo de 48 itens por página. |
| Listar produtos do fornecedor | `produtos.fornecedorId`, `ativo` | `fornecedorId_1` | Tela Meus produtos e verificação de duplicidade. |
| Impedir produto repetido do mesmo fornecedor | `produtos.fornecedorId`, `chave` | `fornecedorId_1_chave_1` (único, só ativos) | Vale também na importação CSV. |
| Consultar laudo pelo número | `laudos.numero` | `numero_1` (único) | Público; também gera o PDF. |
| Avaliações de um produto | `avaliacoes.produtoId`, `userId` | `produtoId_1_userId_1` | A nota do produto e a do fornecedor são recalculadas a cada avaliação. |
| Cotações do produtor | `cotacoes.userId`, `criadoEm` | `userId_1_criadoEm_-1` | Mais recentes primeiro. |
| Cotações abertas para o fornecedor | `cotacoes.status`, `vencimento` | — | Volume baixo; sem índice próprio. |
| Gerar o código da cotação | `cotacoes.codigo` | `codigo_1` (único, só com código texto) | O número vem do contador. |
| Pedidos do produtor | `pedidos.userId`, `criadoEm` | `userId_1_criadoEm_-1` | Mais recentes primeiro. |
| Vendas do fornecedor | `pedidos.itens.fornecedorId` | `itens.fornecedorId_1` | Mostra só os itens do próprio fornecedor. |
| Histórico de ações do usuário | `auditoria.userId`, `criadoEm`, `acao` | `userId_1_criadoEm_-1` | Mais recentes primeiro. |
| Validar o link de redefinição de senha | `password_resets.tokenHash`, `expiresAt` | `tokenHash_1`, `expiresAt_1` (TTL) | O MongoDB apaga os pedidos vencidos sozinho. |

### 5.2. Índices

| Coleção | Índice | Tipo |
| :--- | :--- | :--- |
| users | `email` | comum |
| users | `email` + `accountType` | **único** (só quando `accountType` existe) |
| profiles | `userId` | **único** |
| profiles | `document` + `accountType` | **único** (só quando `document` existe) |
| produtos | `categoria` + `marca`; `fornecedorId`; `vendidos` (decrescente) | comuns |
| produtos | `fornecedorId` + `chave` | **único** (só produtos ativos) |
| laudos | `numero` | **único** |
| fornecedores | `userId` | comum |
| avaliacoes | `produtoId` + `userId` | comum |
| cotacoes | `userId` + `criadoEm` (decrescente) | comum |
| cotacoes | `codigo` | **único** (só quando é texto) |
| pedidos | `userId` + `criadoEm` (decrescente); `itens.fornecedorId` | comuns |
| auditoria | `userId` + `criadoEm` (decrescente) | comum |
| password_resets | `expiresAt` | TTL (remove ao vencer) |
| password_resets | `tokenHash` | comum |
| sessions | `expires` | TTL (criado pelo `connect-mongo`) |

### 5.3. Regras e observações

- Não pode haver duas contas do mesmo tipo (produtor ou fornecedor) com o mesmo e-mail, nem dois perfis do mesmo tipo com o mesmo CPF ou CNPJ.
- Fornecedor deve cadastrar um CNPJ válido; produtor pode informar CPF ou CNPJ válido.
- A senha tem de 8 a 72 caracteres e só é guardada em hash bcrypt. O link de redefinição vale 1 hora e só o hash do token é guardado.
- Produto repetido (mesmo nome e marca) do mesmo fornecedor é recusado, também na importação CSV.
- Produtos nunca são apagados fisicamente (`ativo: false`). Produto com pedido em andamento não pode ser removido.
- Cotação com propostas não pode ser excluída; só pode ser aprovada (fecha) ou recusada.
- Conta com pedidos em andamento (`criado`, `confirmado`, `em_separacao`, `aguardando_pagamento`, `em_analise`, `pago` ou `enviado`) não pode ser encerrada; ao encerrar, a conta fica `inactive`, e não é apagada.
- A exportação de pedidos em CSV só é liberada quando nenhum pedido está `aguardando_pagamento` ou `em_analise`.
- Status do pedido: `criado` → `confirmado` → `em_separacao` → `enviado` → `entregue`; `cancelado` só é possível antes do envio. Cada fornecedor muda o status apenas dos próprios itens; o status do pedido é o do item menos adiantado, e o pedido só fica `cancelado` quando todos os itens foram cancelados.
- Estoque: o pedido é recusado se algum item não tiver estoque; a baixa é feita na hora da compra e devolvida quando o fornecedor cancela os seus itens.
- Total, frete e parcelas são sempre recalculados no servidor, a partir do preço atual do produto; nunca são aceitos do cliente. A soma das parcelas é igual ao total, e a última parcela leva a sobra dos centavos.
- O total do pedido é calculado pelo servidor Java (soma do subtotal com o frete e divisão em parcelas); se ele estiver fora do ar, o Node faz a mesma conta.
- Os produtos de demonstração (`seed: true`) e seus dados são recriados pelo `npm run seed`, que preserva as fotos já gravadas e mantém o mesmo `_id` dos usuários de demonstração.
- A auditoria é um histórico: não deve ser removida em uso normal, e nunca guarda senhas.
- Ao iniciar, o servidor não apaga nenhum dado. As cotações de exemplo vêm do `npm run seed`.
- Login: só entra numa conta cuja senha conferiu. O limite de tentativas vale para login (só falhas), cadastro e recuperação de senha. A recuperação gera um link para cada conta ativa do e-mail.
- Avaliação: o fornecedor não pode avaliar o próprio produto, e o selo "Verificado" não vale para pedido cancelado.
