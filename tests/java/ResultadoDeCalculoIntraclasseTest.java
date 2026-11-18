import static org.junit.Assert.*;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.ObjectInputStream;
import java.io.ObjectOutputStream;
import org.junit.Test;

/**
 * Testes INTRACLASSE (Teste OO) da classe {@link ResultadoDeCalculo}.
 *
 * Tecnica de particionamento aplicada: PARTICIONAMENTO POR CATEGORIAS DE METODOS.
 * Categorias identificadas na classe:
 *   1. Inicializacao/Terminacao : ResultadoDeCalculo(double total, double valorParcela)
 *   2. Setup de valores         : (nenhum setter - objeto imutavel)
 *   3. Consultas                : getTotal(), getValorParcela(), toString()
 *   4. Computacao/Operacoes     : serializacao herdada de Comunicado (Serializable)
 *   5. Predicativas/Condicionais: equals(Object) herdado de Object
 */
public class ResultadoDeCalculoIntraclasseTest
{
    // -------------------------------------------------------------------------
    // Categoria 1 (Inicializacao) + Categoria 3 (Consultas: getters e toString)
    // -------------------------------------------------------------------------

    @Test
    public void testInicializacaoEConsultas_ValoresValidos()
    {
        // Arrange
        double totalEsperado   = 1620.00;
        double parcelaEsperada = 540.00;

        // Action: ResultadoDeCalculo(total, valorParcela) - getTotal() - getValorParcela() - toString()
        ResultadoDeCalculo resultado = new ResultadoDeCalculo(totalEsperado, parcelaEsperada);
        double totalObtido   = resultado.getTotal();
        double parcelaObtida = resultado.getValorParcela();
        String representacao = resultado.toString();

        // Assert
        assertEquals(1620.00, totalObtido,   0.0001);
        assertEquals(540.00,  parcelaObtida, 0.0001);
        assertEquals("total=1620.0 valorParcela=540.0", representacao);
    }

    @Test
    public void testInicializacaoEConsultas_ValoresLimiteZero()
    {
        // Arrange & Action: ResultadoDeCalculo(0.0, 0.0) - getTotal() - getValorParcela() - toString()
        ResultadoDeCalculo resultadoZero = new ResultadoDeCalculo(0.0, 0.0);

        // Assert
        assertEquals(0.0, resultadoZero.getTotal(),        0.0001);
        assertEquals(0.0, resultadoZero.getValorParcela(), 0.0001);
        assertEquals("total=0.0 valorParcela=0.0", resultadoZero.toString());
    }

    // -------------------------------------------------------------------------
    // Categoria 4 (Operacao herdada de Comunicado: Serializable)
    // -------------------------------------------------------------------------

    @Test
    public void testOperacaoHerdadaComunicado_SerializacaoEDesserializacao() throws Exception
    {
        // Arrange
        ResultadoDeCalculo original = new ResultadoDeCalculo(1000.00, 333.33);

        // Action
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        try (ObjectOutputStream oos = new ObjectOutputStream(baos))
        {
            oos.writeObject(original);
        }

        ResultadoDeCalculo restaurado;
        try (ObjectInputStream ois = new ObjectInputStream(new ByteArrayInputStream(baos.toByteArray())))
        {
            Object obj = ois.readObject();
            assertTrue(obj instanceof Comunicado);
            assertTrue(obj instanceof ResultadoDeCalculo);
            restaurado = (ResultadoDeCalculo) obj;
        }

        // Assert
        assertEquals(1000.00, restaurado.getTotal(),        0.0001);
        assertEquals(333.33,  restaurado.getValorParcela(), 0.0001);
        assertEquals(original.toString(), restaurado.toString());
    }

    // -------------------------------------------------------------------------
    // Categoria 5 (Predicativa herdada: equals) - FALHA EXPOSTA (F-IC5)
    // -------------------------------------------------------------------------

    /**
     * FALHA F-IC5: Metodo predicativo equals(Object) nao sobrescrito em ResultadoDeCalculo.
     * Oraculo esperado: dois ResultadoDeCalculo com mesmo total e valorParcela devem ser iguais.
     * Defeito exposto: ausencia de equals() e hashCode() em ResultadoDeCalculo.
     */
    @Test
    public void testPredicativaEquals_ResultadosComMesmosValoresDevemSerIguais_ExpoeDefeito()
    {
        // Arrange
        ResultadoDeCalculo r1 = new ResultadoDeCalculo(500.00, 250.00);
        ResultadoDeCalculo r2 = new ResultadoDeCalculo(500.00, 250.00);

        // Action
        boolean iguais = r1.equals(r2);

        // Assert
        assertTrue(
            "FALHA EXPOSTA (F-IC5): ResultadoDeCalculo com valores identicos deveria satisfazer equals(), "
            + "mas equals() nao foi implementado na classe.",
            iguais
        );
    }
}
