public class PedidoDeCalculo extends Comunicado
{
    private double subtotal;
    private double frete;
    private int    parcelas;

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
