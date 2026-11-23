// Gabriel RA: 25004669
// Objeto enviado pelo cliente ao servidor contendo os valores da compra para calcular o total e as parcelas
public class PedidoDeCalculo extends Comunicado
{
    private double subtotal;
    private double frete;
    private int    parcelas;

    // Inicializa o pedido com o subtotal dos produtos, o valor do frete e a quantidade de parcelas
    public PedidoDeCalculo (double subtotal, double frete, int parcelas)
    {
        this.subtotal = subtotal;
        this.frete    = frete;
        this.parcelas = parcelas;
    }

    // Metodos getters usados pelo servidor para ler os valores enviados pelo cliente
    public double getSubtotal ()
    {
        return this.subtotal;
    }

    public double getFrete ()
    {
        return this.frete;
    }

    public int getParcelas ()
    {
        return this.parcelas;
    }

    public String toString ()
    {
        return "subtotal="+this.subtotal+" frete="+this.frete+" parcelas="+this.parcelas;
    }
}
