import { useEffect, useState } from 'react';
import { api } from '@drivn-cook/shared'
export default function TrucksPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/trucks'); // ajuste ton endpoint
        setItems(res.data.items ?? res.data);
      } finally { setLoading(false); }
    })();
  }, []);
  if (loading) return null;
  return (
    <section className="space-y-3">
      <h1 className="text-xl font-semibold">Parc de camions</h1>
      <div className="text-sm opacity-70">Total: {items.length}</div>
      <div className="grid gap-2">
        {items.map(t => (
          <div key={t.id} className="border rounded p-3">
            <div className="font-medium">{t.plateNumber} — {t.model ?? 'Modèle ?'}</div>
            <div className="text-sm opacity-70">Statut: {t.currentStatus}</div>
          </div>
        ))}
      </div>
    </section>
  );
}