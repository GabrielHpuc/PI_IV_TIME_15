<img width="1774" height="887" alt="logo" src="https://github.com/user-attachments/assets/864b278d-d780-4fb0-a206-640bd8236803" />

# AgroRecursos MarketPlace

**Projeto Integrador IV — Engenharia de Software**  
**Pontifícia Universidade Católica de Campinas (PUC-Campinas)**  
**Equipe PI_IV_TIME_15**

> Plataforma digital para aquisição de insumos agropecuários, com foco em transparência, agilidade e procedência.

---

## 1. Visão Geral

O **AgroRecursos MarketPlace** é uma plataforma digital de marketplace especializada na comercialização de insumos agropecuários.

O projeto tem como objetivo centralizar produtores rurais, fornecedores, produtos, cotações e informações técnicas em um único ambiente, buscando tornar o processo de aquisição de insumos mais eficiente, transparente e confiável.

A proposta surgiu a partir da identificação de ineficiências no processo tradicional de aquisição de insumos agrícolas, caracterizado pela realização de cotações manuais ou presenciais, dificuldade de comparação entre fornecedores e limitações relacionadas à verificação da procedência dos produtos.

O sistema propõe a digitalização desse processo por meio de um ambiente centralizado que permita ao produtor consultar produtos, comparar propostas comerciais e acessar informações técnicas associadas aos insumos.

---

## 2. Contexto do Problema

O processo de aquisição de insumos agrícolas ainda apresenta dificuldades relacionadas à fragmentação das informações e à baixa digitalização das negociações.

Entre os principais problemas identificados durante a etapa de ideação estão:

- dificuldade na realização de cotações ágeis e comparativas;
- dependência de negociações realizadas individualmente com fornecedores;
- realização de cotações por meios presenciais ou canais não especializados;
- ausência de uma plataforma centralizada para comparação de ofertas;
- falta de transparência sobre a procedência dos produtos;
- risco de aquisição de insumos sem documentação técnica adequada;
- custos operacionais associados ao processo de pesquisa e aquisição.

A fragmentação do mercado e a ausência de um ambiente centralizado podem gerar assimetria de informações entre produtores e fornecedores, aumentando o tempo necessário para a tomada de decisão e dificultando a comparação entre diferentes alternativas de compra.

---

## 3. Objetivos

### 3.1 Objetivo Geral

Desenvolver uma plataforma digital destinada à centralização da oferta e da demanda de insumos agropecuários, proporcionando aos produtores rurais mecanismos para pesquisa, comparação e aquisição de produtos de forma mais eficiente e transparente.

### 3.2 Objetivos Específicos

O projeto busca:

- centralizar a oferta e a demanda de insumos agrícolas em uma plataforma digital;
- reduzir o tempo e o custo operacional associados às cotações;
- permitir a comparação de preços e condições entre diferentes fornecedores;
- disponibilizar informações relacionadas à procedência dos produtos;
- associar produtos às respectivas informações e documentações técnicas;
- promover maior transparência nas transações entre produtores e fornecedores;
- facilitar o processo de tomada de decisão durante a aquisição de insumos.

---

## 4. Solução Proposta

A solução consiste em um **marketplace especializado em insumos agropecuários**, responsável por reunir produtos, fornecedores, cotações e informações técnicas em uma única plataforma.

A proposta contempla dois componentes centrais:

### Painel de Cotações

Módulo destinado à solicitação e comparação de propostas comerciais apresentadas por diferentes fornecedores.

O painel deverá permitir a análise de informações relevantes para a tomada de decisão, como:

- preço;
- prazo de entrega;
- fornecedor;
- avaliação do fornecedor.

### Consulta de Laudos

Módulo destinado à disponibilização e consulta de informações e documentos técnicos associados aos produtos comercializados na plataforma.

A funcionalidade tem como objetivo aumentar a transparência sobre a procedência e a qualidade dos insumos disponibilizados.

---

## 5. Escopo Inicial do MVP

As funcionalidades apresentadas nesta seção correspondem ao escopo definido durante a etapa de ideação e poderão ser revisadas ao longo do desenvolvimento.

### 5.1 Cadastro de Usuários

Cadastro e gerenciamento de contas para os diferentes perfis previstos na plataforma:

- produtores rurais;
- fornecedores.

O sistema deverá permitir o gerenciamento das informações de perfil e do histórico relacionado às operações realizadas pelo usuário.

### 5.2 Catálogo de Insumos

Disponibilização dos produtos cadastrados na plataforma por meio de um catálogo estruturado.

Está prevista a utilização de mecanismos de filtragem por características como:

- categoria;
- marca;
- preço.

### 5.3 Carrinho de Compras

Funcionalidade destinada à seleção de múltiplos produtos e à consolidação dos itens antes da finalização do pedido.

### 5.4 Painel de Cotações

Ferramenta destinada à solicitação e comparação de propostas apresentadas por diferentes fornecedores.

### 5.5 Sistema de Pagamento

O escopo inicial prevê suporte à integração com diferentes modalidades de pagamento, incluindo:

- boleto;
- cartão;
- crédito rural.

### 5.6 Rastreabilidade e Laudos

Funcionalidade destinada à associação dos produtos às respectivas informações técnicas e aos laudos correspondentes, permitindo ao usuário consultar dados relacionados à procedência do insumo.

---

## 6. Fluxo Geral da Plataforma

A experiência inicialmente proposta contempla as seguintes etapas:

1. **Autenticação e cadastro**  
   Acesso à plataforma por meio de contas específicas para produtores e fornecedores.

2. **Dashboard**  
   Visualização centralizada de informações relevantes, incluindo cotações em aberto e status de pedidos.

3. **Catálogo de produtos**  
   Pesquisa e filtragem dos insumos disponíveis na plataforma.

4. **Detalhamento do produto**  
   Consulta de informações técnicas, documentação, condições comerciais e informações relacionadas ao produto.

5. **Painel de cotações**  
   Comparação das propostas apresentadas por diferentes fornecedores.

6. **Carrinho e checkout**  
   Consolidação dos produtos selecionados, definição das informações de entrega e seleção da modalidade de pagamento.

---

## 7. Priorização de Desenvolvimento

Durante a etapa de ideação, as funcionalidades foram analisadas com base em critérios de priorização.

As principais entregas inicialmente definidas são:

| Prioridade | Funcionalidade |
|:---:|---|
| 1 | Painel de Cotações |
| 2 | Consulta de Laudos MAPA |
| 3 | Catálogo de Insumos |
| 4 | Cadastro de Usuários |
| 5 | Rastreabilidade dos Produtos |

Essa priorização poderá ser revisada de acordo com requisitos técnicos, validações realizadas durante o projeto e decisões tomadas pela equipe ao longo do desenvolvimento.

---

## 8. Tecnologias

A arquitetura inicialmente proposta durante a etapa de ideação considera as seguintes tecnologias:

| Tecnologia | Aplicação prevista |
|---|---|
| Java | Desenvolvimento do servidor (nao desenvolver sera feito depois do preojeto pronto) |
| MongoDB | Persistência de dados em banco NoSQL |
| HTML | Estruturação da interface web |
| JavaScript | Desenvolvimento do back-end |

A definição da stack tecnológica poderá ser revisada conforme a evolução dos requisitos e as necessidades técnicas identificadas durante o desenvolvimento.

---

## 9. Público-Alvo

A solução considera como principais participantes:

### Produtores Rurais

Usuários interessados em pesquisar, comparar e adquirir insumos agropecuários por meio da plataforma.

### Fornecedores

Empresas ou profissionais responsáveis pela disponibilização de produtos e apresentação de propostas comerciais aos produtores.

---

## 10. Equipe

| Integrante |
|---|
| Gabriel Hespanholeto Maziero |
| Giovana Portela Bonfim |
| Pedro Vinicius Romanato |
| João Pedro Bergamin Diniz |
| Isabela Paslauski |

---

## 11. Informações Acadêmicas

| Informação | Descrição |
|---|---|
| Instituição | Pontifícia Universidade Católica de Campinas — PUC-Campinas |
| Escola | Escola Politécnica |
| Curso | Engenharia de Software |
| Projeto | Projeto Integrador IV |
| Equipe | ES-PI4-2026-T2-G015 |
| Ano | 2026 |

---

## 12. Origem do Projeto

O **AgroRecursos MarketPlace** teve sua concepção inicial desenvolvida durante o componente curricular de **Ideação e Validação em Engenharia de Software**.

Durante essa etapa foram realizados estudos relacionados à identificação e definição do problema, análise de persona, levantamento de objetivos, brainstorming, análise SWOT, definição do MVP, priorização de funcionalidades, elaboração do modelo de negócio e desenvolvimento de wireframes.

O Projeto Integrador IV dá continuidade à proposta, direcionando o trabalho para a evolução da solução e para o desenvolvimento do sistema.

---

## 13. Status do Projeto

**Em desenvolvimento.**

Este repositório será utilizado para o versionamento do código-fonte, documentação técnica, gerenciamento das atividades e acompanhamento da evolução do AgroRecursos MarketPlace durante o Projeto Integrador IV.

---

## Licença

Projeto desenvolvido para fins acadêmicos no curso de Engenharia de Software da Pontifícia Universidade Católica de Campinas (PUC-Campinas).

Todos os direitos reservados aos autores.
