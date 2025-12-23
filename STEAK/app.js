const steak_types = ["Tomahawk Steak", "Ribeye Steak", "Sirloin Steak", "T-Bone Steak", "Filet", "other"];
const selectElement = document.getElementById('Steak-type');

for (let i = 0; i < steak_types.length; i++) {
    const option = document.createElement('option');
    option.value = steak_types[i];
    option.textContent = steak_types[i];
    selectElement.appendChild(option);
}

async function steak_to_add(e) {
    if (e && e.preventDefault) e.preventDefault();
    const steakCost = document.getElementById('Steak-cost').value;
    const steakType = document.getElementById('Steak-type').value;
    const weight = document.getElementById('Steak-weight').value;

    if (!steakCost || !steakType || !weight) return;
    // send data to server which will insert into SQLite DB
    const user = localStorage.getItem('user_id') || 'anonymous';
    const payload = {
        user: user,
        type: steakType,
        cost: parseFloat(steakCost),
        weight: parseFloat(weight),
        photo: window.lastUploadedFilename || null
    };
    try {
        const res = await fetch('/add_steak', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error(res.statusText || res.status);
        const saved = await res.json();
        appendLogEntry(saved);
        document.getElementById('Steak-cost').value = '';
        document.getElementById('Steak-weight').value = '';
        window.lastUploadedFilename = null;
    } catch (err) {
        console.error('Add steak failed', err);
    }
}

// Attach form submit handler to prevent page reload
const steakForm = document.getElementById('Steak-form');
if (steakForm) steakForm.addEventListener('submit', steak_to_add);

function appendLogEntry(entry) {
        const logContainer = document.getElementById('log-entries') || document.querySelector('.log');
        const newLogEntry = document.createElement('div');
        newLogEntry.className = 'card slide-up';
        newLogEntry.dataset.id = entry.id;
        newLogEntry.innerHTML = `
            <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
                <div style="font-weight:600">${entry.type}</div>
                <div class="muted">${new Date(entry.timestamp).toLocaleString()}</div>
            </div>
            <div class="muted">cost: £${entry.cost} &middot; weight: ${entry.weight}g</div>
        `;
        if (entry.photo) {
                const img = document.createElement('img');
                img.src = `/uploads/${entry.photo}`;
                img.style.maxWidth = '100%';
                img.style.display = 'block';
                img.style.marginTop = '8px';
                newLogEntry.appendChild(img);
        }
        const del = document.createElement('button');
        del.className = 'btn secondary';
        del.textContent = 'Delete';
        del.style.marginTop = '8px';
        del.addEventListener('click', async ()=>{
            const id = newLogEntry.dataset.id;
            const user = localStorage.getItem('user_id') || 'anonymous';
            try{
                const r = await fetch(`/steak/${id}`, { method: 'DELETE', headers: { 'x-user-id': user } });
                if(!r.ok) throw new Error(r.statusText||r.status);
                newLogEntry.remove();
            }catch(e){console.error('Delete failed',e);alert('Delete failed');}
        });
        newLogEntry.appendChild(del);
        logContainer.appendChild(newLogEntry);
}

// load existing steaks on page load
async function loadSteaks() {
    try {
        const user = localStorage.getItem('user_id') || 'anonymous';
        const res = await fetch('/steaks', { headers: { 'x-user-id': user } });
        if (!res.ok) throw new Error(res.statusText || res.status);
        const list = await res.json();
        list.reverse(); // oldest first
        list.forEach(appendLogEntry);
    } catch (err) {
        console.error('Failed to load steaks', err);
    }
}

window.addEventListener('DOMContentLoaded', loadSteaks);