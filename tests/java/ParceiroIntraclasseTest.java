// Isabela RA: 25003335
import static org.junit.Assert.*;

import java.io.IOException;
import java.io.ObjectInputStream;
import java.io.ObjectOutputStream;
import java.io.PipedInputStream;
import java.io.PipedOutputStream;
import java.net.Socket;
import org.junit.Test;

/**
 * Testes INTRACLASSE (Teste OO) da classe {@link Parceiro}.
 *
 * Tecnica de particionamento aplicada: PARTICIONAMENTO POR ESTADOS.
 * Justificativa: a classe Parceiro retem estado relevante ao longo de seu ciclo
 * de vida (buffer interno {@code proximoComunicado} e estado aberto/encerrado
 * dos canais {@code conexao}, {@code receptor}, {@code transmissor} e semaforo {@code mutEx}).
 *
 * Estados modelados:
 *   - Conectado_SemBuffer (proximoComunicado == null, canais abertos)
 *   - Conectado_ComBuffer (proximoComunicado != null, apos espie(), canais abertos)
 *   - Encerrado           (apos adeus(), canais fechados)
 *
 * Comportamento padrao:
 *   Parceiro(conexao, receptor, transmissor) - [receba() | espie() | envie()]^n - adeus() - Fim
 */
public class ParceiroIntraclasseTest
{
    /**
     * Estrutura auxiliar em memoria para isolar o teste intraclasse de Parceiro
     * sem depender de rede ou sockets externos.
     */
    private static class CanalEmMemoria
    {
        final Socket socket;
        final ObjectOutputStream escritorExterno;
        final ObjectInputStream leitorExterno;
        final ObjectOutputStream transmissorDoParceiro;
        final ObjectInputStream receptorDoParceiro;

        CanalEmMemoria() throws IOException
        {
            this.socket = new Socket();

            PipedOutputStream entradaOut = new PipedOutputStream();
            PipedInputStream  entradaIn  = new PipedInputStream(entradaOut, 16384);

            PipedOutputStream saidaOut = new PipedOutputStream();
            PipedInputStream  saidaIn  = new PipedInputStream(saidaOut, 16384);

            this.escritorExterno       = new ObjectOutputStream(entradaOut);
            this.escritorExterno.flush();
            this.transmissorDoParceiro = new ObjectOutputStream(saidaOut);
            this.transmissorDoParceiro.flush();

            this.receptorDoParceiro = new ObjectInputStream(entradaIn);
            this.leitorExterno      = new ObjectInputStream(saidaIn);
        }

        void fecharLadoExterno()
        {
            try { this.escritorExterno.close(); } catch (Exception ignored) {}
            try { this.leitorExterno.close();   } catch (Exception ignored) {}
        }
    }

    // -------------------------------------------------------------------------
    // 1. Validacao de pre-condicoes do construtor (inicializacao invalida)
    // -------------------------------------------------------------------------

    @Test
    public void testConstrutor_ComParametrosNulos_DeveLancarExcecao() throws Exception
    {
        // Arrange
        CanalEmMemoria canal = new CanalEmMemoria();

        try
        {
            // Action & Assert - conexao nula
            try
            {
                new Parceiro(null, canal.receptorDoParceiro, canal.transmissorDoParceiro);
                fail("Esperava Exception para conexao nula");
            }
            catch (Exception e)
            {
                assertEquals("Conexao ausente", e.getMessage());
            }

            // Action & Assert - receptor nulo
            try
            {
                new Parceiro(canal.socket, null, canal.transmissorDoParceiro);
                fail("Esperava Exception para receptor nulo");
            }
            catch (Exception e)
            {
                assertEquals("Receptor ausente", e.getMessage());
            }

            // Action & Assert - transmissor nulo
            try
            {
                new Parceiro(canal.socket, canal.receptorDoParceiro, null);
                fail("Esperava Exception para transmissor nulo");
            }
            catch (Exception e)
            {
                assertEquals("Transmissor ausente", e.getMessage());
            }
        }
        finally
        {
            canal.fecharLadoExterno();
            canal.socket.close();
        }
    }

    // -------------------------------------------------------------------------
    // 2. Transicao: Conectado_SemBuffer -> Conectado_SemBuffer (receba) -> Encerrado (adeus)
    // -------------------------------------------------------------------------

    @Test
    public void testEstadoConectadoSemBuffer_RecebaETransicaoParaEncerrado() throws Exception
    {
        // Arrange
        CanalEmMemoria canal = new CanalEmMemoria();
        Parceiro parceiro = new Parceiro(canal.socket, canal.receptorDoParceiro, canal.transmissorDoParceiro);
        PedidoDeCalculo pedidoEnviado = new PedidoDeCalculo(1500.00, 120.00, 3);

        try
        {
            // Action: Parceiro() - receba(PedidoDeCalculo) - adeus()
            parceiro.receba(pedidoEnviado);
            Object recebidoNoOutroLado = canal.leitorExterno.readObject();
            parceiro.adeus();

            // Assert
            assertTrue(recebidoNoOutroLado instanceof PedidoDeCalculo);
            PedidoDeCalculo recebido = (PedidoDeCalculo) recebidoNoOutroLado;
            assertEquals(1500.00, recebido.getSubtotal(), 0.0001);
            assertEquals(120.00,  recebido.getFrete(),    0.0001);
            assertEquals(3,       recebido.getParcelas());
            assertTrue("Socket deveria estar fechado apos adeus()", canal.socket.isClosed());
        }
        finally
        {
            canal.fecharLadoExterno();
        }
    }

    // -------------------------------------------------------------------------
    // 3. Transicoes de buffer: SemBuffer -> ComBuffer (espie) -> ComBuffer (espie) -> SemBuffer (envie)
    // -------------------------------------------------------------------------

    @Test
    public void testTransicaoEstadosBuffer_EspieRetemEEspieRepetidoMantemEEnvieConsome() throws Exception
    {
        // Arrange
        CanalEmMemoria canal = new CanalEmMemoria();
        canal.escritorExterno.writeObject(new PedidoDeCalculo(250.00, 30.00, 2));
        canal.escritorExterno.writeObject(new PedidoDeCalculo(800.00, 50.00, 4));
        canal.escritorExterno.flush();

        Parceiro parceiro = new Parceiro(canal.socket, canal.receptorDoParceiro, canal.transmissorDoParceiro);

        try
        {
            // Action: Parceiro() - espie() - espie() - envie() - espie() - envie() - adeus()
            Comunicado primeiroEspiado  = parceiro.espie(); // SemBuffer -> ComBuffer
            Comunicado segundoEspiado   = parceiro.espie(); // ComBuffer -> ComBuffer
            Comunicado primeiroConsumido = parceiro.envie(); // ComBuffer -> SemBuffer
            Comunicado proximoEspiado   = parceiro.espie(); // SemBuffer -> ComBuffer (2o objeto)
            Comunicado segundoConsumido = parceiro.envie(); // ComBuffer -> SemBuffer
            parceiro.adeus();                                // SemBuffer -> Encerrado

            // Assert: retencao do mesmo objeto enquanto no estado ComBuffer
            assertSame("Segundo espie() deve retornar a mesma instancia retida no buffer", primeiroEspiado, segundoEspiado);
            assertSame("envie() deve devolver a mesma instancia previamente espiada",      primeiroEspiado, primeiroConsumido);
            assertEquals(250.00, ((PedidoDeCalculo) primeiroConsumido).getSubtotal(), 0.0001);

            // Assert: apos envio, buffer foi limpo e nova leitura trouxe o proximo comunicado
            assertNotSame("Apos envie(), proximo espie() deve ler novo comunicado", primeiroConsumido, proximoEspiado);
            assertSame(proximoEspiado, segundoConsumido);
            assertEquals(800.00, ((PedidoDeCalculo) segundoConsumido).getSubtotal(), 0.0001);
        }
        finally
        {
            canal.fecharLadoExterno();
        }
    }

    // -------------------------------------------------------------------------
    // 4. Transicao: Conectado_SemBuffer -> Conectado_SemBuffer (envie direto)
    // -------------------------------------------------------------------------

    @Test
    public void testEstadoConectadoSemBuffer_EnvieDiretoSemEspiarPreviamente() throws Exception
    {
        // Arrange
        CanalEmMemoria canal = new CanalEmMemoria();
        canal.escritorExterno.writeObject(new ResultadoDeCalculo(500.00, 250.00));
        canal.escritorExterno.writeObject(new PedidoParaSair());
        canal.escritorExterno.flush();

        Parceiro parceiro = new Parceiro(canal.socket, canal.receptorDoParceiro, canal.transmissorDoParceiro);

        try
        {
            // Action: Parceiro() - envie() - envie() - adeus()
            Comunicado c1 = parceiro.envie();
            Comunicado c2 = parceiro.envie();
            parceiro.adeus();

            // Assert
            assertTrue(c1 instanceof ResultadoDeCalculo);
            assertEquals(500.00, ((ResultadoDeCalculo) c1).getTotal(), 0.0001);
            assertTrue(c2 instanceof PedidoParaSair);
        }
        finally
        {
            canal.fecharLadoExterno();
        }
    }

    // -------------------------------------------------------------------------
    // 5. Transicao: Encerrado -> Encerrado (receba e envie apos adeus sem buffer)
    // -------------------------------------------------------------------------

    @Test
    public void testEstadoEncerrado_RecebaEEnvieSemBufferDevemLancarExcecao() throws Exception
    {
        // Arrange
        CanalEmMemoria canal = new CanalEmMemoria();
        Parceiro parceiro = new Parceiro(canal.socket, canal.receptorDoParceiro, canal.transmissorDoParceiro);

        try
        {
            // Action: Parceiro() - adeus()
            parceiro.adeus();

            // Action & Assert: receba() no estado Encerrado
            try
            {
                parceiro.receba(new PedidoDeCalculo(100.00, 10.00, 1));
                fail("Esperava Exception('Erro de transmissao') apos adeus()");
            }
            catch (Exception e)
            {
                assertEquals("Erro de transmissao", e.getMessage());
            }

            // Action & Assert: envie() no estado Encerrado (buffer vazio)
            try
            {
                parceiro.envie();
                fail("Esperava Exception('Erro de recepcao') apos adeus()");
            }
            catch (Exception e)
            {
                assertEquals("Erro de recepcao", e.getMessage());
            }
        }
        finally
        {
            canal.fecharLadoExterno();
        }
    }

    // -------------------------------------------------------------------------
    // 6. CASOS DE TESTE QUE EXPOEM FALHAS REAIS NA CLASSE PARCEIRO
    // -------------------------------------------------------------------------

    /**
     * FALHA F-IC1: Transicao Conectado_ComBuffer -> Encerrado (adeus) -> envie().
     * Oraculo esperado: uma vez encerrado por adeus(), o Parceiro NAO deve devolver
     * comunicados residuais do buffer; deve descartar o buffer e lancar Exception.
     * Defeito exposto: Parceiro.adeus() nao zera proximoComunicado nem marca o estado fechado.
     */
    @Test
    public void testEstadoEncerrado_NaoDeveDevolverBufferResidualAposAdeus_ExpoeDefeito() throws Exception
    {
        // Arrange
        CanalEmMemoria canal = new CanalEmMemoria();
        canal.escritorExterno.writeObject(new PedidoDeCalculo(300.00, 20.00, 2));
        canal.escritorExterno.flush();
        Parceiro parceiro = new Parceiro(canal.socket, canal.receptorDoParceiro, canal.transmissorDoParceiro);

        try
        {
            // Action: Parceiro() - espie() - adeus() - envie()
            parceiro.espie(); // entra em Conectado_ComBuffer
            parceiro.adeus(); // transita para Encerrado

            // Assert
            try
            {
                Comunicado residual = parceiro.envie();
                fail("FALHA EXPOSTA (F-IC1): apos adeus(), envie() deveria lancar Exception, "
                   + "mas devolveu comunicado residual do buffer: " + residual);
            }
            catch (Exception e)
            {
                assertEquals("Erro de recepcao", e.getMessage());
            }
        }
        finally
        {
            canal.fecharLadoExterno();
        }
    }

    /**
     * FALHA F-IC2: Transicao Encerrado -> espie() -> espie() (Deadlock no semaforo mutEx).
     * Oraculo esperado: chamadas repetidas a espie() no estado Encerrado devem lancar
     * Exception('Erro de recepcao') sem travar a thread.
     * Defeito exposto: em Parceiro.espie() (linhas 52-59), mutEx.release() nao esta em bloco
     * finally; quando receptor.readObject() lanca excecao, a permissao do semaforo nunca e
     * liberada e a proxima chamada a espie() trava em deadlock infinito.
     */
    @Test(timeout = 1500)
    public void testEstadoEncerrado_DuploEspieNaoDeveCausarDeadlockNoMutEx_ExpoeDefeito() throws Exception
    {
        // Arrange
        CanalEmMemoria canal = new CanalEmMemoria();
        Parceiro parceiro = new Parceiro(canal.socket, canal.receptorDoParceiro, canal.transmissorDoParceiro);

        try
        {
            // Action: Parceiro() - adeus() - espie() (1a falha) - espie() (2a chamada)
            parceiro.adeus();

            try
            {
                parceiro.espie();
                fail("1a chamada a espie() apos adeus() deveria lancar Exception");
            }
            catch (Exception e)
            {
                assertEquals("Erro de recepcao", e.getMessage());
            }

            // Assert: 2a chamada tambem deve lancar Exception rapidamente (nao entrar em deadlock)
            try
            {
                parceiro.espie();
                fail("2a chamada a espie() apos adeus() deveria lancar Exception");
            }
            catch (Exception e)
            {
                assertEquals("Erro de recepcao", e.getMessage());
            }
        }
        finally
        {
            canal.fecharLadoExterno();
        }
    }

    /**
     * FALHA F-IC3: Validacao ausente em receba(null).
     * Oraculo esperado: enviar comunicado nulo viola o protocolo (na SupervisoraDeConexao
     * causa encerramento silencioso sem remocao da lista usuarios) e deve lancar Exception.
     * Defeito exposto: Parceiro.receba(Comunicado x) nao valida x == null antes de writeObject(x).
     */
    @Test
    public void testEstadoConectadoSemBuffer_RecebaNuloDeveLancarExcecao_ExpoeDefeito() throws Exception
    {
        // Arrange
        CanalEmMemoria canal = new CanalEmMemoria();
        Parceiro parceiro = new Parceiro(canal.socket, canal.receptorDoParceiro, canal.transmissorDoParceiro);

        try
        {
            // Action & Assert: Parceiro() - receba(null)
            try
            {
                parceiro.receba(null);
                fail("FALHA EXPOSTA (F-IC3): receba(null) deveria lancar Exception para comunicado ausente, "
                   + "mas aceitou e serializou null no canal.");
            }
            catch (Exception e)
            {
                assertNotNull(e.getMessage());
            }
        }
        finally
        {
            try { parceiro.adeus(); } catch (Exception ignored) {}
            canal.fecharLadoExterno();
        }
    }
}
