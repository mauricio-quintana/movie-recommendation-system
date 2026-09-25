export default function Loading() {
  return (
    <div role="status" aria-label="Cargando" className="flex flex-col gap-7">
      <div className="skeleton h-3 w-32 rounded" />
      <div className="skeleton h-[440px] rounded-2xl" />
    </div>
  );
}
