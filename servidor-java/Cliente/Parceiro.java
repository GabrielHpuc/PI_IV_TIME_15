// Gabriel RA: 25004669
import java.io.*;
import java.net.*;
import java.util.*;
import java.util.concurrent.Semaphore;

// Representa a outra ponta da comunicacao via socket e gerencia o envio e recepcao de objetos
public class Parceiro
{
    private Socket             conexao;
    private ObjectInputStream  receptor;
    private ObjectOutputStream transmissor;
    
    // Guarda temporariamente o comunicado lido pelo metodo espie antes de ser consumido pelo envie
    private Comunicado proximoComunicado=null;

    // Semaforo de exclusao mutua para evitar conflito entre threads lendo do mesmo canal ao mesmo tempo
    private Semaphore mutEx = new Semaphore (1,true);

    // Valida e armazena o socket e os canais de entrada e saida da conexao
    public Parceiro (Socket             conexao,
                     ObjectInputStream  receptor,
                     ObjectOutputStream transmissor)
                     throws Exception // se parametro nulos
    {
        if (conexao==null)
            throw new Exception ("Conexao ausente");

        if (receptor==null)
            throw new Exception ("Receptor ausente");

        if (transmissor==null)
            throw new Exception ("Transmissor ausente");

        this.conexao     = conexao;
        this.receptor    = receptor;
        this.transmissor = transmissor;
    }

    // Envia um comunicado serializado para o parceiro na outra ponta da rede e limpa o buffer com flush
    public void receba (Comunicado x) throws Exception
    {
        try
        {
            this.transmissor.writeObject (x);
            this.transmissor.flush       ();
        }
        catch (IOException erro)
        {
            throw new Exception ("Erro de transmissao");
        }
    }

    // Olha qual e o proximo comunicado que chegou sem remover da variavel proximoComunicado
    // Usa o semaforo mutEx porque a thread de desligamento e a thread principal podem espiar juntas
    public Comunicado espie () throws Exception
    {
        try
        {
            this.mutEx.acquireUninterruptibly();
            if (this.proximoComunicado==null) this.proximoComunicado = (Comunicado)this.receptor.readObject();
            this.mutEx.release();
            return this.proximoComunicado;
        }
        catch (Exception erro)
        {
            throw new Exception ("Erro de recepcao");
        }
    }

    // Consome de vez o comunicado recebido e limpa a variavel proximoComunicado para a proxima leitura
    public Comunicado envie () throws Exception
    {
        try
        {
            if (this.proximoComunicado==null) this.proximoComunicado = (Comunicado)this.receptor.readObject();
            Comunicado ret         = this.proximoComunicado;
            this.proximoComunicado = null;
            return ret;
        }
        catch (Exception erro)
        {
            throw new Exception ("Erro de recepcao");
        }
    }

    // Fecha os canais de transmissao, recepcao e o socket para encerrar a conexao
    public void adeus () throws Exception
    {
        try
        {
            this.transmissor.close();
            this.receptor   .close();
            this.conexao    .close();
        }
        catch (Exception erro)
        {
            throw new Exception ("Erro de desconexao");
        }
    }
}
