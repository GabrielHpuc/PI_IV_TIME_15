import java.io.*;
import java.net.*;
import java.util.*;

public class SupervisoraDeConexao extends Thread
{
    private Parceiro            usuario;
    private Socket              conexao;
    private ArrayList<Parceiro> usuarios;

    public SupervisoraDeConexao
    (Socket conexao, ArrayList<Parceiro> usuarios)
    throws Exception
    {
        if (conexao==null)
            throw new Exception ("Conexao ausente");

        if (usuarios==null)
            throw new Exception ("Usuarios ausentes");

        this.conexao  = conexao;
        this.usuarios = usuarios;
    }

    private static String reais (double valor)
    {
        return String.format (Locale.US, "R$ %.2f", valor).replace('.', ',');
    }

    public void run ()
    {

        ObjectOutputStream transmissor;
        try
        {
            transmissor =
            new ObjectOutputStream(
            this.conexao.getOutputStream());
        }
        catch (Exception erro)
        {
            return;
        }

        ObjectInputStream receptor=null;
        try
        {
            receptor=
            new ObjectInputStream(
            this.conexao.getInputStream());
        }
        catch (Exception err0)
        {
            try
            {
                transmissor.close();
            }
            catch (Exception falha)
            {} // so tentando fechar antes de acabar a thread

            return;
        }

        try
        {
            this.usuario =
            new Parceiro (this.conexao,
                          receptor,
                          transmissor);
        }
        catch (Exception erro)
        {} // sei que passei os parametros corretos

        try
        {
            synchronized (this.usuarios)
            {
                this.usuarios.add (this.usuario);
            }


            for(;;)
            {
                Comunicado comunicado = this.usuario.envie ();

                if (comunicado==null)
                    return;
                else if (comunicado instanceof PedidoDeCalculo)
                {
                    PedidoDeCalculo pedido = (PedidoDeCalculo)comunicado;

                    if (pedido.getSubtotal()<0 || pedido.getFrete()<0)
                    {
                        this.usuario.receba (new ComunicadoDeErro ("Subtotal e frete nao podem ser negativos"));
                        continue;
                    }

                    if (pedido.getParcelas()<1 || pedido.getParcelas()>12)
                    {
                        this.usuario.receba (new ComunicadoDeErro ("Parcelas invalidas"));
                        continue;
                    }

                    // soma o subtotal com o frete e divide pelas parcelas
                    double total = pedido.getSubtotal() + pedido.getFrete();
                    total = Math.round (total * 100) / 100.0;

                    long   totalEmCentavos = Math.round (total * 100);
                    double valorParcela    = (totalEmCentavos / pedido.getParcelas()) / 100.0;

                    System.out.println ("Calculando pedido: Subtotal "+SupervisoraDeConexao.reais(pedido.getSubtotal())+
                                        " + Frete "+SupervisoraDeConexao.reais(pedido.getFrete())+
                                        " = Total "+SupervisoraDeConexao.reais(total)+
                                        " | Parcelas: "+pedido.getParcelas()+"x de "+SupervisoraDeConexao.reais(valorParcela));

                    this.usuario.receba (new ResultadoDeCalculo (total, valorParcela));
                }
                else if (comunicado instanceof PedidoParaSair)
                {
                    synchronized (this.usuarios)
                    {
                        this.usuarios.remove (this.usuario);
                    }
                    this.usuario.adeus();
                }
            }
        }
        catch (Exception erro)
        {
            try
            {
                transmissor.close ();
                receptor   .close ();
            }
            catch (Exception falha)
            {} // so tentando fechar antes de acabar a thread

            return;
        }
    }
}
