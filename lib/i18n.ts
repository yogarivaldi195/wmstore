
export type Language = 'en' | 'id' | 'jp';

export const translations = {
  en: {
    // Sidebar
    dashboard: "Dashboard",
    inventory: "Inventory",
    purchase: "Purchase",
    stockOpname: "Stock Opname",
    transactions: "Transactions",
    users: "User Access",
    intelligence: "AI Intelligence",
    settings: "Settings",
    logout: "LOGOUT",
    
    // Dashboard
    commandCenter: "Command Center",
    liveStream: "Live Telemetry Stream",
    totalStock: "Total Stock",
    assetValue: "Asset Value",
    criticalItems: "Critical Items",
    activeSKUs: "Active SKUs",
    flowAnalytics: "Flow Analytics",
    composition: "Composition",

    // Inventory
    stockMaster: "Stock Master Data",
    addMaterial: "ADD MATERIAL",
    smartSearch: "Smart Search (e.g. 'Cable 2.5mm')",
    lowStock: "Low Stock",
    matInfo: "Material Info",
    ident: "Identification",
    location: "Location (SLOC)",
    status: "Stock Status",
    valuation: "Valuation",
    actions: "Actions",
    
    // Alerts
    reorderAlert: "Reorder Alert",
    itemsNeedRestock: "items are below minimum stock level.",
    oneClickPR: "One-Click Auto Restock",
    creatingPR: "Creating PRs...",
    
    // Modals & Forms
    createEntry: "Create Material Entry",
    updateEntry: "Update Material Master",
    cancel: "Cancel",
    save: "Save",
    
    // Common
    loading: "Loading...",
    success: "Success"
  },
  id: {
    // Sidebar
    dashboard: "Dasbor",
    inventory: "Inventaris",
    purchase: "Pembelian",
    stockOpname: "Stok Opname",
    transactions: "Transaksi",
    users: "Akses Pengguna",
    intelligence: "Kecerdasan AI",
    settings: "Pengaturan",
    logout: "KELUAR",

    // Dashboard
    commandCenter: "Pusat Komando",
    liveStream: "Aliran Telemetri Langsung",
    totalStock: "Total Stok",
    assetValue: "Nilai Aset",
    criticalItems: "Item Kritis",
    activeSKUs: "SKU Aktif",
    flowAnalytics: "Analisis Aliran",
    composition: "Komposisi",

    // Inventory
    stockMaster: "Data Induk Stok",
    addMaterial: "TAMBAH MATERIAL",
    smartSearch: "Pencarian Pintar (mis. 'Kabel 2.5mm')",
    lowStock: "Stok Rendah",
    matInfo: "Info Material",
    ident: "Identifikasi",
    location: "Lokasi (SLOC)",
    status: "Status Stok",
    valuation: "Valuasi",
    actions: "Aksi",

    // Alerts
    reorderAlert: "Peringatan Stok Ulang",
    itemsNeedRestock: "barang berada di bawah batas minimum.",
    oneClickPR: "Auto Restock Sekali Klik",
    creatingPR: "Membuat PR...",

    // Modals & Forms
    createEntry: "Buat Entri Material",
    updateEntry: "Perbarui Data Master",
    cancel: "Batal",
    save: "Simpan",

    // Common
    loading: "Memuat...",
    success: "Sukses"
  },
  jp: {
    // Sidebar
    dashboard: "ダッシュボード",
    inventory: "在庫管理",
    purchase: "購買管理",
    stockOpname: "棚卸",
    transactions: "入出庫履歴",
    users: "ユーザー管理",
    intelligence: "AI分析",
    settings: "設定",
    logout: "ログアウト",

    // Dashboard
    commandCenter: "コマンドセンター",
    liveStream: "ライブテレメトリ",
    totalStock: "総在庫数",
    assetValue: "資産価値",
    criticalItems: "要注意品目",
    activeSKUs: "アクティブSKU",
    flowAnalytics: "フロー分析",
    composition: "在庫構成",

    // Inventory
    stockMaster: "在庫マスターデータ",
    addMaterial: "資材追加",
    smartSearch: "スマート検索 (例: 'ケーブル 2.5mm')",
    lowStock: "在庫不足",
    matInfo: "資材情報",
    ident: "識別ID",
    location: "保管場所 (SLOC)",
    status: "在庫状況",
    valuation: "評価額",
    actions: "操作",

    // Alerts
    reorderAlert: "発注アラート",
    itemsNeedRestock: "個のアイテムが最低在庫を下回っています。",
    oneClickPR: "ワンクリック自動発注",
    creatingPR: "PR作成中...",

    // Modals & Forms
    createEntry: "新規資材登録",
    updateEntry: "マスター更新",
    cancel: "キャンセル",
    save: "保存",

    // Common
    loading: "読み込み中...",
    success: "成功"
  }
};
