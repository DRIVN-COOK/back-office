// src/nav.ts
import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard, Store, FileText, Truck, Wrench, Package, Boxes,
  MoveRight, Users, Tag, ReceiptText, ShoppingCart, CreditCard,
  Gift, CalendarDays, BarChart3, Landmark, Shield, BookOpen
} from 'lucide-react';

export type NavItem = { to: string; label: string; icon: LucideIcon };
export type NavSection = { title?: string; items: NavItem[] };

export const navSections: NavSection[] = [
  { items: [{ to: '/', label: 'Accueil', icon: LayoutDashboard }] },
  {
    title: 'Franchise',
    items: [
      { to: '/franchisees', label: 'Franchisés', icon: Store },
      { to: '/agreements', label: 'Contrats', icon: FileText },
    ],
  },
  {
    title: 'Camions',
    items: [
      { to: '/trucks', label: 'Parc', icon: Truck },
      { to: '/deployments', label: 'Déploiements', icon: MoveRight },
      { to: '/maintenance', label: 'Maintenance', icon: Wrench },
    ],
  },
  {
    title: 'Entrepôts & Stocks',
    items: [
      { to: '/warehouses', label: 'Entrepôts', icon: Boxes },
      { to: '/inventory', label: 'Inventaires', icon: Package },
      { to: '/movements', label: 'Mouvements', icon: MoveRight },
    ],
  },
  {
    title: 'Catalogue',
    items: [
      { to: '/suppliers', label: 'Fournisseurs', icon: Users },
      { to: '/products', label: 'Produits', icon: Tag },
      { to: '/prices', label: 'Tarifs', icon: ReceiptText },
    ],
  },
  {
    title: 'Appro (80/20)',
    items: [{ to: '/purchase-orders', label: 'Commandes d’appro', icon: ShoppingCart }],
  },
  {
    title: 'Ventes',
    items: [
      { to: '/customer-orders', label: 'Commandes clients', icon: ReceiptText },
      { to: '/payments', label: 'Paiements', icon: CreditCard },
      { to: '/invoices', label: 'Factures', icon: FileText },
    ],
  },
  {
    title: 'Fidélité & Événements',
    items: [
      { to: '/loyalty', label: 'Fidélité', icon: Gift },
      { to: '/events', label: 'Événements', icon: CalendarDays },
    ],
  },
  {
    title: 'Reporting',
    items: [
      { to: '/reporting', label: 'Ventes', icon: BarChart3 },
      { to: '/royalties', label: 'Redevances 4%', icon: Landmark },
    ],
  },
  {
    title: 'Administration',
    items: [
      { to: '/admin/users', label: 'Utilisateurs', icon: Shield },
      { to: '/admin/audit', label: 'Journal d’audit', icon: BookOpen },
    ],
  },
];
