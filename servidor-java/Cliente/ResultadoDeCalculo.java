public class ResultadoDeCalculo extends Comunicado
{
    private double total;
    private double valorParcela;

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
