# Testes Automatizados em JUnit — Servidor Java (AgroRecursos MarketPlace)

Esta pasta reúne os testes unitários (**Intraclasse**) e de integração (**Interclasse**) em **JUnit 4.13.2** desenvolvidos para o servidor Java localizado em `servidor-java/Servidor`.

## Estrutura

- `ParceiroIntraclasseTest.java` — Teste **Intraclasse** de `Parceiro` utilizando **Particionamento por Estados**.
- `PedidoDeCalculoIntraclasseTest.java` — Teste **Intraclasse** de `PedidoDeCalculo` utilizando **Particionamento por Atributos** (+ Equivalência/BVA e reteste de herança).
- `ResultadoDeCalculoIntraclasseTest.java` — Teste **Intraclasse** de `ResultadoDeCalculo` utilizando **Particionamento por Categorias de Métodos**.
- `ServicoCalculoPedidoInterclasseTest.java` — Teste **Interclasse** do serviço principal de cálculo de pedidos (`SupervisoraDeConexao`, `Parceiro`, `PedidoDeCalculo`, `ResultadoDeCalculo`, `ComunicadoDeErro`, `PedidoParaSair` e `AceitadoraDeConexao`), cobrindo Cenário Normal, Cenário de Erro/Exceções e exposição de defeitos reais.
- `ServidorJavaTestSuite.java` — Suíte JUnit que executa todas as classes de teste em conjunto.
- `lib/junit-4.13.2.jar` e `lib/hamcrest-core-1.3.jar` — Dependências do JUnit 4.

> **Observação de pacote:** Como todas as classes de `servidor-java/Servidor/` estão no pacote padrão (*default package*) do Java, as classes de teste também permanecem no pacote padrão para que possam instanciar e testar diretamente as classes do servidor sem alterar o código de produção.

## Como compilar e executar

A partir da raiz do repositório (`PI_IV_TIME_15`):

### Windows (PowerShell / CMD)

```powershell
# 1. Compilar os testes (saída em pasta temporária .tmp-junit-classes)
mkdir .tmp-junit-classes -Force
javac -cp "servidor-java\Servidor;tests\java\lib\junit-4.13.2.jar;tests\java\lib\hamcrest-core-1.3.jar" -d .tmp-junit-classes tests\java\*.java

# 2. Executar toda a suíte JUnit
java -cp "servidor-java\Servidor;.tmp-junit-classes;tests\java\lib\junit-4.13.2.jar;tests\java\lib\hamcrest-core-1.3.jar" org.junit.runner.JUnitCore ServidorJavaTestSuite

# Ou executar apenas uma classe específica:
java -cp "servidor-java\Servidor;.tmp-junit-classes;tests\java\lib\junit-4.13.2.jar;tests\java\lib\hamcrest-core-1.3.jar" org.junit.runner.JUnitCore ServicoCalculoPedidoInterclasseTest
```

### Linux / macOS

```bash
mkdir -p .tmp-junit-classes
javac -cp "servidor-java/Servidor:tests/java/lib/junit-4.13.2.jar:tests/java/lib/hamcrest-core-1.3.jar" -d .tmp-junit-classes tests/java/*.java
java -cp "servidor-java/Servidor:.tmp-junit-classes:tests/java/lib/junit-4.13.2.jar:tests/java/lib/hamcrest-core-1.3.jar" org.junit.runner.JUnitCore ServidorJavaTestSuite
```

## Interpretação dos resultados

Os casos de teste terminados em `_ExpoeDefeito` possuem oráculos baseados na especificação esperada (não no comportamento defeituoso atual) e **falham intencionalmente** sobre o código atual do servidor para evidenciar defeitos reais documentados na atividade de FTTVS (`F-IC1` a `F-IC5` e `F-INT1` a `F-INT4`). Os demais 15 casos de teste (fluxos válidos, limites, regras de negócio implementadas e exceções) passam integralmente.
