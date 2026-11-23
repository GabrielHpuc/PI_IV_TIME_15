// Gabriel RA: 25004669
// Objeto retornado pelo servidor contendo o valor total do pedido e o valor de cada parcela calculada
public class ResultadoDeCalculo extends Comunicado
{
    private double total;
    private double valorParcela;

    // Armazena o total somado com o frete e o valor individual da parcela
    public ResultadoDeCalculo (double total, double valorParcela)
    {
        this.total        = total;
        this.valorParcela = valorParcela;
    }

    // Metodos getters para o cliente ler o resultado do calculo
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
