// João Pedro RA: 25007162
// Objeto de resposta enviado pelo servidor ao cliente com o total do pedido e o valor de cada parcela
public class ResultadoDeCalculo extends Comunicado
{
    private double total;
    private double valorParcela;

    // Guarda o resultado final do calculo para envio via socket
    public ResultadoDeCalculo (double total, double valorParcela)
    {
        this.total        = total;
        this.valorParcela = valorParcela;
    }

    public double getTotal ()
    {
        return this.total;
    }

    public double getValorParcela ()
    {
        return this.valorParcela;
    }

    public String toString ()
    {
        return "total="+this.total+" valorParcela="+this.valorParcela;
    }
}
