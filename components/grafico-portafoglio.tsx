// components/grafico-portafoglio.tsx
"use client";

import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";

export interface ImmobilePortafoglio {
  id: string;
  nome: string;
  valore: number;
  debito: number;
  irr: number | null;
}

const formatoEuro = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

function TooltipPersonalizzato({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: ImmobilePortafoglio & { leva: number } }[];
}) {
  if (!active || !payload || payload.length === 0) return null;
  const dato = payload[0].payload;

  return (
    <div className="rounded-sm border border-[var(--rule)] bg-[var(--surface)] px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-medium text-[var(--ink-text)]">{dato.nome}</p>
      <p className="text-[var(--muted)]">Valore: {formatoEuro.format(dato.valore)}</p>
      <p className="text-[var(--muted)]">Leva: {dato.leva.toFixed(0)}%</p>
      <p className="text-[var(--brass)]">
        IRR: {dato.irr !== null ? `${(dato.irr * 100).toFixed(2)}%` : "n/d"}
      </p>
    </div>
  );
}

export default function GraficoPortafoglio({
  immobili,
}: {
  immobili: ImmobilePortafoglio[];
}) {
  const dati = immobili
    .filter((im) => im.irr !== null && im.valore > 0)
    .map((im) => ({
      ...im,
      leva: im.valore > 0 ? (im.debito / im.valore) * 100 : 0,
      irrPercentuale: (im.irr as number) * 100,
    }));

  if (dati.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={240}>
      <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--rule)" opacity={0.3} />
        <XAxis
          type="number"
          dataKey="leva"
          name="Leva"
          unit="%"
          domain={[0, "dataMax"]}
          stroke="var(--muted)"
          fontSize={11}
          label={{
            value: "Leva finanziaria (debito/valore)",
            position: "insideBottom",
            offset: -10,
            fill: "var(--muted)",
            fontSize: 11,
          }}
        />
        <YAxis
          type="number"
          dataKey="irrPercentuale"
          name="IRR"
          unit="%"
          stroke="var(--muted)"
          fontSize={11}
          label={{
            value: "IRR",
            angle: -90,
            position: "insideLeft",
            fill: "var(--muted)",
            fontSize: 11,
          }}
        />
        <ZAxis type="number" dataKey="valore" range={[100, 900]} name="Valore" />
        <ReferenceLine y={0} stroke="var(--rule)" />
        <Tooltip content={<TooltipPersonalizzato />} cursor={{ strokeDasharray: "3 3" }} />
        <Scatter data={dati} fill="var(--brass)" fillOpacity={0.7} />
      </ScatterChart>
    </ResponsiveContainer>
  );
}
