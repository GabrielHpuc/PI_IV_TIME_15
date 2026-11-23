// João Pedro RA: 25007162
import java.util.*;

// Classe principal do servidor Java que inicia a aceitadora de conexoes e aguarda o comando de desligamento
public class Servidor
{
    public static String PORTA_PADRAO = "4000";
    
    public static void main (String[] args)
    {
        if (args.length>1)
        {
            System.err.println ("Uso esperado: java Servidor [PORTA]\n");
            return;
        }

        String porta=Servidor.PORTA_PADRAO;
        
        if (args.length==1)
            porta = args[0];

        ArrayList<Parceiro> usuarios =
        new ArrayList<Parceiro> ();

        AceitadoraDeConexao aceitadoraDeConexao=null;
        try
        {
            aceitadoraDeConexao =
            new AceitadoraDeConexao (porta, usuarios);
            aceitadoraDeConexao.start();
        }
        catch (Exception erro)
        {
            System.err.println ("Escolha uma porta apropriada e liberada para uso!\n");
            return;
        }

        for(;;)
        {
            System.out.println ("O servidor esta ativo! Para desativa-lo,");
            System.out.println ("use o comando \"desativar\"\n");
            System.out.print   ("> ");

            String comando=null;
            try
            {
                comando = Teclado.getUmString();
            }
            catch (Exception erro)
            {}

            // Sem teclado (entrada fechada, servidor em segundo plano): nao ha comando para ler.
            // Repetir o laco sem pausa consumiria CPU e inundaria o console, entao o servidor
            // continua atendendo clientes e so um sinal de encerramento (Ctrl+C) o desliga.
            if (comando == null)
            {
                System.out.println ("Entrada do teclado indisponivel; o servidor segue ativo.");
                for(;;)
                {
                    try
                    {
                        Thread.sleep (60000);
                    }
                    catch (InterruptedException erro)
                    {
                        return;
                    }
                }
            }

            // Envia comunicado de desligamento para todos os clientes conectados antes de encerrar o servidor
            if (comando.toLowerCase().equals("desativar"))
            {
                synchronized (usuarios)
                {
                    ComunicadoDeDesligamento comunicadoDeDesligamento =
                    new ComunicadoDeDesligamento ();
                    
                    for (Parceiro usuario:usuarios)
                    {
                        try
                        {
                            usuario.receba (comunicadoDeDesligamento);
                            usuario.adeus  ();
                        }
                        catch (Exception erro)
                        {}
                    }
                }

                System.out.println ("O servidor foi desativado!\n");
                System.exit(0);
            }
            else
                System.err.println ("Comando invalido!\n");
        }
    }
}
