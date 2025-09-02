// src/nav.ts
import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard, Store, FileText, Truck, Wrench, Package, Boxes,
  MoveRight, Users, Tag, ReceiptText, ShoppingCart, BarChart3, Shield, BookOpen
} from 'lucide-react';

export type NavItem = { to: string; label: string; icon: LucideIcon };
export type NavSection = { title?: string; items: NavItem[] };

export const navSections: NavSection[] = [
  { items: [{ to: '/', label: 'Accueil', icon: LayoutDashboard }] },
  {
    title: 'Franchise',
    items: [
      { to: '/franchises', label: 'Franchises', icon: Store },
      { to: '/agreements', label: 'Contrats', icon: FileText },
    ],
  },
  {
    title: 'Camions',
    items: [
      { to: '/trucks', label: 'Parc', icon: Truck },
      { to: '/maintenance', label: 'Maintenance', icon: Wrench },
    ],
  },
  {
    title: 'Entrepôts & Stocks',
    items: [
      { to: '/warehouses', label: 'Entrepôts', icon: Boxes },
      { to: '/inventory', label: 'Inventaires', icon: Package },
    ],
  },
  {
    title: 'Catalogue',
    items: [
      { to: '/suppliers', label: 'Fournisseurs', icon: Users },
      { to: '/products', label: 'Produits', icon: Tag },
      { to: '/prices', label: 'Tarifs', icon: ReceiptText },
      { to: '/purchase-orders', label: 'Commandes d’appro', icon: ShoppingCart },
      { to: '/customer-orders', label: 'Commandes clients', icon: ReceiptText }
    ],
  },
  {
    title: 'Reporting',
    items: [
      { to: '/reporting', label: 'Ventes', icon: BarChart3 },
    ],
  },
  {
    title: 'Administration',
    items: [
      { to: '/admin/users', label: 'Utilisateurs', icon: Shield },
    ],
  },
];
