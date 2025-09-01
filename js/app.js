import { Storage } from './storage.js';
import { Calculator } from './calculator.js';
import { Search } from './search.js';
import { Items } from './items.js';
import { Navigation } from './navigation.js';
import { Utils } from './utils.js';

class TheListApp {
    constructor() {
        this.storage = new Storage();
        this.calculator = new Calculator(this.storage);
        this.search = new Search(this.storage, this.calculator);
        this.items = new Items(this.storage);
        this.navigation = new Navigation();
        
        this.state = {
            currentBill: { lines: [], total: 0, qty: 0 },
            theme: 'dark',
            miniTotal: 0,
            miniSubs: new Set()
        };
    }

    async init() {
        try {
            await this.storage.init();
            await this.loadSettings();
            this.initComponents();
            this.setupEventListeners();
            this.setupServiceWorker();
            console.log('The List app initialized successfully');
        } catch (error) {
            console.error('App initialization failed:', error);
        }
    }

    async loadSettings() {
        const theme = await this.storage.getSetting('theme') || 'dark';
        this.applyTheme(theme);
        document.getElementById('themeToggle').checked = theme === 'dark';
    }

    initComponents() {
        this.calculator.init();
        this.search.init();
        this.items.init();
        this.navigation.init();
    }

    setupEventListeners() {
        // Header buttons
        document.getElementById('menuBtn').addEventListener('click', () => {
            this.navigation.togglePanel('hamburgerPanel');
        });
        
        document.getElementById('clearBtn').addEventListener('click', () => {
            this.calculator.clearBill();
        });
        
        document.getElementById('saveBtn').addEventListener('click', () => {
            this.calculator.saveBill();
        });

        // Menu items
        document.querySelectorAll('.menu-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.target.dataset.action;
                this.handleMenuAction(action);
            });
        });

        // Theme toggle
        document.getElementById('themeToggle').addEventListener('change', (e) => {
            this.applyTheme(e.target.checked ? 'dark' : 'light');
        });

        // Search
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.search.handleFooterSearch(e.target.value);
        });

        document.getElementById('backspaceBtn').addEventListener('click', () => {
            const input = document.getElementById('searchInput');
            input.value = input.value.slice(0, -1);
            this.search.handleFooterSearch(input.value);
        });

        // FAB
        document.getElementById('fabBtn').addEventListener('click', () => {
            this.navigation.openPage('createItemPage');
            this.items.resetForm();
        });

        // Back buttons
        document.getElementById('backToMain').addEventListener('click', () => {
            this.navigation.openPage('mainPage');
        });

        document.getElementById('backToMainFromList').addEventListener('click', () => {
            this.navigation.openPage('mainPage');
        });

        document.getElementById('backToMainFromBills').addEventListener('click', () => {
            this.navigation.openPage('mainPage');
        });

        // Backdrop
        document.getElementById('backdrop').addEventListener('click', () => {
            this.navigation.closeAll();
        });

        // Keyboard handling
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.navigation.closeAll();
            }
        });

        // Visual Viewport API for keyboard awareness
        this.setupKeyboardHandling();
    }

    setupKeyboardHandling() {
        if (window.visualViewport) {
            const vv = window.visualViewport;
            const updateViewport = () => {
                const keyboardHeight = Math.max(0, window.innerHeight - vv.height);
                document.documentElement.style.setProperty('--keyboard-height', `${keyboardHeight}px`);
            };
            
            vv.addEventListener('resize', updateViewport);
            vv.addEventListener('scroll', updateViewport);
        }
    }

    handleMenuAction(action) {
        this.navigation.closeAll();
        
        switch (action) {
            case 'billRecords':
                this.navigation.openPage('billRecordsPage');
                this.loadBillRecords();
                break;
            case 'viewItems':
                this.navigation.openPage('itemListPage');
                this.items.loadItemList();
                break;
            case 'settings':
                this.showToast('Settings coming soon!');
                break;
        }
    }

    async loadBillRecords() {
        const bills = await this.storage.getBills();
        const container = document.getElementById('billRecordsContainer');
        
        if (bills.length === 0) {
            container.innerHTML = '<div class="empty-state">No saved bills</div>';
            return;
        }

        container.innerHTML = bills.map(bill => `
            <div class="bill-record">
                <div class="record-header">
                    <span class="record-total">${Utils.formatMoney(bill.total)}</span>
                    <span class="record-qty">${bill.qty} items</span>
                    <span class="record-time">${Utils.formatTime(bill.timestamp)}</span>
                </div>
            </div>
        `).join('');
    }

    setupServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('./sw.js')
                .catch(error => console.log('SW registration failed:', error));
        }
    }

    applyTheme(theme) {
        document.body.className = `${theme}-theme`;
        this.state.theme = theme;
        this.storage.saveSetting('theme', theme);
    }

    showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => toast.remove(), 3000);
    }
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    window.app = new TheListApp();
    window.app.init();
});
