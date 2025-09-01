export class Storage {
    constructor() {
        this.dbName = 'TheListDB';
        this.dbVersion = 1;
        this.db = null;
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                this.createStores(db);
                this.addSampleData(db);
            };
        });
    }

    createStores(db) {
        // Items store
        if (!db.objectStoreNames.contains('items')) {
            const itemStore = db.createObjectStore('items', { keyPath: 'id' });
            itemStore.createIndex('name1', 'name1', { unique: false });
            itemStore.createIndex('name2', 'name2', { unique: false });
            itemStore.createIndex('name3', 'name3', { unique: false });
            itemStore.createIndex('mode', 'mode', { unique: false });
        }
        
        // Bills store (maximum 20, immutable)
        if (!db.objectStoreNames.contains('bills')) {
            const billStore = db.createObjectStore('bills', { keyPath: 'id' });
            billStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
        
        // Settings store
        if (!db.objectStoreNames.contains('settings')) {
            db.createObjectStore('settings', { keyPath: 'key' });
        }
    }

    addSampleData(db) {
        const transaction = db.transaction(['items'], 'readwrite');
        const store = transaction.objectStore('items');
        
        const sampleItems = [
            {
                id: 1,
                name1: 'چکن رول', // Urdu
                name2: 'ಚಿಕನ್ ರೋಲ್', // Kannada  
                name3: 'Chicken Roll', // English
                mode: 'PKG',
                cost: 25,
                price: 35,
                chips: [],
                showNameIdx: 0
            },
            {
                id: 2,
                name1: 'بیف برگر',
                name2: 'ಬೀಫ್ ಬರ್ಗರ್', 
                name3: 'Beef Burger',
                mode: 'MRP',
                cost: 40,
                price: 60,
                chips: [{ type: 'price', value: 60, label: '₹60' }],
                showNameIdx: 0
            }
        ];
        
        sampleItems.forEach(item => store.add(item));
    }

    // Item operations
    async saveItem(item) {
        const itemData = {
            ...item,
            id: item.id || Date.now() + Math.random(),
            timestamp: new Date().toISOString()
        };
        return this.save('items', itemData);
    }

    async getItems() {
        return this.getAll('items');
    }

    async getItem(id) {
        return this.get('items', id);
    }

    async deleteItem(id) {
        return this.delete('items', id);
    }

    // Bill operations (maximum 20 bills)
    async saveBill(bill) {
        const bills = await this.getBills();
        
        // Remove oldest if we have 20
        if (bills.length >= 20) {
            const oldest = bills.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))[0];
            await this.delete('bills', oldest.id);
        }
        
        const billData = {
            ...bill,
            id: Date.now(),
            timestamp: new Date().toISOString()
        };
        
        return this.save('bills', billData);
    }

    async getBills() {
        const bills = await this.getAll('bills');
        return bills.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }

    async clearBills() {
        const transaction = this.db.transaction(['bills'], 'readwrite');
        return transaction.objectStore('bills').clear();
    }

    // Settings operations
    async saveSetting(key, value) {
        return this.save('settings', { key, value });
    }

    async getSetting(key) {
        const result = await this.get('settings', key);
        return result ? result.value : null;
    }

    // Generic CRUD operations
    async save(storeName, data) {
        const transaction = this.db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        return new Promise((resolve, reject) => {
            const request = store.put(data);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async get(storeName, id) {
        const transaction = this.db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        return new Promise((resolve, reject) => {
            const request = store.get(id);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getAll(storeName) {
        const transaction = this.db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async delete(storeName, id) {
        const transaction = this.db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        return new Promise((resolve, reject) => {
            const request = store.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    // Export/Import for backup
    async exportData() {
        const [items, bills, settings] = await Promise.all([
            this.getAll('items'),
            this.getAll('bills'),
            this.getAll('settings')
        ]);
        
        return {
            version: this.dbVersion,
            timestamp: new Date().toISOString(),
            items,
            bills,
            settings
        };
    }

    async importData(data) {
        if (!data.items || !Array.isArray(data.items)) {
            throw new Error('Invalid data format');
        }
        
        const transaction = this.db.transaction(['items', 'bills', 'settings'], 'readwrite');
        
        // Clear existing data
        await Promise.all([
            transaction.objectStore('items').clear(),
            transaction.objectStore('bills').clear(),
            transaction.objectStore('settings').clear()
        ]);
        
        // Import new data
        const itemStore = transaction.objectStore('items');
        const billStore = transaction.objectStore('bills');
        const settingStore = transaction.objectStore('settings');
        
        data.items.forEach(item => itemStore.add(item));
        if (data.bills) data.bills.forEach(bill => billStore.add(bill));
        if (data.settings) data.settings.forEach(setting => settingStore.add(setting));
        
        return new Promise((resolve, reject) => {
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });
    }
}
