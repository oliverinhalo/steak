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
    const payload = {
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
    const logDiv = document.querySelector('.log');
    const newLogEntry = document.createElement('div');
    newLogEntry.textContent = `type:${entry.type},cost:£${entry.cost},weight:${entry.weight}g, date:${entry.timestamp}`;
    logDiv.appendChild(newLogEntry);
    if (entry.photo) {
        const img = document.createElement('img');
        img.src = `/uploads/${entry.photo}`;
        img.style.maxWidth = '200px';
        img.style.display = 'block';
        logDiv.appendChild(img);
    }
}

// load existing steaks on page load
async function loadSteaks() {
    try {
        const res = await fetch('/steaks');
        if (!res.ok) throw new Error(res.statusText || res.status);
        const list = await res.json();
        list.reverse(); // oldest first
        list.forEach(appendLogEntry);
    } catch (err) {
        console.error('Failed to load steaks', err);
    }
}

window.addEventListener('DOMContentLoaded', loadSteaks);