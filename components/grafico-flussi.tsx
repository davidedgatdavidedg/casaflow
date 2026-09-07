// components/grafico-flussi.tsx
"use client";

import {
  Bar,
  Brush,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface DatoAnnoGrafico {
  annoCalendario: number;
  postVendita: boolean;
  investimenti: number;
  ricavi: number;
  costi: number;
  oneri: number;
  imposte: number;
  flussoCumulato: number;
}

const formatoEuroColonna = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const COLORI = {
  investimenti: "var(--brass)",
  ricavi: "#5b8c5a",
  costi: "var(--brick)",
  oneri: "#9b7cb6",
  imposte: "#6b7a8f",
  cumulato: "var(--ink-text)",
};

const ETICHETTE = {
  investimenti: "Investimento",
  ricavi: "Ricavo",
  costi: "Costo",
  oneri: "Onere",
  imposte: "Imposta",
  flussoCumulato: "Flusso cumulato",
};

function TooltipPersonalizzato({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { dataKey: string; value: number; color: string }[];
  label?: string | number;
}) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="rounded-sm border border-[var(--rule)] bg-[var(--surface)] px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-medium text-[var(--ink-text)]">Anno {label}</p>
      {payload.map((voce) => (
        <p key={voce.dataKey} style={{ color: voce.color }}>
          {ETICHETTE[voce.dataKey as keyof typeof ETICHETTE] ?? voce.dataKey}:{" "}
          {formatoEuroColonna.format(voce.value)}
        </p>
      ))}
    </div>
  );
}

export default function GraficoFlussi({
  dati,
  annoRientroCalendario,
}: {
  dati: DatoAnnoGrafico[];
  annoRientroCalendario: number | null;
}) {
  return (
    <ResponsiveContainer width="100%" height={420}>
      <ComposedChart data={dati} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--rule)" opacity={0.3} />
        <XAxis
          dataKey="annoCalendario"
          stroke="var(--muted)"
          fontSize={11}
          tickFormatter={(valore, indice) =>
            dati[indice]?.postVendita ? `${valore}*` : String(valore)
          }
        />
        <YAxis
          yAxisId="sinistra"
          stroke="var(--muted)"
          fontSize={11}
          tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
        />
        <YAxis
          yAxisId="destra"
          orientation="right"
          stroke="var(--muted)"
          fontSize={11}
          tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
        />
        <Tooltip content={<TooltipPersonalizzato />} />
        <Legend
          wrapperStyle={{ fontSize: 12 }}
          formatter={(valore) => ETICHETTE[valore as keyof typeof ETICHETTE] ?? valore}
        />
        {annoRientroCalendario !== null && (
          <ReferenceLine
            yAxisId="sinistra"
            x={annoRientroCalendario}
            stroke="var(--brass)"
            strokeDasharray="4 4"
            label={{
              value: "Rientro",
              position: "top",
              fill: "var(--brass)",
              fontSize: 11,
            }}
          />
        )}
        <Bar yAxisId="sinistra" dataKey="investimenti" stackId="anno" fill={COLORI.investimenti} />
        <Bar yAxisId="sinistra" dataKey="ricavi" stackId="anno" fill={COLORI.ricavi} />
        <Bar yAxisId="sinistra" dataKey="costi" stackId="anno" fill={COLORI.costi} />
        <Bar yAxisId="sinistra" dataKey="oneri" stackId="anno" fill={COLORI.oneri} />
        <Bar yAxisId="sinistra" dataKey="imposte" stackId="anno" fill={COLORI.imposte} />
        <Line
          yAxisId="destra"
          type="monotone"
          dataKey="flussoCumulato"
          stroke={COLORI.cumulato}
          strokeDasharray="5 5"
          strokeWidth={2}
          dot={{ r: 3, fill: COLORI.cumulato }}
        />
        <Brush
          dataKey="annoCalendario"
          height={26}
          stroke="var(--brass)"
          fill="var(--surface)"
          travellerWidth={8}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
