import java.net.*;
import java.io.*;

public class Cliente
{
	public static final String HOST_PADRAO  = "localhost";
	public static final int    PORTA_PADRAO = 4000;

	private static Parceiro conectar (String host, int porta)
	{
        Socket conexao=null;
        try
        {
            conexao = new Socket (host, porta);
        }
        catch (Exception erro)
        {
            return null;
        }

        ObjectOutputStream transmissor=null;
        try
        {
            transmissor =
            new ObjectOutputStream(
            conexao.getOutputStream());
        }
        catch (Exception erro)
        {
            return null;
        }

        ObjectInputStream receptor=null;
        try
        {
            receptor =
            new ObjectInputStream(
            conexao.getInputStream());
        }
        catch (Exception erro)
        {
            return null;
        }

        Parceiro servidor=null;
        try
        {
            servidor =
            new Parceiro (conexao, receptor, transmissor);
        }
        catch (Exception erro)
        {
            return null;
        }

        return servidor;
	}

	private static Comunicado pedirCalculo (Parceiro servidor, double subtotal, double frete, int parcelas) throws Exception
	{
		servidor.receba (new PedidoDeCalculo (subtotal, frete, parcelas));

		Comunicado comunicado = null;
		do
		{
			comunicado = (Comunicado)servidor.espie ();
		}
		while (!(comunicado instanceof ResultadoDeCalculo) &&
		       !(comunicado instanceof ComunicadoDeErro));

		return (Comunicado)servidor.envie ();
	}

	private static String reais (double valor)
	{
		return String.format (java.util.Locale.US, "R$ %.2f", valor).replace('.', ',');
	}

	private static void modoPorArgumentos (String[] args)
	{
		if (args.length<4 || args.length>6)
		{
			System.err.println ("Uso esperado: java Cliente calcular SUBTOTAL FRETE PARCELAS [HOST [PORTA]]");
			System.exit(1);
		}

		double subtotal=0, frete=0;
		int    parcelas=0;
		String host  = Cliente.HOST_PADRAO;
		int    porta = Cliente.PORTA_PADRAO;
		try
		{
			subtotal = Double.parseDouble (args[1]);
			frete    = Double.parseDouble (args[2]);
			parcelas = Integer.parseInt   (args[3]);

			if (args.length>4)
				host = args[4];

			if (args.length>5)
				porta = Integer.parseInt (args[5]);
		}
		catch (Exception erro)
		{
			System.err.println ("Valores invalidos");
			System.exit(1);
		}

		Parceiro servidor = Cliente.conectar (host, porta);
		if (servidor==null)
		{
			System.err.println ("Servidor Java indisponivel em "+host+":"+porta);
			System.exit(1);
		}

		try
		{
			Comunicado resposta = Cliente.pedirCalculo (servidor, subtotal, frete, parcelas);

			if (resposta instanceof ComunicadoDeErro)
			{
				System.err.println (((ComunicadoDeErro)resposta).getMensagem());
				System.exit(1);
			}

			ResultadoDeCalculo resultado = (ResultadoDeCalculo)resposta;
			System.out.println ("{\"total\":"+resultado.getTotal()+",\"valorParcela\":"+resultado.getValorParcela()+"}");

			servidor.receba (new PedidoParaSair ());
		}
		catch (Exception erro)
		{
			System.err.println ("Erro de comunicacao com o servidor");
			System.exit(1);
		}

		System.exit(0);
	}

	public static void main (String[] args)
	{
        if (args.length>0 && (args[0].equals("calcular") || args[0].equals("--calcular")))
        {
            Cliente.modoPorArgumentos (args);
            return;
        }

        if (args.length>2)
        {
            System.err.println ("Uso esperado: java Cliente [HOST [PORTA]]\n");
            return;
        }

        String host = Cliente.HOST_PADRAO;
        int    porta= Cliente.PORTA_PADRAO;
        try
        {
            if (args.length>0)
                host = args[0];

            if (args.length==2)
                porta = Integer.parseInt(args[1]);
        }
        catch (Exception erro)
        {
            System.err.println ("Indique o servidor e a porta corretos!\n");
            return;
        }

        Parceiro servidor = Cliente.conectar (host, porta);
        if (servidor==null)
        {
            System.err.println ("Indique o servidor e a porta corretos!\n");
            return;
        }

        TratadoraDeComunicadoDeDesligamento tratadoraDeComunicadoDeDesligamento = null;
        try
        {
			tratadoraDeComunicadoDeDesligamento = new TratadoraDeComunicadoDeDesligamento (servidor);
		}
		catch (Exception erro)
		{} // sei que servidor foi instanciado

        tratadoraDeComunicadoDeDesligamento.start();

        char opcao=' ';
        do
        {
            System.out.print ("Sua opcao ([C]alcular pedido, [T]erminar)? ");

            try
            {
				opcao = Character.toUpperCase(Teclado.getUmChar());
		    }
		    catch (Exception erro)
		    {
				System.err.println ("Opcao invalida!\n");
				continue;
			}

			if ("CT".indexOf(opcao)==-1)
		    {
				System.err.println ("Opcao invalida!\n");
				continue;
			}

			try
			{
				if (opcao=='C')
				{
					double subtotal=0, frete=0;
					int    parcelas=0;
					try
					{
						System.out.print ("Subtotal dos produtos em R$? ");
						subtotal = Teclado.getUmDouble();
						System.out.print ("Frete em R$? ");
						frete = Teclado.getUmDouble();
						System.out.print ("Quantidade de parcelas de 1 a 12? ");
						parcelas = Teclado.getUmInt();
						System.out.println();
					}
					catch (Exception erro)
					{
						System.err.println ("Valor invalido!\n");
						continue;
					}

					Comunicado resposta = Cliente.pedirCalculo (servidor, subtotal, frete, parcelas);

					if (resposta instanceof ComunicadoDeErro)
						System.err.println ("Erro: "+((ComunicadoDeErro)resposta).getMensagem()+"\n");
					else
					{
						ResultadoDeCalculo resultado = (ResultadoDeCalculo)resposta;
						System.out.println ("Total do pedido: "+Cliente.reais(resultado.getTotal()));
						System.out.println (parcelas+"x de "+Cliente.reais(resultado.getValorParcela())+"\n");
					}
				}
			}
			catch (Exception erro)
			{
				System.err.println ("Erro de comunicacao com o servidor;");
				System.err.println ("Tente novamente!");
				System.err.println ("Caso o erro persista, termine o programa");
				System.err.println ("e volte a tentar mais tarde!\n");
			}
        }
        while (opcao != 'T');

		try
		{
			servidor.receba (new PedidoParaSair ());
		}
		catch (Exception erro)
		{}

		System.out.println ("Obrigado por usar este programa!");
		System.exit(0);
	}
}
