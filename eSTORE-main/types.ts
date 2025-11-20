export enum ItemCategory {
  CHEMICAL = 'CHEMICAL',
  SPARE_PART = 'SPARE PART',
  PACKAGING = 'PACKAGING',
  OTHER = 'OTHER'
}

export interface AuditEntry {
  date: string;
  user: string;
  action: string; 
  details: string; 
}

export interface InventoryItem {
  id: string;
  materialNo: string;
  sloc: string;
  name: string;
  quantity: number;
  uom: string;
  price: number;
  pricePerUnit?: number;
  rackNo?: string;
  category: string;
  minStock: number;
  maxStock?: number;
  prStatus?: string;
  prNumber?: string;
  wbs?: string;
  isConsumable: boolean;
  lastUpdated: string;
  description?: string;
  history: AuditEntry[]; 
}

// Tipe untuk tabel 'material_transactions' (Ledger Umum)
export interface MaterialTransaction {
  id: number;
  materialNo: string;
  type: 'IN' | 'OUT';
  quantity: number;
  date: string;
  referenceId?: string; // Bisa Issue Number atau ID lain
  remarks?: string;
  createdAt: string;
}

// Tipe untuk tabel 'material_out' (Detail Outbound)
export interface MaterialOutRecord {
  id: number;
  materialNo: string;
  materialDesc: string;
  quantity: number;
  uom: string;
  date: string;
  sloc: string;
  goodReceipt: string; // Receiver
  remarks?: string;
  createdAt: string;
  issueNumber: string;
  wbs?: string;
  glNumber?: string;
  glAccount?: string;
  keterangan?: string;
}

export interface MaterialInRecord {
  id: number;
  materialNo: string;     // material_no
  materialDesc: string;   // material_desc
  quantity: number;
  uom: string;
  sloc: string;
  date: string;
  grNumber: string;       // gr_number
  wbs?: string;
  goodReceipt: string;    // good_receipt (Receiver)
  po?: string;            // po
  reference?: string;     // reference
  remarks?: string;
  createdAt?: string;
}

// Tipe Gabungan untuk UI
export interface TransactionLog {
  id: string;
  materialNo: string;
  itemName: string;
  sku: string;
  type: 'IN' | 'OUT';
  quantity: number;
  date: string;
  status: string;
  
  // Field Outbound
  issueNumber?: string;
  wbs?: string;
  glAccount?: string;
  glNumber?: string;
  
  // Field Inbound Baru
  grNumber?: string;      // GR Number
  po?: string;            // Purchase Order
  reference?: string;     // Reference doc
  
  // Shared Fields
  receiver?: string;      // good_receipt
  remark?: string;
  sloc?: string;
}

export interface PurchaseOrder {
  id: string;
  itemId: string;
  itemName: string;
  quantity: number;
  orderDate: string;
  status: 'ORDERED' | 'RECEIVED' | 'CANCELLED';
  supplier?: string;
  totalCost: number;
}

export interface StockOpnameSession {
  id: string;
  title: string;
  status: 'OPEN' | 'COMPLETED' | 'CANCELLED';
  creator: string;
  notes?: string;
  totalItems: number;
  createdAt: string;
  closedAt?: string;
}

export interface StockOpnameItem {
  id: string;
  sessionId: string;
  materialNo: string;
  sloc: string;
  materialDesc: string;
  systemQty: number;
  physicalQty: number;
  variance: number;
  isCounted: boolean;
}

export interface AIAnalysisResult {
  summary: string;
  warnings: string[];
  recommendations: string[];
}

export interface AISuggestion {
  category: string;
  description: string;
  suggestedPrice: number;
}

export type UserRole = 'ADMIN' | 'STAFF' | 'USER';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: 'ACTIVE' | 'INACTIVE';
  lastActive?: string;
  avatar?: string;
}

export interface AppSettings {
  supabaseUrl: string;
  supabaseKey: string;
  enableRealtime: boolean;
}