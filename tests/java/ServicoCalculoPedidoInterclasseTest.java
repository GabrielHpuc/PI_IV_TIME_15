// João Pedro RA: 25007162
import static org.junit.Assert.*;

import java.io.IOException;
import java.io.InputStream;
import java.io.ObjectInputStream;
import java.io.ObjectOutputStream;
import java.io.OutputStream;
import java.io.PipedInputStream;
import java.io.PipedOutputStream;
import java.net.ServerSocket;
import java.net.Socket;
import java.util.ArrayList;
import org.junit.Test;

/**
 * Testes INTERCLASSE (Integracao End-to-End / baseada em Thread) do principal
 * servico do Servidor Java do projeto AgroRecursos MarketPlace:
 * o servico de calculo de total e parcelamento de pedidos.
 *
 * Classes participantes integradas nos cenarios:
 *   - SupervisoraDeConexao (servico principal de atendimento e calculo)
 *   - Parceiro             (canal de comunicacao cliente e servidor)
 *   - Comunicado           (superclasse serializavel do protocolo)
 *   - PedidoDeCalculo      (requisicao de calculo de pedido)
 *   - ResultadoDeCalculo   (devolucao do calculo no cenario normal)
 *   - ComunicadoDeErro     (devolucao de erro de negocio no cenario alternativo/erro)
 *   - PedidoParaSair       (protocolo de encerramento de sessao)
 *   - AceitadoraDeConexao  (validacao de inicializacao / throws)
 *
 * Para garantir determinismo e isolamento da camada de rede TCP sem alterar o
 * codigo de producao do servidor, utiliza-se um duble de Socket em memoria
 * ({@link SocketEmMemoria}) baseado em PipedInputStream/PipedOutputStream,
 * exercitando 100% da serializacao Java e da logica real das classes do servidor.
 */
public class ServicoCalculoPedidoInterclasseTest
{
    /**
     * Subclasse de {@link Socket} em memoria para conectar Cliente e SupervisoraDeConexao
     * via pipes bidirecionais sem depender de portas TCP do sistema operacional.
     */
    private static class SocketEmMemoria extends Socket
    {
        private final InputStream  entrada;
        private final OutputStream saida;
        private volatile boolean   fechado = false;

        SocketEmMemoria(InputStream entrada, OutputStream saida)
        {
            this.entrada = entrada;
            this.saida   = saida;
        }

        @Override
        public InputStream getInputStream() throws IOException
        {
            if (fechado) throw new IOException("Socket fechado");
            return this.entrada;
        }

        @Override
        public OutputStream getOutputStream() throws IOException
        {
            if (fechado) throw new IOException("Socket fechado");
            return this.saida;
        }

        @Override
        public synchronized void close() throws IOException
        {
            this.fechado = true;
            try { this.saida.close();   } catch (IOException ignored) {}
            try { this.entrada.close(); } catch (IOException ignored) {}
        }

        @Override
        public boolean isClosed()
        {
            return this.fechado;
        }
    }

    /**
     * Monta uma sessao interclasse completa entre uma aplicacao cliente (Parceiro)
     * e o servico principal do servidor (SupervisoraDeConexao executando em Thread real).
     */
    private static class SessaoServidorCliente
    {
        final ArrayList<Parceiro>  usuarios;
        final SupervisoraDeConexao supervisora;
        final Parceiro             cliente;

        SessaoServidorCliente() throws Exception
        {
            PipedOutputStream clienteParaServidorOut = new PipedOutputStream();
            PipedInputStream  clienteParaServidorIn  = new PipedInputStream(clienteParaServidorOut, 16384);

            PipedOutputStream servidorParaClienteOut = new PipedOutputStream();
            PipedInputStream  servidorParaClienteIn  = new PipedInputStream(servidorParaClienteOut, 16384);

            Socket socketServidor = new SocketEmMemoria(clienteParaServidorIn, servidorParaClienteOut);
            Socket socketCliente  = new SocketEmMemoria(servidorParaClienteIn, clienteParaServidorOut);

            this.usuarios    = new ArrayList<Parceiro>();
            this.supervisora = new SupervisoraDeConexao(socketServidor, this.usuarios);
            this.supervisora.start();

            // Handshake de ObjectOutputStream / ObjectInputStream identico ao Cliente.conectar()
            ObjectOutputStream transmissorCliente = new ObjectOutputStream(socketCliente.getOutputStream());
            transmissorCliente.flush();
            ObjectInputStream  receptorCliente    = new ObjectInputStream(socketCliente.getInputStream());

            this.cliente = new Parceiro(socketCliente, receptorCliente, transmissorCliente);
        }

        Comunicado enviarPedidoEAguardarResposta(PedidoDeCalculo pedido) throws Exception
        {
            this.cliente.receba(pedido);

            Comunicado resposta;
            do
            {
                resposta = this.cliente.espie();
            }
            while (!(resposta instanceof ResultadoDeCalculo) &&
                   !(resposta instanceof ComunicadoDeErro));

            return this.cliente.envie();
        }
    }

    // =========================================================================
    // CASO DE TESTE 1: CENARIO NORMAL (End-to-End completo com retorno esperado)
    // =========================================================================

    @Test(timeout = 5000)
    public void testCenarioNormal_CalculoDePedidoValidoEEncerramentoDaSessao() throws Exception
    {
        // Arrange: sobe o servico principal SupervisoraDeConexao e conecta Parceiro cliente
        SessaoServidorCliente sessao = new SessaoServidorCliente();
        PedidoDeCalculo pedido = new PedidoDeCalculo(1500.00, 120.00, 3);

        // Action: cliente envia PedidoDeCalculo -> servidor valida, calcula e devolve ResultadoDeCalculo
        Comunicado resposta = sessao.enviarPedidoEAguardarResposta(pedido);

        // Verifica registro ativo do parceiro durante a sessao
        int usuariosConectadosDuranteSessao;
        synchronized (sessao.usuarios)
        {
            usuariosConectadosDuranteSessao = sessao.usuarios.size();
        }

        // Action (encerramento): cliente envia PedidoParaSair e aguarda termino da SupervisoraDeConexao
        sessao.cliente.receba(new PedidoParaSair());
        sessao.supervisora.join(3000);
        sessao.cliente.adeus();

        // Assert: verifica tipo, valores devolvidos e ciclo de vida do servico
        assertTrue("Resposta deveria ser ResultadoDeCalculo", resposta instanceof ResultadoDeCalculo);
        ResultadoDeCalculo resultado = (ResultadoDeCalculo) resposta;
        assertEquals("Total esperado: 1500.00 + 120.00 = 1620.00", 1620.00, resultado.getTotal(),        0.0001);
        assertEquals("Valor da parcela esperado: 1620.00 / 3 = 540.00", 540.00, resultado.getValorParcela(), 0.0001);

        assertEquals("Servidor deveria registrar 1 usuario conectado durante a sessao", 1, usuariosConectadosDuranteSessao);
        synchronized (sessao.usuarios)
        {
            assertTrue("Apos PedidoParaSair, usuario deveria ser removido da lista usuarios", sessao.usuarios.isEmpty());
        }
        assertFalse("Thread SupervisoraDeConexao deveria ter encerrado apos PedidoParaSair", sessao.supervisora.isAlive());
    }

    // =========================================================================
    // CASO DE TESTE 2: CENARIO ALTERNATIVO / DE ERRO (ComunicadoDeErro + throws)
    // =========================================================================

    @Test(timeout = 5000)
    public void testCenarioErro_EntradasInvalidasRetornamComunicadoDeErroEExcecoesDeServico() throws Exception
    {
        // ---------------------------------------------------------------------
        // Parte A: Erros de regra de negocio trafegando de ponta a ponta
        // ---------------------------------------------------------------------
        // Arrange
        SessaoServidorCliente sessao = new SessaoServidorCliente();

        // Action 1: subtotal negativo
        Comunicado respSubtotalNegativo = sessao.enviarPedidoEAguardarResposta(
            new PedidoDeCalculo(-50.00, 20.00, 3)
        );

        // Action 2: frete negativo
        Comunicado respFreteNegativo = sessao.enviarPedidoEAguardarResposta(
            new PedidoDeCalculo(500.00, -10.00, 2)
        );

        // Action 3: parcelas acima do limite (> 12)
        Comunicado respParcelasAcima = sessao.enviarPedidoEAguardarResposta(
            new PedidoDeCalculo(500.00, 30.00, 15)
        );

        // Action 4: parcelas abaixo do limite (< 1)
        Comunicado respParcelasAbaixo = sessao.enviarPedidoEAguardarResposta(
            new PedidoDeCalculo(500.00, 30.00, 0)
        );

        // Encerra sessao normalmente
        sessao.cliente.receba(new PedidoParaSair());
        sessao.supervisora.join(3000);
        sessao.cliente.adeus();

        // Assert Parte A: todas as entradas invalidas devolvem ComunicadoDeErro adequado
        assertTrue(respSubtotalNegativo instanceof ComunicadoDeErro);
        assertEquals("Subtotal e frete nao podem ser negativos", ((ComunicadoDeErro) respSubtotalNegativo).getMensagem());

        assertTrue(respFreteNegativo instanceof ComunicadoDeErro);
        assertEquals("Subtotal e frete nao podem ser negativos", ((ComunicadoDeErro) respFreteNegativo).getMensagem());

        assertTrue(respParcelasAcima instanceof ComunicadoDeErro);
        assertEquals("Parcelas invalidas", ((ComunicadoDeErro) respParcelasAcima).getMensagem());

        assertTrue(respParcelasAbaixo instanceof ComunicadoDeErro);
        assertEquals("Parcelas invalidas", ((ComunicadoDeErro) respParcelasAbaixo).getMensagem());

        // ---------------------------------------------------------------------
        // Parte B: Excecoes (throws) na integracao dos componentes do servidor
        // ---------------------------------------------------------------------
        ArrayList<Parceiro> usuarios = new ArrayList<Parceiro>();

        // SupervisoraDeConexao com socket nulo -> throws Exception("Conexao ausente")
        try
        {
            new SupervisoraDeConexao(null, usuarios);
            fail("Esperava Exception('Conexao ausente')");
        }
        catch (Exception e)
        {
            assertEquals("Conexao ausente", e.getMessage());
        }

        // SupervisoraDeConexao com lista usuarios nula -> throws Exception("Usuarios ausentes")
        try
        {
            new SupervisoraDeConexao(new Socket(), null);
            fail("Esperava Exception('Usuarios ausentes')");
        }
        catch (Exception e)
        {
            assertEquals("Usuarios ausentes", e.getMessage());
        }

        // AceitadoraDeConexao com porta ausente -> throws Exception("Porta ausente")
        try
        {
            new AceitadoraDeConexao(null, usuarios);
            fail("Esperava Exception('Porta ausente')");
        }
        catch (Exception e)
        {
            assertEquals("Porta ausente", e.getMessage());
        }

        // AceitadoraDeConexao com porta invalida -> throws Exception("Porta invalida")
        try
        {
            new AceitadoraDeConexao("porta_invalida", usuarios);
            fail("Esperava Exception('Porta invalida')");
        }
        catch (Exception e)
        {
            assertEquals("Porta invalida", e.getMessage());
        }

        // Tentativa de envio apos desconexao -> throws Exception("Erro de transmissao")
        try
        {
            sessao.cliente.receba(new PedidoDeCalculo(100.00, 10.00, 1));
            fail("Esperava Exception('Erro de transmissao') em canal encerrado");
        }
        catch (Exception e)
        {
            assertEquals("Erro de transmissao", e.getMessage());
        }
    }

    // =========================================================================
    // CASOS DE TESTE INTERCLASSE QUE EXPOEM FALHAS REAIS NO SERVICO PRINCIPAL
    // =========================================================================

    /**
     * FALHA F-INT1: Validacao incompleta em SupervisoraDeConexao para valores IEEE 754 (NaN / Infinity).
     * Oraculo esperado: PedidoDeCalculo(Double.NaN, 10.0, 2) deve ser rejeitado com ComunicadoDeErro.
     * Defeito exposto: em SupervisoraDeConexao.java linha 92, a expressao (Double.NaN < 0) avalia
     * para false, burlando a validacao; Math.round(Double.NaN * 100) produz 0 e o servidor devolve
     * ResultadoDeCalculo(0.0, 0.0) indevidamente.
     */
    @Test(timeout = 5000)
    public void testCenarioErro_SubtotalNaNDeveRetornarComunicadoDeErro_ExpoeDefeito() throws Exception
    {
        // Arrange
        SessaoServidorCliente sessao = new SessaoServidorCliente();

        // Action
        Comunicado resposta = sessao.enviarPedidoEAguardarResposta(
            new PedidoDeCalculo(Double.NaN, 10.00, 2)
        );
        sessao.cliente.receba(new PedidoParaSair());
        sessao.supervisora.join(3000);
        sessao.cliente.adeus();

        // Assert
        assertTrue(
            "FALHA EXPOSTA (F-INT1): subtotal Double.NaN deveria retornar ComunicadoDeErro, "
            + "mas servidor retornou: " + resposta.getClass().getSimpleName() + "(" + resposta + ")",
            resposta instanceof ComunicadoDeErro
        );
    }

    /**
     * FALHA F-INT2: Truncamento na divisao inteira de parcelas com perda de centavos.
     * Oraculo esperado: para total R$ 100,00 em 6x, a soma das parcelas (6 * valorParcela) ou
     * o arredondamento nao deveria perder R$ 0,04 por truncamento inteiro.
     * Defeito exposto: SupervisoraDeConexao.java linha 109 executa (totalEmCentavos / parcelas) / 100.0,
     * truncando 10000 / 6 = 1666 -> R$ 16,66 (6 * 16,66 = R$ 99,96, perdendo R$ 0,04).
     */
    @Test(timeout = 5000)
    public void testCenarioAlternativo_ParcelamentoNaoDevePerderCentavosPorTruncamento_ExpoeDefeito() throws Exception
    {
        // Arrange
        SessaoServidorCliente sessao = new SessaoServidorCliente();

        // Action: R$ 100,00 em 6 parcelas
        Comunicado resposta = sessao.enviarPedidoEAguardarResposta(
            new PedidoDeCalculo(100.00, 0.00, 6)
        );
        sessao.cliente.receba(new PedidoParaSair());
        sessao.supervisora.join(3000);
        sessao.cliente.adeus();

        // Assert
        assertTrue(resposta instanceof ResultadoDeCalculo);
        ResultadoDeCalculo resultado = (ResultadoDeCalculo) resposta;
        assertEquals(100.00, resultado.getTotal(), 0.0001);

        double somaDasParcelas = Math.round(resultado.getValorParcela() * 6 * 100.0) / 100.0;
        assertEquals(
            "FALHA EXPOSTA (F-INT2): truncamento inteiro na divisao das parcelas perdeu centavos "
            + "(retornou 6x de R$ " + resultado.getValorParcela() + " = R$ " + somaDasParcelas + " em vez de R$ 100.00)",
            100.00,
            somaDasParcelas,
            0.0001
        );
    }

    /**
     * FALHA F-INT3: Vazamento de referencia em usuarios quando o cliente desconecta abruptamente.
     * Oraculo esperado: se o cliente encerrar o socket sem enviar PedidoParaSair, a
     * SupervisoraDeConexao deve remover this.usuario da lista usuarios ao encerrar a thread.
     * Defeito exposto: SupervisoraDeConexao.run() (linhas 128-139) fecha streams no catch,
     * mas nao remove this.usuario de this.usuarios nem fecha this.conexao.
     */
    @Test(timeout = 5000)
    public void testCenarioErro_DesconexaoAbruptaDeveRemoverUsuarioDaLista_ExpoeDefeito() throws Exception
    {
        // Arrange
        SessaoServidorCliente sessao = new SessaoServidorCliente();
        Comunicado resposta = sessao.enviarPedidoEAguardarResposta(new PedidoDeCalculo(200.00, 0.00, 1));
        assertTrue(resposta instanceof ResultadoDeCalculo);

        // Action: cliente fecha a conexao abruptamente sem enviar PedidoParaSair
        sessao.cliente.adeus();
        sessao.supervisora.join(3000);

        // Assert
        assertFalse("SupervisoraDeConexao deveria encerrar apos queda da conexao", sessao.supervisora.isAlive());
        synchronized (sessao.usuarios)
        {
            assertTrue(
                "FALHA EXPOSTA (F-INT3): apos desconexao abrupta do cliente, SupervisoraDeConexao "
                + "manteve " + sessao.usuarios.size() + " referencia(s) obsoleta(s) em usuarios.",
                sessao.usuarios.isEmpty()
            );
        }
    }

    /**
     * FALHA F-INT4: Vazamento de ServerSocket em AceitadoraDeConexao quando usuarios == null.
     * Oraculo esperado: se o construtor de AceitadoraDeConexao falhar por usuarios == null,
     * a porta TCP NAO deve ficar presa/ocupada.
     * Defeito exposto: AceitadoraDeConexao.java (linhas 18-27) abre new ServerSocket(porta)
     * ANTES de validar if (usuarios == null), vazando a porta aberta ao lancar "Usuarios ausentes".
     */
    @Test(timeout = 5000)
    public void testCenarioErro_AceitadoraDeConexaoComUsuariosNuloNaoDeveVazarPorta_ExpoeDefeito() throws Exception
    {
        // Arrange: obtem uma porta livre do SO e a libera imediatamente
        int portaLivre;
        try (ServerSocket s = new ServerSocket(0))
        {
            portaLivre = s.getLocalPort();
        }

        // Action: tenta construir AceitadoraDeConexao com lista usuarios nula
        try
        {
            new AceitadoraDeConexao(String.valueOf(portaLivre), null);
            fail("Esperava Exception('Usuarios ausentes')");
        }
        catch (Exception e)
        {
            assertEquals("Usuarios ausentes", e.getMessage());
        }

        // Assert: a porta deve continuar livre para reutilizacao
        try (ServerSocket verificacao = new ServerSocket(portaLivre))
        {
            assertEquals(portaLivre, verificacao.getLocalPort());
        }
        catch (IOException e)
        {
            fail("FALHA EXPOSTA (F-INT4): AceitadoraDeConexao vazou ServerSocket na porta "
               + portaLivre + " ao lancar 'Usuarios ausentes': " + e.getMessage());
        }
    }
}
