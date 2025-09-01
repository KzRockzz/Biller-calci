import { Utils } from './utils.js';

export class Calculator {
    constructor(storage) {
        this.storage = storage;
        this.currentBill = { lines: [], total: 0, qty: 0 };
        this.container = null;
    }

    init() {
        this.container = document.getElementById('billContainer');
        this.render();
        this.setupEventListeners();
    }

    // Add item to bill using mini-total priority
    addItem(itemName, amount, itemClass = '') {
        if (!amount || amount <= 0) return;
        
        const roundedAmount = Utils.rupeeRound(amount);
        
        this.currentBill.lines.push({
            id: Utils.generateId(),
            itemName,
            amount: roundedAmount,
            itemClass,
            showNameIdx: 0 // Per-bill-line name cycling
        });
        
        this.updateTotals();
        this.render();
        this.showToast('Item added to bill');
    }

    // Remove individual bill line (Figure 1, small x button)
    removeItem(lineId) {
        this.currentBill.lines = this.currentBill.lines.filter(
            line => line.id !== lineId
        );
        this.updateTotals();
        this.render();
    }

    // Clear entire bill (Figure 1, C button with confirmation)
    clearBill() {
        if (this.currentBill.lines.length === 0) return;
        
        this.showConfirmation('Clear Bill?', 'This will remove all items from the current bill.', () => {
            this.currentBill = { lines: [], total: 0, qty: 0 };
            this.render();
        });
    }

    // Save bill to immutable history (Figure 1, Save button)
    async saveBill() {
        if (this.currentBill.lines.length === 0) {
            this.showToast('Nothing to save');
            return;
        }
        
        try {
            await this.storage.saveBill({ ...this.currentBill });
            this.currentBill = { lines: [], total: 0, qty: 0 };
            this.render();
            this.showToast('Bill saved to history');
        } catch (error) {
            this.showToast('Failed to save bill');
        }
    }

    updateTotals() {
        this.currentBill.total = this.currentBill.lines.reduce(
            (sum, line) => sum + line.amount, 0
        );
        this.currentBill.qty = this.currentBill.lines.length;
        this.updateHeaderDisplay();
    }

    updateHeaderDisplay() {
        const totalEl = document.getElementById('grandTotal');
        const qtyEl = document.getElementById('qtyDisplay');
        
        if (totalEl) {
            totalEl.innerHTML = Utils.formatMoney(this.currentBill.total);
        }
        
        if (qtyEl) {
            qtyEl.textContent = `qty. ${this.currentBill.qty}`;
        }
    }

    render() {
        if (!this.container) return;
        
        if (this.currentBill.lines.length === 0) {
            this.container.innerHTML = `
                <div class="empty-state">
                    <p>Your bill is empty</p>
                    <p>Search for items below to get started</p>
                </div>
            `;
        } else {
            this.container.innerHTML = this.currentBill.lines.map(line => `
                <div class="bill-line">
                    <span class="item-name ${line.itemClass}">${line.itemName}</span>
                    <button class="delete-btn" data-line-id="${line.id}">×</button>
                    <span class="line-amount">${Utils.formatMoney(line.amount)}</span>
                </div>
            `).join('');
        }
        
        this.updateHeaderDisplay();
    }

    setupEventListeners() {
        if (!this.container) return;
        
        // Event delegation for delete buttons
        this.container.addEventListener('click', (e) => {
            if (e.target.classList.contains('delete-btn')) {
                const lineId = parseFloat(e.target.dataset.lineId);
                this.removeItem(lineId);
            }
        });
    }

    showConfirmation(title, message, onConfirm) {
        const modal = document.getElementById('modalContainer');
        modal.innerHTML = `
            <div class="modal">
                <div class="modal-content">
                    <h3>${title}</h3>
                    <p>${message}</p>
                    <div class="modal-actions">
                        <button class="btn-secondary" onclick="this.closest('.modal-container').innerHTML=''">Cancel</button>
                        <button class="btn-primary" onclick="this.closest('.modal-container').innerHTML=''; (${onConfirm})()">OK</button>
                    </div>
                </div>
            </div>
        `;
        modal.style.display = 'flex';
    }

    showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => toast.remove(), 3000);
    }
}
