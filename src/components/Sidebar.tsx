import { NavLink } from 'react-router-dom';

const item = (to: string, label: string) => (
  <NavLink
    key={to}
    to={to}
    className={({ isActive }) =>
      `rounded px-2 py-1 ${isActive ? 'bg-black/5 font-medium' : 'hover:bg-black/5'}`
    }
  >
    {label}
  </NavLink>
);

export default function Sidebar() {
  return (
    <aside className="w-64 border-r px-3 py-4 space-y-2 text-sm">
      <nav className="flex flex-col gap-1">
        <div className="font-semibold mb-2">Dashboard</div>
        {item('/', 'Accueil')}

        <div className="uppercase opacity-60 mt-3 mb-1">Franchise</div>
        {item('/franchisees', 'Franchisés')}
        {item('/agreements', 'Contrats')}

        <div className="uppercase opacity-60 mt-3 mb-1">Camions</div>
        {item('/trucks', 'Parc')}
        {item('/deployments', 'Déploiements')}
        {item('/maintenance', 'Maintenance')}

        <div className="uppercase opacity-60 mt-3 mb-1">Entrepôts & Stocks</div>
        {item('/warehouses', 'Entrepôts')}
        {item('/inventory', 'Inventaires')}
        {item('/movements', 'Mouvements')}

        <div className="uppercase opacity-60 mt-3 mb-1">Catalogue</div>
        {item('/suppliers', 'Fournisseurs')}
        {item('/products', 'Produits')}
        {item('/prices', 'Tarifs')}

        <div className="uppercase opacity-60 mt-3 mb-1">Appro (80/20)</div>
        {item('/purchase-orders', 'Commandes d’appro')}

        <div className="uppercase opacity-60 mt-3 mb-1">Ventes</div>
        {item('/customer-orders', 'Commandes clients')}
        {item('/payments', 'Paiements')}
        {item('/invoices', 'Factures')}

        <div className="uppercase opacity-60 mt-3 mb-1">Fidélité & Événements</div>
        {item('/loyalty', 'Fidélité')}
        {item('/events', 'Événements')}

        <div className="uppercase opacity-60 mt-3 mb-1">Reporting</div>
        {item('/reporting', 'Ventes')}
        {item('/royalties', 'Redevances 4%')}

        <div className="uppercase opacity-60 mt-3 mb-1">Administration</div>
        {item('/admin/users', 'Utilisateurs')}
        {item('/admin/audit', 'Journal d’audit')}
      </nav>
    </aside>
  );
}
