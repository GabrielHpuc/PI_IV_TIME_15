// João Pedro RA: 25007162
import org.junit.runner.RunWith;
import org.junit.runners.Suite;

/**
 * Suite JUnit 4 completa de Testes Orientados a Objetos (Intraclasse e Interclasse)
 * do Servidor Java do projeto AgroRecursos MarketPlace (PI IV - Time 15).
 */
@RunWith(Suite.class)
@Suite.SuiteClasses({
    ParceiroIntraclasseTest.class,
    PedidoDeCalculoIntraclasseTest.class,
    ResultadoDeCalculoIntraclasseTest.class,
    ServicoCalculoPedidoInterclasseTest.class
})
public class ServidorJavaTestSuite
{
}
