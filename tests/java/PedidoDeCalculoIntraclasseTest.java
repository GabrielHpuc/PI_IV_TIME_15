// João Pedro RA: 25007162
import static org.junit.Assert.*;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.ObjectInputStream;
import java.io.ObjectOutputStream;
import org.junit.Test;

/**
 * Testes INTRACLASSE (Teste OO) da classe {@link PedidoDeCalculo}.
 *
 * Tecnica de particionamento aplicada: PARTICIONAMENTO POR ATRIBUTOS,
 * combinado com Particionamento de Equivalencia e Analise de Valores de Fronteira (BVA)
 * para geracao da massa de dados.
 *
 * Justificativa: PedidoDeCalculo e uma classe de dominio/entidade imutavel sem estado
 * mutavel relevante nem metodos de calculo interno; serve para carregar e manter os dados
 * de entrada do calculo de pedido (subtotal, frete, parcelas).
 *
 * Mapeamento de atributos chave:
 *   - subtotal : modificado pelo Construtor; usado por getSubtotal() e toString()
 *   - frete    : modificado pelo Construtor; usado por getFrete() e toString()
 *   - parcelas : modificado pelo Construtor; usado por getParcelas() e toString()
 *   - heranca  : herda Serializable e Cloneable de Comunicado (retestado no contexto da subclasse)
 */
public class PedidoDeCalculoIntraclasseTest
{
    // -------------------------------------------------------------------------
    // 1. Atributo SUBTOTAL (Particao valida, limite zero e isolamento dos demais atributos)
    // -------------------------------------------------------------------------

    @Test
    public void testAtributoSubtotal_ParticaoValidaELimiteZero()
    {
        // Arrange: subtotal valido (> 0) e valor limite (= 0.0)
        double subtotalValido = 1549.90;
        double subtotalLimite = 0.0;

        // Action: PedidoDeCalculo(subtotal, frete, parcelas) - getSubtotal() - toString()
        PedidoDeCalculo pedidoValido = new PedidoDeCalculo(subtotalValido, 85.00, 3);
        PedidoDeCalculo pedidoLimite = new PedidoDeCalculo(subtotalLimite, 50.00, 1);

        // Assert
        assertEquals(1549.90, pedidoValido.getSubtotal(), 0.0001);
        assertEquals("subtotal=1549.9 frete=85.0 parcelas=3", pedidoValido.toString());

        assertEquals(0.0, pedidoLimite.getSubtotal(), 0.0001);
        assertEquals("subtotal=0.0 frete=50.0 parcelas=1", pedidoLimite.toString());
    }

    // -------------------------------------------------------------------------
    // 2. Atributo FRETE (Particao valida e limite frete gratis = 0.0)
    // -------------------------------------------------------------------------

    @Test
    public void testAtributoFrete_ParticaoValidaELimiteZero()
    {
        // Arrange
        double freteValido = 127.45;
        double freteGratis = 0.0;

        // Action: PedidoDeCalculo(subtotal, frete, parcelas) - getFrete() - toString()
        PedidoDeCalculo pedidoComFrete   = new PedidoDeCalculo(500.00, freteValido, 2);
        PedidoDeCalculo pedidoFreteGratis = new PedidoDeCalculo(500.00, freteGratis, 1);

        // Assert
        assertEquals(127.45, pedidoComFrete.getFrete(), 0.0001);
        assertTrue(pedidoComFrete.toString().contains("frete=127.45"));

        assertEquals(0.0, pedidoFreteGratis.getFrete(), 0.0001);
        assertTrue(pedidoFreteGratis.toString().contains("frete=0.0"));
    }

    // -------------------------------------------------------------------------
    // 3. Atributo PARCELAS (Limites BVA: 1, intermediario 6, superior 12)
    // -------------------------------------------------------------------------

    @Test
    public void testAtributoParcelas_LimitesInferiorIntermediarioESuperior()
    {
        // Arrange & Action: PedidoDeCalculo(subtotal, frete, parcelas) - getParcelas() - toString()
        PedidoDeCalculo pedidoMin = new PedidoDeCalculo(1200.00, 0.00, 1);
        PedidoDeCalculo pedidoMid = new PedidoDeCalculo(1200.00, 0.00, 6);
        PedidoDeCalculo pedidoMax = new PedidoDeCalculo(1200.00, 0.00, 12);

        // Assert
        assertEquals(1,  pedidoMin.getParcelas());
        assertEquals(6,  pedidoMid.getParcelas());
        assertEquals(12, pedidoMax.getParcelas());
        assertTrue(pedidoMax.toString().endsWith("parcelas=12"));
    }

    // -------------------------------------------------------------------------
    // 4. Reteste de heranca de Comunicado (Serializable) no contexto de PedidoDeCalculo
    // -------------------------------------------------------------------------

    @Test
    public void testHerancaComunicado_SerializacaoEDesserializacaoPreservamAtributos() throws Exception
    {
        // Arrange
        PedidoDeCalculo original = new PedidoDeCalculo(2345.67, 89.10, 5);

        // Action: serializar e desserializar via ObjectOutputStream / ObjectInputStream
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        try (ObjectOutputStream oos = new ObjectOutputStream(baos))
        {
            oos.writeObject(original);
        }

        PedidoDeCalculo restaurado;
        try (ObjectInputStream ois = new ObjectInputStream(new ByteArrayInputStream(baos.toByteArray())))
        {
            Object obj = ois.readObject();
            assertTrue("Deve ser instancia de Comunicado", obj instanceof Comunicado);
            assertTrue("Deve ser instancia de PedidoDeCalculo", obj instanceof PedidoDeCalculo);
            restaurado = (PedidoDeCalculo) obj;
        }

        // Assert: todos os atributos mantidos apos transporte na rede
        assertEquals(original.getSubtotal(), restaurado.getSubtotal(), 0.0001);
        assertEquals(original.getFrete(),    restaurado.getFrete(),    0.0001);
        assertEquals(original.getParcelas(), restaurado.getParcelas());
        assertEquals(original.toString(),    restaurado.toString());
    }

    // -------------------------------------------------------------------------
    // 5. Particoes invalidas de atributos (documenta comportamento atual da entidade)
    // -------------------------------------------------------------------------

    @Test
    public void testAtributosParticoesInvalidas_ConstrutorArmazenaSemValidarInvariantes()
    {
        // Arrange & Action: particoes invalidas (subtotal < 0, frete < 0, parcelas fora de 1..12)
        // Observacao: a validacao de negocio atualmente ocorre apenas na SupervisoraDeConexao,
        // permitindo criar objetos PedidoDeCalculo em estado semanticamente invalido.
        PedidoDeCalculo invalido = new PedidoDeCalculo(-100.0, -25.0, 0);

        // Assert: valores sao armazenados sem restricao na entidade
        assertEquals(-100.0, invalido.getSubtotal(), 0.0001);
        assertEquals(-25.0,  invalido.getFrete(),    0.0001);
        assertEquals(0,      invalido.getParcelas());
    }

    // -------------------------------------------------------------------------
    // 6. FALHA EXPOSTA (F-IC4): Contrato de igualdade de valor (equals) ausente
    // -------------------------------------------------------------------------

    /**
     * FALHA F-IC4: Igualdade semantica entre duas instancias com os mesmos atributos.
     * Oraculo esperado: dois objetos PedidoDeCalculo com exatamente os mesmos valores
     * de subtotal, frete e parcelas (ex.: antes e apos serializacao) devem ser considerados
     * iguais via equals(Object).
     * Defeito exposto: PedidoDeCalculo nao sobrescreve equals() nem hashCode(), mantendo
     * apenas comparacao por referencia de memoria herdada de Object.
     */
    @Test
    public void testAtributosIguais_DuasInstanciasDevemSerIguaisPorValor_ExpoeDefeito()
    {
        // Arrange
        PedidoDeCalculo pedidoA = new PedidoDeCalculo(999.95, 45.50, 4);
        PedidoDeCalculo pedidoB = new PedidoDeCalculo(999.95, 45.50, 4);

        // Action
        boolean iguais = pedidoA.equals(pedidoB);

        // Assert
        assertTrue(
            "FALHA EXPOSTA (F-IC4): PedidoDeCalculo com atributos identicos deveria satisfazer equals(), "
            + "mas equals() nao foi sobrescrito na classe.",
            iguais
        );
    }
}
