// Tab Navigation
document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', (e) => {
    const tabId = e.currentTarget.dataset.tab;
    
    // Update active nav
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    e.currentTarget.classList.add('active');
    
    // Update active tab
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    
    // Update title
    const title = e.currentTarget.textContent.trim();
    document.getElementById('page-title').textContent = title;

    // Load data if CRUD tab
    if (tabId === 'crud-tab') {
      loadMahasiswa();
    }
  });
});

// Load Mahasiswa Data
async function loadMahasiswa() {
  try {
    const response = await fetch('/api/mahasiswa');
    if (!response.ok) throw new Error('Unauthorized');
    
    const data = await response.json();
    const tbody = document.querySelector('#mahasiswaTable tbody');
    tbody.innerHTML = '';

    data.forEach((item, index) => {
      const row = `
        <tr>
          <td>${index + 1}</td>
          <td>${item.NAMA}</td>
          <td>${item.NIM}</td>
          <td>${item.KELAS}</td>
          <td>${item.NILAI}</td>
          <td>${item.BIDANG}</td>
          <td>${item.GENDER}</td>
          <td>
            <button class="btn-sm btn-edit" onclick="editMahasiswa(${item.id})">Edit</button>
            <button class="btn-sm btn-delete" onclick="showDeleteConfirm(${item.id})">Hapus</button>
          </td>
        </tr>
      `;
      tbody.innerHTML += row;
    });
  } catch (err) {
    showMessageCrud('Gagal memuat data: ' + err.message, 'error');
  }
}

// Open Add Form
function openAddForm() {
  document.getElementById('mahasiswaId').value = '';
  document.getElementById('form-title').textContent = 'Tambah Mahasiswa';
  document.getElementById('mahasiswaForm').reset();
  document.getElementById('formModal').style.display = 'flex';
}

// Close Form
function closeForm() {
  document.getElementById('formModal').style.display = 'none';
}

// Edit Mahasiswa
async function editMahasiswa(id) {
  try {
    const response = await fetch('/api/mahasiswa');
    const data = await response.json();
    const item = data.find(m => m.id === id);

    if (!item) return;

    document.getElementById('mahasiswaId').value = item.id;
    document.getElementById('nama').value = item.NAMA;
    document.getElementById('nim').value = item.NIM;
    document.getElementById('kelas').value = item.KELAS;
    document.getElementById('nilai').value = item.NILAI;
    document.getElementById('nilaiDisplay').textContent = `(${item.NILAI})`;
    document.getElementById('bidang').value = item.BIDANG;
    document.getElementById('gender').value = item.GENDER;
    document.getElementById('form-title').textContent = 'Edit Mahasiswa';
    document.getElementById('formModal').style.display = 'flex';
  } catch (err) {
    showMessageCrud('Gagal memuat data: ' + err.message, 'error');
  }
}

// Submit Form
document.getElementById('mahasiswaForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const id = document.getElementById('mahasiswaId').value;
  const data = {
    NAMA: document.getElementById('nama').value,
    NIM: document.getElementById('nim').value,
    KELAS: document.getElementById('kelas').value,
    NILAI: parseFloat(document.getElementById('nilai').value),
    BIDANG: document.getElementById('bidang').value,
    GENDER: document.getElementById('gender').value,
  };

  try {
    const url = id ? `/api/mahasiswa/${id}` : '/api/mahasiswa';
    const method = id ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (response.ok) {
      showMessageCrud(result.message, 'success');
      closeForm();
      loadMahasiswa();
    } else {
      showMessageCrud(result.error, 'error');
    }
  } catch (err) {
    showMessageCrud('Terjadi kesalahan: ' + err.message, 'error');
  }
});

// Delete Confirmation
let deleteId = null;

function showDeleteConfirm(id) {
  deleteId = id;
  document.getElementById('confirmMessage').textContent = 'Apakah Anda yakin ingin menghapus data ini?';
  document.getElementById('confirmDialog').style.display = 'flex';
}

function closeConfirm() {
  document.getElementById('confirmDialog').style.display = 'none';
}

document.getElementById('confirmBtn').addEventListener('click', deleteMahasiswa);

async function deleteMahasiswa() {
  if (!deleteId) return;

  try {
    const response = await fetch(`/api/mahasiswa/${deleteId}`, {
      method: 'DELETE',
    });

    const result = await response.json();

    if (response.ok) {
      showMessageCrud(result.message, 'success');
      closeConfirm();
      loadMahasiswa();
    } else {
      showMessageCrud(result.error, 'error');
    }
  } catch (err) {
    showMessageCrud('Terjadi kesalahan: ' + err.message, 'error');
  }
}

// Logout
async function logout() {
  if (!confirm('Apakah Anda yakin ingin logout?')) return;

  try {
    await fetch('/api/logout', { method: 'POST' });
    window.location.href = '/';
  } catch (err) {
    alert('Logout gagal');
  }
}

// Show Message
function showMessageCrud(msg, type) {
  const msgDiv = document.getElementById('message-crud');
  msgDiv.textContent = msg;
  msgDiv.className = 'message ' + type;
  setTimeout(() => msgDiv.className = 'message', 5000);
}

// Modal close on outside click
window.addEventListener('click', (e) => {
  const modal = document.getElementById('formModal');
  if (e.target === modal) closeForm();

  const confirmDialog = document.getElementById('confirmDialog');
  if (e.target === confirmDialog) closeConfirm();
});
