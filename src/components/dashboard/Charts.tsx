import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, LineChart, Line, Tooltip } from "recharts";
import { ChartCard, ChartLegend } from "./Cards";

export function AppointmentsBarChart({ data, title }: { data: any[]; title: string }) {
  return (
    <ChartCard title={title}>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barCategoryGap={18}>
            <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} width={28} />
            <Tooltip cursor={{ fill: "transparent" }} contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", fontSize: 12 }} />
            <Bar dataKey="online" stackId="a" fill="var(--chart-3)" radius={[0, 0, 6, 6]} />
            <Bar dataKey="clinic" stackId="a" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ChartLegend />
    </ChartCard>
  );
}

export function VisitorsLineChart({ data, title }: { data: any[]; title: string }) {
  return (
    <ChartCard title={title}>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} width={28} />
            <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", fontSize: 12 }} />
            <Line type="monotone" dataKey="visitors" stroke="var(--chart-1)" strokeWidth={3} dot={{ r: 4, fill: "var(--chart-1)" }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
