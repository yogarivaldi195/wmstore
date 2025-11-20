import { supabase } from '../lib/supabaseClient';
import { 
  InventoryItem, 
  TransactionLog, 
  PurchaseOrder, 
  UserProfile, 
  UserRole, 
  StockOpnameSession, 
  StockOpnameItem,
  MaterialOutRecord 
} from '../types';

// Helper: Membuat ID komposit untuk item unik (Material No + Lokasi)
const generateId = (materialNo: string, sloc: string) => `${materialNo}:::${sloc}`;

// ==========================================
// 1. INVENTORY API (stock_items)
// ==========================================
export const inventoryApi = {
  // Mengambil semua data stok beserta riwayat audit terakhirnya
  async fetchAll(): Promise<InventoryItem[]> {
    // Fetch Master Data
    const { data: itemsData, error: itemsError } = await supabase
      .from('stock_items')
      .select('*')
      .order('updated_at', { ascending: false });

    if (itemsError) {
      console.error('Error fetching stock_items:', itemsError.message);
      return [];
    }

    // Fetch History Log (Limit 500 untuk performa)
    const { data: historyData } = await supabase
      .from('stock_history')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500); 

    // Map data database ke format aplikasi
    return itemsData.map((item: any) => {
      const compositeId = generateId(item.material_no, item.sloc);
      
      // Filter history spesifik untuk item ini
      const itemHistory = historyData
        ?.filter((h: any) => h.material_no === item.material_no && h.sloc === item.sloc)
        .map((h: any) => ({
          date: new Date(h.created_at).toLocaleString(),
          user: h.user_name || 'System',
          action: h.action,
          details: h.details
        })) || [];

      return {
        id: compositeId,
        materialNo: item.material_no,
        sloc: item.sloc,
        name: item.material_desc || 'Unknown Item',
        description: item.material_desc,
        quantity: item.quantity,
        uom: item.uom || 'PCS',
        price: item.price,
        pricePerUnit: item.price_per_unit,
        rackNo: item.rack_no,
        category: item.operational_class || 'General',
        minStock: item.minimum_stock,
        maxStock: item.maximum_stock,
        prStatus: item.pr_status,
        prNumber: item.pr_number,
        wbs: item.wbs,
        isConsumable: item.is_consumable,
        lastUpdated: item.updated_at,
        history: itemHistory
      };
    });
  },

  // Membuat Item Baru
  async create(item: InventoryItem): Promise<InventoryItem | null> {
    const { error } = await supabase
      .from('stock_items')
      .insert([{
        material_no: item.materialNo,
        sloc: item.sloc,
        material_desc: item.name,
        quantity: item.quantity,
        uom: item.uom,
        price: item.price,
        price_per_unit: item.price, 
        rack_no: item.rackNo,
        operational_class: item.category,
        minimum_stock: item.minStock,
        maximum_stock: item.maxStock, 
        pr_status: item.prStatus,     
        pr_number: item.prNumber,     
        wbs: item.wbs,                
        is_consumable: item.isConsumable,
        updated_at: new Date().toISOString()
      }]);

    if (error) {
      console.error('Error creating stock item:', error.message);
      return null;
    }

    // Catat History Pembuatan
    await supabase.from('stock_history').insert({
      material_no: item.materialNo,
      sloc: item.sloc,
      user_name: 'System',
      action: 'CREATED',
      details: 'Initial Stock Entry'
    });

    return item;
  },

  // Update Data Item
  async update(item: InventoryItem): Promise<boolean> {
    const { error } = await supabase
      .from('stock_items')
      .update({
        material_desc: item.name,
        quantity: item.quantity,
        price: item.price,
        price_per_unit: item.price, 
        rack_no: item.rackNo,
        operational_class: item.category,
        minimum_stock: item.minStock,
        maximum_stock: item.maxStock, 
        pr_status: item.prStatus,     
        pr_number: item.prNumber,     
        wbs: item.wbs,                
        is_consumable: item.isConsumable,
        updated_at: new Date().toISOString()
      })
      .eq('material_no', item.materialNo)
      .eq('sloc', item.sloc);

    if (error) {
      console.error('Error updating stock item:', error.message);
      return false;
    }
    
    // History log ditangani di sisi UI sebelum memanggil API ini, 
    // atau bisa ditambahkan di sini jika perlu pencatatan otomatis setiap update.
    return true;
  },

  // Hapus Item
  async delete(id: string): Promise<boolean> {
    const [materialNo, sloc] = id.split(':::');
    const { error } = await supabase
        .from('stock_items')
        .delete()
        .eq('material_no', materialNo)
        .eq('sloc', sloc);
        
    if (error) {
        console.error('Error deleting stock item:', error.message);
        return false;
    }
    return true;
  }
};

// ==========================================
// 2. TRANSACTION API (material_out & material_transactions)
// ==========================================
export const transactionApi = {
  
  // Mengambil semua transaksi (Gabungan IN dan OUT)
  async fetchAll(): Promise<TransactionLog[]> {
    const results: TransactionLog[] = [];

    // A. Ambil Detail Outbound dari tabel `material_out`
    const { data: outData, error: outError } = await supabase
      .from('material_out')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!outError && outData) {
      outData.forEach((row: any) => {
        results.push({
          id: `OUT-${row.id}`,
          materialNo: row.material_no,
          itemName: row.material_desc,
          sku: row.material_no, // Alias
          type: 'OUT',
          quantity: Number(row.quantity),
          date: row.date, // Format: YYYY-MM-DD
          status: 'COMPLETED',
          
          // Field Spesifik Outbound
          issueNumber: row.issue_number,
          wbs: row.wbs,
          glAccount: row.gl_account,
          glNumber: row.gl_number,
          receiver: row.good_receipt,
          remark: row.remarks,
          sloc: row.sloc
        });
      });
    }

    // B. Ambil Data Inbound dari tabel `material_transactions` (Type = IN)
    // Kita hanya ambil IN dari sini karena OUT sudah diambil detailnya dari tabel A
    const { data: txData, error: txError } = await supabase
      .from('material_transactions')
      .select('*')
      .eq('type', 'IN') 
      .order('created_at', { ascending: false });

    if (!txError && txData) {
      txData.forEach((row: any) => {
        results.push({
          id: `IN-${row.id}`,
          materialNo: row.material_no,
          itemName: 'Material In', // Nama default, idealnya di-join dengan master data
          sku: row.material_no,
          type: 'IN',
          quantity: Number(row.quantity),
          date: new Date(row.date).toISOString().split('T')[0],
          status: 'COMPLETED',
          remark: row.remarks
        });
      });
    }

    // Urutkan gabungan berdasarkan tanggal terbaru
    return results.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },

  // Membuat Transaksi Outbound Baru (Update 3 Tabel)
  async createOutbound(data: MaterialOutRecord): Promise<boolean> {
    try {
      // 1. Insert Detail ke `material_out`
      const { error: outError } = await supabase
        .from('material_out')
        .insert([{
           material_no: data.materialNo,
           material_desc: data.materialDesc,
           quantity: data.quantity,
           uom: data.uom,
           date: data.date,
           sloc: data.sloc,
           good_receipt: data.goodReceipt,
           remarks: data.remarks,
           created_at: new Date().toISOString(),
           issue_number: data.issueNumber,
           wbs: data.wbs,
           gl_number: data.glNumber,
           gl_account: data.glAccount,
           keterangan: data.keterangan
        }]);

      if (outError) throw outError;

      // 2. Insert Log ke `material_transactions` (Buku Besar)
      const { error: txError } = await supabase
        .from('material_transactions')
        .insert([{
          material_no: data.materialNo,
          type: 'OUT',
          quantity: data.quantity,
          date: new Date().toISOString(),
          reference_id: data.issueNumber, 
          remarks: `Outbound to ${data.goodReceipt} - ${data.remarks}`,
          created_at: new Date().toISOString()
        }]);

      if (txError) throw txError;

      // 3. Kurangi Stok di `stock_items`
      // Catatan: Di aplikasi nyata, lebih baik menggunakan RPC (Stored Procedure) agar atomik
      // Tapi untuk implementasi client-side ini, kita lakukan fetch-update manual atau asumsi UI sudah kirim data update
      
      // Kita panggil update stok via Inventory API logic di UI Component (Transactions.tsx)
      // atau lakukan update manual di sini jika ingin strict backend logic:
      /*
      const { data: currentItem } = await supabase
        .from('stock_items')
        .select('quantity')
        .eq('material_no', data.materialNo)
        .eq('sloc', data.sloc)
        .single();
        
      if (currentItem) {
         await supabase.from('stock_items')
           .update({ quantity: currentItem.quantity - data.quantity })
           .eq('material_no', data.materialNo)
           .eq('sloc', data.sloc);
      }
      */

      return true;
    } catch (err) {
      console.error("Failed to create outbound transaction:", err);
      return false;
    }
  },

  // Placeholder untuk update/delete (jika diperlukan nanti)
  async update(tx: TransactionLog): Promise<boolean> { return true; },
  async delete(id: string): Promise<boolean> { return true; }
};

// ==========================================
// 3. PURCHASE ORDER API
// ==========================================
export const purchaseApi = {
    async fetchAll(): Promise<PurchaseOrder[]> {
        const { data, error } = await supabase.from('purchase_orders').select('*').order('created_at', { ascending: false });
        if(error) return [];
        
        return (data || []).map((p: any) => ({
            id: p.id,
            itemId: p.item_id,
            itemName: p.item_name,
            quantity: p.quantity,
            orderDate: p.order_date,
            status: p.status,
            supplier: p.supplier,
            totalCost: p.total_cost
        }));
    },

    async create(po: PurchaseOrder): Promise<PurchaseOrder | null> {
        const { data, error } = await supabase.from('purchase_orders').insert([{
            item_id: po.itemId,
            item_name: po.itemName,
            quantity: po.quantity,
            order_date: po.orderDate,
            status: po.status,
            supplier: po.supplier,
            total_cost: po.totalCost
        }]).select().single();

        if(error) return null;
        return { ...po, id: data.id };
    },

    async updateStatus(id: string, status: 'RECEIVED' | 'CANCELLED'): Promise<boolean> {
        const { error } = await supabase.from('purchase_orders').update({ status }).eq('id', id);
        return !error;
    }
};

// ==========================================
// 4. USER MANAGEMENT API
// ==========================================
export const userApi = {
    async fetchAll(): Promise<UserProfile[]> {
        const { data, error } = await supabase.from('user_profiles').select('*');
        if(error) return [];
        
        return (data || []).map((u: any) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role as UserRole,
            status: u.status,
            lastActive: u.last_active,
            avatar: u.avatar
        }));
    },

    async getByEmail(email: string): Promise<UserProfile | null> {
        const { data, error } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('email', email)
            .maybeSingle(); 
        
        if (error || !data) return null;

        return {
            id: data.id,
            name: data.name,
            email: data.email,
            role: data.role as UserRole,
            status: data.status,
            lastActive: data.last_active,
            avatar: data.avatar
        };
    },

    async create(user: UserProfile): Promise<UserProfile | null> {
        const { data, error } = await supabase.from('user_profiles').insert([{
            name: user.name,
            email: user.email,
            role: user.role,
            status: user.status,
            last_active: user.lastActive
        }]).select().single();

        if(error) {
            // Handle duplicate
            if (error.code === '23505') return userApi.getByEmail(user.email);
            return null;
        }
        return { ...user, id: data.id };
    },

    async update(user: UserProfile): Promise<boolean> {
        const { error } = await supabase.from('user_profiles').update({
            name: user.name,
            email: user.email,
            role: user.role,
            status: user.status,
            last_active: user.lastActive
        }).eq('id', user.id);
        return !error;
    },

    async delete(id: string): Promise<boolean> {
        const { error } = await supabase.from('user_profiles').delete().eq('id', id);
        return !error;
    }
};

// ==========================================
// 5. STOCK OPNAME API
// ==========================================
export const stockOpnameApi = {
    async fetchSessions(): Promise<StockOpnameSession[]> {
        const { data, error } = await supabase
            .from('stock_opname_sessions')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) return [];
        return data.map((s: any) => ({
            id: s.id,
            title: s.title,
            status: s.status,
            creator: s.creator,
            notes: s.notes,
            totalItems: s.total_items,
            createdAt: s.created_at,
            closedAt: s.closed_at
        }));
    },

    async createSession(title: string, notes: string, creatorName: string): Promise<StockOpnameSession | null> {
        // 1. Create Header
        const { data: session, error: sessionError } = await supabase
            .from('stock_opname_sessions')
            .insert([{
                title,
                status: 'OPEN',
                creator: creatorName,
                notes,
                created_at: new Date().toISOString()
            }])
            .select()
            .single();

        if (sessionError || !session) return null;

        // 2. Snapshot Items (Ambil semua stok saat ini)
        const { data: inventory } = await supabase.from('stock_items').select('*');
        if (!inventory) return null;

        // 3. Siapkan Data Snapshot
        const snapshotItems = inventory.map((item: any) => ({
            session_id: session.id,
            material_no: item.material_no,
            sloc: item.sloc,
            material_desc: item.material_desc,
            system_qty: item.quantity,
            physical_qty: 0, 
            is_counted: false
        }));

        // 4. Bulk Insert (Chunking untuk keamanan)
        const chunkSize = 100;
        for (let i = 0; i < snapshotItems.length; i += chunkSize) {
            await supabase.from('stock_opname_items').insert(snapshotItems.slice(i, i + chunkSize));
        }

        // 5. Update total count di header
        await supabase.from('stock_opname_sessions')
            .update({ total_items: snapshotItems.length })
            .eq('id', session.id);

        return {
            id: session.id,
            title: session.title,
            status: session.status,
            creator: session.creator,
            notes: session.notes,
            totalItems: snapshotItems.length,
            createdAt: session.created_at
        };
    },

    async fetchSessionItems(
        sessionId: string, 
        page: number = 1, 
        pageSize: number = 20,
        searchTerm: string = '', 
        statusFilter: 'ALL' | 'COUNTED' | 'UNCOUNTED' = 'ALL'
    ): Promise<{ items: StockOpnameItem[], total: number }> {
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        let query = supabase
            .from('stock_opname_items')
            .select('*', { count: 'exact' })
            .eq('session_id', sessionId);

        if (searchTerm) {
            query = query.or(`material_desc.ilike.%${searchTerm}%,material_no.ilike.%${searchTerm}%`);
        }

        if (statusFilter === 'COUNTED') query = query.eq('is_counted', true);
        else if (statusFilter === 'UNCOUNTED') query = query.eq('is_counted', false);

        const { data, error, count } = await query.order('material_desc', { ascending: true }).range(from, to);

        if (error) return { items: [], total: 0 };

        const items = data.map((item: any) => ({
            id: item.id,
            sessionId: item.session_id,
            materialNo: item.material_no,
            sloc: item.sloc,
            materialDesc: item.material_desc,
            systemQty: Number(item.system_qty),
            physicalQty: Number(item.physical_qty),
            variance: Number(item.system_qty) - Number(item.physical_qty), 
            isCounted: item.is_counted
        }));

        return { items, total: count || 0 };
    },

    // Stats ringan (Head Request)
    async fetchSessionStats(sessionId: string) {
        const { count: total } = await supabase
            .from('stock_opname_items')
            .select('*', { count: 'exact', head: true })
            .eq('session_id', sessionId);

        const { count: counted } = await supabase
            .from('stock_opname_items')
            .select('*', { count: 'exact', head: true })
            .eq('session_id', sessionId)
            .eq('is_counted', true);

        const { count: varianceCount } = await supabase
            .from('stock_opname_items')
            .select('*', { count: 'exact', head: true })
            .eq('session_id', sessionId)
            .eq('is_counted', true)
            .neq('variance', 0);

        return {
            total: total || 0,
            counted: counted || 0,
            matched: (counted || 0) - (varianceCount || 0),
            variance: varianceCount || 0
        };
    },

    async updateCount(itemId: string, qty: number): Promise<boolean> {
        const { error } = await supabase
            .from('stock_opname_items')
            .update({ physical_qty: qty, is_counted: true })
            .eq('id', itemId);
        return !error;
    },
    
    async fetchAllSessionItems(sessionId: string): Promise<StockOpnameItem[]> {
         const { data, error } = await supabase
            .from('stock_opname_items')
            .select('*')
            .eq('session_id', sessionId)
            .order('material_desc', { ascending: true });

        if (error || !data) return [];

        return data.map((item: any) => ({
            id: item.id,
            sessionId: item.session_id,
            materialNo: item.material_no,
            sloc: item.sloc,
            materialDesc: item.material_desc,
            systemQty: Number(item.system_qty),
            physicalQty: Number(item.physical_qty),
            variance: Number(item.system_qty) - Number(item.physical_qty), 
            isCounted: item.is_counted
        }));
    },

    async finalizeSession(sessionId: string, items: StockOpnameItem[]): Promise<boolean> {
        // 1. Reconcile (Update Stok Asli berdasarkan hasil Opname)
        const { data: variances } = await supabase
            .from('stock_opname_items')
            .select('*')
            .eq('session_id', sessionId)
            .eq('is_counted', true);

        if (variances) {
            for (const v of variances) {
                if (Number(v.physical_qty) !== Number(v.system_qty)) {
                    // Update Master Stok
                    await supabase.from('stock_items')
                        .update({ quantity: v.physical_qty, updated_at: new Date().toISOString() })
                        .eq('material_no', v.material_no)
                        .eq('sloc', v.sloc);
                    
                    // Catat History Reconcile
                    await supabase.from('stock_history').insert({
                        material_no: v.material_no,
                        sloc: v.sloc,
                        user_name: 'StockOpname',
                        action: 'RECONCILE',
                        details: `System: ${v.system_qty} -> Physical: ${v.physical_qty}`
                    });
                }
            }
        }

        // 2. Tutup Session
        const { error } = await supabase
            .from('stock_opname_sessions')
            .update({ status: 'COMPLETED', closed_at: new Date().toISOString() })
            .eq('id', sessionId);

        return !error;
    }
};