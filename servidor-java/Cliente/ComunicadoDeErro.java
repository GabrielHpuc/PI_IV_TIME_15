public class ComunicadoDeErro extends Comunicado
{
    private String mensagem;

    public ComunicadoDeErro (String mensagem)
    {
        this.mensagem = mensagem;
    }

    public String getMensagem ()
    {
        return this.mensagem;
    }

    public String toString ()
    {
        return this.mensagem;
    }
}
