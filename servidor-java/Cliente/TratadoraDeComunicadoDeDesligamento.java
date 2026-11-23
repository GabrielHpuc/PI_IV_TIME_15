// Gabriel RA: 25004669
import java.net.*;

// Thread que roda em segundo plano no cliente monitorando se o servidor enviou aviso de desligamento
public class TratadoraDeComunicadoDeDesligamento extends Thread
{
    private Parceiro servidor;

    // Recebe e valida a referencia do servidor conectado
    public TratadoraDeComunicadoDeDesligamento (Parceiro servidor) throws Exception
    {
        if (servidor==null)
            throw new Exception ("Porta invalida");

        this.servidor = servidor;
    }

    // Verifica as mensagens que chegam e encerra o programa caso o servidor seja desligado
    public void run ()
    {
        for(;;)
        {
			try
			{
				if (this.servidor.espie() instanceof ComunicadoDeDesligamento)
				{
					System.out.println ("\nO servidor vai ser desligado agora;");
				    System.err.println ("volte mais tarde!\n");
				    System.exit(0);
				}
			}
			catch (Exception erro)
			{}
        }
    }
}
