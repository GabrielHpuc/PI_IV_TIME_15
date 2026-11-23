// Gabriel RA: 25004669

import java.net.*;
import java.io.*;

public class Cliente
{
	// Endereco e porta padrao caso nao sejam passados por argumento
	public static final String HOST_PADRAO  = "localhost";
	public static final int    PORTA_PADRAO = 4000;

	// Abre o socket e cria os canais de transmissao e recepcao de objetos para retornar o Parceiro
	private static Parceiro conectar (String host, int porta)
	{
        // Tenta abrir a conexao via socket TCP com o servidor
        Socket conexao=null;
        try
        {
            conexao = new Socket (host, porta);
        }
        catch (Exception erro)
        {
            return null;
        }

        // Canal para enviar objetos serializados ao servidor
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

        // Canal para receber objetos serializados vindos do servidor
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

        // Junta o socket, receptor e transmissor no objeto Parceiro que representa o servidor
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

	// Envia o pedido de calculo ao servidor e aguarda ate chegar o resultado ou um erro
	private static Comunicado pedirCalculo (Parceiro servidor, double subtotal, double frete, int parcelas) throws Exception
	{
		// Manda o objeto com os dados da compra para o servidor processar
		servidor.receba (new PedidoDeCalculo (subtotal, frete, parcelas));

		// Espia o proximo comunicado na fila sem consumir ate ser a resposta do calculo
		Comunicado comunicado = null;
		do
		{
			comunicado = (Comunicado)servidor.espie ();
		}
		while (!(comunicado instanceof ResultadoDeCalculo) &&
		       !(comunicado instanceof ComunicadoDeErro));

		// Consome e retorna o comunicado definitivo
		return (Comunicado)servidor.envie ();
	}

	// Formata o valor numerico para exibicao em reais com virgula
	private static String reais (double valor)
	{
		return String.format (java.util.Locale.US, "R$ %.2f", valor).replace('.', ',');
	}

	// Modo usado pela integracao com o backend para calcular via argumentos e devolver um JSON
	private static void modoPorArgumentos (String[] args)
	{
		// Confere se foram passados todos os argumentos obrigatorios
		if (args.length<4 || args.length>6)
		{
			System.err.println ("Uso esperado: java Cliente calcular SUBTOTAL FRETE PARCELAS [HOST [PORTA]]");
			System.exit(1);
		}

		// Converte os argumentos recebidos em texto para numeros e le host e porta se informados
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

		// Conecta no servidor Java antes de enviar os dados
		Parceiro servidor = Cliente.conectar (host, porta);
		if (servidor==null)
		{
			System.err.println ("Servidor Java indisponivel em "+host+":"+porta);
			System.exit(1);
		}

		try
		{
			// Pede o calculo ao servidor e verifica se voltou algum erro de validacao
			Comunicado resposta = Cliente.pedirCalculo (servidor, subtotal, frete, parcelas);

			if (resposta instanceof ComunicadoDeErro)
			{
				System.err.println (((ComunicadoDeErro)resposta).getMensagem());
				System.exit(1);
			}

			// Imprime o JSON que o backend le na saida padrao e avisa o servidor que vai desconectar
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
        // Se foi chamado com o argumento calcular, roda direto sem abrir o menu interativo
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

        // Define host e porta usando os valores padrao ou os argumentos passados no terminal
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

        // Faz a conexao inicial com o servidor para usar no modo interativo
        Parceiro servidor = Cliente.conectar (host, porta);
        if (servidor==null)
        {
            System.err.println ("Indique o servidor e a porta corretos!\n");
            return;
        }

        // Inicia a thread que fica escutando caso o servidor envie um comunicado de desligamento
        TratadoraDeComunicadoDeDesligamento tratadoraDeComunicadoDeDesligamento = null;
        try
        {
			tratadoraDeComunicadoDeDesligamento = new TratadoraDeComunicadoDeDesligamento (servidor);
		}
		catch (Exception erro)
		{} // sei que servidor foi instanciado

        tratadoraDeComunicadoDeDesligamento.start();

        // Loop do menu interativo no terminal para calcular pedidos ou encerrar
        char opcao=' ';
        do
        {
            System.out.print ("Sua opcao ([C]alcular pedido, [T]erminar)? ");

            // Le a letra digitada pelo usuario e valida se e uma opcao existente
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
				// Le os dados pelo teclado, envia para o servidor calcular e mostra o resultado
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

					// Se voltou erro mostra a mensagem, senao exibe o total e o valor das parcelas
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

		// Envia o aviso de saida ao servidor antes de fechar o cliente
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
