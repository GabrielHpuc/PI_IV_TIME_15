// João Pedro RA: 25007162
// Representa o pedido recebido pelo servidor com subtotal, frete e numero de parcelas para calculo
public class PedidoDeCalculo extends Comunicado
{
    private double subtotal;
    private double frete;
    private int    parcelas;

    // Inicializa os valores enviados pelo cliente para processamento no servidor
    public PedidoDeCalculo (double subtotal, double frete, int parcelas)
    {
        this.subtotal = subtotal;
        this.frete    = frete;
        this.parcelas = parcelas;
    }

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
