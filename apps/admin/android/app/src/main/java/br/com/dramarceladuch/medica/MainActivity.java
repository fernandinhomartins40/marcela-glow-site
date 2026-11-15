package br.com.dramarceladuch.medica;

import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.drawable.ColorDrawable;
import android.os.Bundle;
import android.view.View;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        View janela = getWindow().getDecorView();
        janela.setBackground(new FundoComBarraDeStatus(janela, ContextCompat.getColor(this, R.color.barra_status)));
    }

    /**
     * Em WebView < 140 o SystemBars do Capacitor não desenha de borda a borda:
     * põe na janela um recuo do tamanho das barras e pinta esse recuo com o
     * windowBackground do tema (claro), e o relógio, claro por causa do
     * Style.Dark, sumia. Este fundo pinta só o recuo de cima com a cor do tema;
     * o resto continua com a cor que o Capacitor escolher. É um ColorDrawable
     * de propósito: o Capacitor chama setBackgroundColor(), que num ColorDrawable
     * só troca a cor, e a faixa sobrevive. Em WebView >= 140 o recuo é zero e
     * nada muda: a página desenha sob as barras como antes.
     */
    static final class FundoComBarraDeStatus extends ColorDrawable {

        private final View janela;
        private final Paint barra = new Paint();

        FundoComBarraDeStatus(View janela, int corDaBarra) {
            super(0);
            this.janela = janela;
            barra.setColor(corDaBarra);
        }

        @Override
        public void draw(Canvas canvas) {
            super.draw(canvas);
            int topo = janela.getPaddingTop();
            if (topo > 0) canvas.drawRect(0, 0, getBounds().width(), topo, barra);
        }
    }
}
