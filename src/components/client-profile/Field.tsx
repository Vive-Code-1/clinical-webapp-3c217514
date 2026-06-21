export function Field({
  label,
  textarea,
  ...rest
}: {
  label: string;
  textarea?: boolean;
} & React.InputHTMLAttributes<HTMLInputElement> & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-muted-foreground mb-1">{label}</span>
      {textarea ? (
        <textarea
          {...(rest as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
          className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm min-h-[60px] focus:outline-none focus:ring-1 focus:ring-primary"
        />
      ) : (
        <input
          {...(rest as React.InputHTMLAttributes<HTMLInputElement>)}
          className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
        />
      )}
    </label>
  );
}
