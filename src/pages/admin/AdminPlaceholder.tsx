export default function AdminPlaceholder({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-32">
      <h1 className="text-hero" style={{ color: "#FAF8F5" }}>{title}</h1>
      <p className="mt-3 text-sm text-muted-foreground font-body">Próximamente.</p>
    </div>
  );
}
