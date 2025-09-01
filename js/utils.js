export class Utils {
    // Rupee rounding: paise ≥ 90 rounds up to next rupee
    static rupeeRound(amount) {
        const num = Number(amount) || 0;
        const rupees = Math.floor(num);
        const paise = Math.round((num - rupees) * 100);
        return paise >= 90 ? rupees + 1 : rupees;
    }

    static formatMoney(amount) {
        const rounded = this.rupeeRound(amount);
        return `₹${rounded}<span class="decimals">.00</span>`;
    }

    static formatTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('en-IN', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }

    // Name display priority: Name1 (Urdu) → Name3 (English) → Name2 (Kannada)
    static displayNameOf(item) {
        if (item.name1?.trim()) return item.name1;
        if (item.name3?.trim()) return item.name3;
        if (item.name2?.trim()) return item.name2;
        return 'Unnamed Item';
    }

    static getItemNameClass(item) {
        return item.mode === 'MRP' ? 'item-name-mrp' : 'item-name-pkg';
    }

    // Unit parsing for chip inputs
    static parseUnit(input) {
        const str = input.toLowerCase().trim();
        
        // Weight parsing
        if (str.includes('kg')) {
            const num = parseFloat(str);
            return { type: 'weight', value: num * 1000, unit: 'g', display: num === 1 ? '1kg' : `${num}kg` };
        }
        
        if (str.includes('g')) {
            const num = parseFloat(str);
            return { type: 'weight', value: num, unit: 'g', display: `${num}g` };
        }
        
        // Price parsing
        if (str.includes('₹') || str.includes('rs')) {
            const num = parseFloat(str.replace(/[₹rs]/g, ''));
            return { type: 'price', value: num, unit: '₹', display: `₹${num}` };
        }
        
        // Default to price if just number
        const num = parseFloat(str);
        if (!isNaN(num)) {
            return { type: 'price', value: num, unit: '₹', display: `₹${num}` };
        }
        
        return null;
    }

    // Multi-word partial search matching
    static matchesSearch(item, query) {
        if (!query) return true;
        
        const searchWords = query.toLowerCase().split(/\s+/).filter(word => word.length > 0);
        const searchableText = [
            item.name1 || '',
            item.name2 || '',
            item.name3 || ''
        ].join(' ').toLowerCase();
        
        return searchWords.every(word => {
            const textWords = searchableText.split(/\s+/);
            return textWords.some(textWord => textWord.startsWith(word));
        });
    }

    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    static sanitizeInput(input) {
        return input.trim().replace(/[<>\"'&]/g, '');
    }

    // Generate unique IDs
    static generateId() {
        return Date.now() + Math.random();
    }
}
