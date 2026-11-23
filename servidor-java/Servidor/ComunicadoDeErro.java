// João Pedro RA: 25007162
// Objeto enviado pelo servidor ao cliente quando os valores informados no pedido sao invalidos
public class ComunicadoDeErro extends Comunicado
{
    private String mensagem;

    // Armazena a descricao do erro ocorrido durante a validacao
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
