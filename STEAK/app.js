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

    const logDiv = document.querySelector('.log');
    const newLogEntry = document.createElement('div');
    const photoName = window.lastUploadedFilename || '';
    newLogEntry.textContent = `type:${steakType},cost:£${steakCost},weight:${weight}g, date:${new Date().toLocaleDateString()}, time:${new Date().toLocaleTimeString()}${photoName ? ',photo:' + photoName : ''}`;
    logDiv.appendChild(newLogEntry);
    logDiv.appendChild(document.createElement('img')).src = photoName ? `/uploads/${photoName}` : '';
    document.getElementById('Steak-cost').value = '';
    document.getElementById('Steak-weight').value = '';
    window.lastUploadedFilename = null;

    console.log('Steak added:', newLogEntry.textContent);
}

//document.getElementById('add-Steak-btn').addEventListener('click', steak_to_add);