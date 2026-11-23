// Gabriel RA: 25004669
// Representa uma resposta de erro enviada pelo servidor quando algum dado ou operacao falha
public class ComunicadoDeErro extends Comunicado
{
    private String mensagem;

    // Guarda o texto explicando o motivo do erro ocorrido no servidor
    public ComunicadoDeErro (String mensagem)
    {
        this.mensagem = mensagem;
    }

    // Retorna a mensagem de erro para ser exibida no cliente
    public String getMensagem ()
    {
        return this.mensagem;
    }

    public String toString ()
    {
        return this.mensagem;
    }
}
