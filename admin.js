import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, doc, updateDoc, deleteDoc, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyCvwo1qhS9ugnweRccAP0Wgvk1MQ2XBdXg",
    authDomain: "laptop-e718c.firebaseapp.com",
    projectId: "laptop-e718c",
    storageBucket: "laptop-e718c.firebasestorage.app",
    messagingSenderId: "21040544479",
    appId: "1:21040544479:web:67549dc570d07f3544076a",
    measurementId: "G-SP2R77RD68"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// State untuk menyimpan data lokal agar mudah diambil saat Edit
const laptopsData = {};
let allLaptopsList = []; // Array untuk menyimpan data agar mudah difilter
let currentFilter = 'all'; // Status filter saat ini

// Fungsi Menampilkan Toast
const showToast = (message, type = 'success') => {
    const toastEl = document.getElementById('liveToast');
    const toastBody = document.getElementById('toastMessage');
    
    toastBody.innerText = message;
    toastEl.className = `toast align-items-center text-white border-0 ${type === 'success' ? 'bg-success' : 'bg-danger'}`;
    
    const toast = new bootstrap.Toast(toastEl);
    toast.show();
};

// Fungsi Edit: Mengisi form dengan data yang dipilih
const editLaptop = (id) => {
    const data = laptopsData[id];
    if (!data) return;

    document.getElementById('docId').value = id;
    document.getElementById('brand').value = data.brand;
    document.getElementById('model').value = data.model;
    document.getElementById('processor').value = data.processor;
    document.getElementById('ram').value = data.ram;
    document.getElementById('storage').value = data.storage;
    document.getElementById('features').value = data.features;
    document.getElementById('price').value = data.price;
    document.getElementById('stock').value = data.stock;
    document.getElementById('status').value = data.status || 'active'; // Default active jika data lama

    // Ubah tampilan tombol
    const btnSubmit = document.querySelector('#laptopForm button[type="submit"]');
    btnSubmit.innerText = 'Update Data';
    btnSubmit.classList.replace('btn-success', 'btn-warning');
    
    document.getElementById('btnCancel').classList.remove('d-none');
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

// Fungsi Hapus
const deleteLaptop = async (id) => {
    if (confirm('Apakah Anda yakin ingin menghapus data laptop ini?')) {
        try {
            await deleteDoc(doc(db, "laptops", id));
        } catch (error) {
            showToast('Gagal menghapus: ' + error.message, 'error');
        }
    }
};

// Fungsi Render Tabel
const renderTable = () => {
    const keyword = document.getElementById('searchInput').value;
    const minPrice = Number(document.getElementById('minPrice').value) || 0;
    const maxPrice = Number(document.getElementById('maxPrice').value) || Infinity;
    const sortOption = document.getElementById('sortBy').value;

    const tbody = document.querySelector('#adminTable tbody');
    tbody.innerHTML = '';

    let filtered = allLaptopsList.filter(item => {
        // Filter Keyword
        const searchStr = (item.brand + ' ' + item.model + ' ' + item.processor + ' ' + item.features).toLowerCase();
        const matchKeyword = searchStr.includes(keyword.toLowerCase());
        
        // Filter Status
        let matchStatus = true;
        if (currentFilter !== 'all') {
            // Jika item.status undefined (data lama), anggap active
            const itemStatus = item.status || 'active'; 
            matchStatus = itemStatus === currentFilter;
        }

        // Filter Price
        const matchPrice = item.price >= minPrice && item.price <= maxPrice;

        return matchKeyword && matchStatus && matchPrice;
    });

    // Sorting
    filtered.sort((a, b) => {
        if (sortOption === 'price_asc') {
            return a.price - b.price;
        } else if (sortOption === 'price_desc') {
            return b.price - a.price;
        }
        return 0; // Default (Newest / Order from DB)
    });

    filtered.forEach((item) => {
        const statusBadge = (item.status === 'inactive') 
            ? '<span class="badge bg-secondary">Non-Aktif</span>' 
            : '<span class="badge bg-success">Aktif</span>';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <span class="badge bg-primary mb-1">${item.brand}</span><br>
                <b>${item.model}</b>
            </td>
            <td class="small">
                ${item.processor}<br>
                ${item.ram} | ${item.storage}
            </td>
            <td>
                Rp ${item.price.toLocaleString('id-ID')}<br>
                <span class="badge ${item.stock < 5 ? 'bg-danger' : 'bg-primary'} mb-1">Stok: ${item.stock}</span><br>
                ${statusBadge}
            </td>
            <td>
                <button class="btn btn-sm btn-warning btn-edit mb-1 w-100" data-id="${item.id}">Edit</button>
                <button class="btn btn-sm btn-danger btn-delete w-100" data-id="${item.id}">Hapus</button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    // Re-attach Event Listener
    document.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', () => editLaptop(btn.dataset.id));
    });
    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', () => deleteLaptop(btn.dataset.id));
    });
};

// Listener Realtime: Otomatis update tabel jika ada perubahan di database
const q = query(collection(db, "laptops"), orderBy("createdAt", "desc"));
onSnapshot(q, (snapshot) => {
    allLaptopsList = [];
    snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        laptopsData[docSnap.id] = data; // Simpan data ke state lokal
        allLaptopsList.push({ id: docSnap.id, ...data });
    });

    // Update Counter pada Tombol Filter
    const totalCount = allLaptopsList.length;
    const activeCount = allLaptopsList.filter(item => (item.status || 'active') === 'active').length;
    const inactiveCount = allLaptopsList.filter(item => item.status === 'inactive').length;

    document.querySelector('button[data-filter="all"]').innerText = `Semua (${totalCount})`;
    document.querySelector('button[data-filter="active"]').innerText = `Aktif Only (${activeCount})`;
    document.querySelector('button[data-filter="inactive"]').innerText = `Non-Aktif (${inactiveCount})`;

    // Render ulang dengan keyword yang ada di input (jika ada)
    renderTable();
});

// Event Listener Search Input
document.getElementById('searchInput').addEventListener('keyup', renderTable);
document.getElementById('minPrice').addEventListener('input', renderTable);
document.getElementById('maxPrice').addEventListener('input', renderTable);
document.getElementById('sortBy').addEventListener('change', renderTable);

document.getElementById('btnResetFilter').addEventListener('click', () => {
    document.getElementById('searchInput').value = '';
    document.getElementById('minPrice').value = '';
    document.getElementById('maxPrice').value = '';
    document.getElementById('sortBy').value = 'newest';
    renderTable();
});

// Event Listener Filter Buttons
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        // Update UI tombol
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active', 'btn-dark'));
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.add('btn-outline-dark')); // Reset style
        e.target.classList.add('active', 'btn-dark');
        
        currentFilter = e.target.dataset.filter;
        renderTable();
    });
});

// Fungsi Reset Form (Batal Edit / Selesai Simpan)
const resetForm = () => {
    document.getElementById('laptopForm').reset();
    document.getElementById('docId').value = '';
    const btnSubmit = document.querySelector('#laptopForm button[type="submit"]');
    btnSubmit.innerText = 'Simpan Data ke Database';
    btnSubmit.classList.replace('btn-warning', 'btn-success');
    document.getElementById('btnCancel').classList.add('d-none');
};

document.getElementById('btnCancel').addEventListener('click', resetForm);

document.getElementById('laptopForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    const id = document.getElementById('docId').value;
    const originalText = btn.innerText;
    
    btn.disabled = true;
    btn.innerText = id ? 'Mengupdate...' : 'Menyimpan...';

    try {
        const laptopData = {
            brand: document.getElementById('brand').value,
            model: document.getElementById('model').value,
            processor: document.getElementById('processor').value,
            ram: document.getElementById('ram').value,
            storage: document.getElementById('storage').value,
            features: document.getElementById('features').value,
            price: Number(document.getElementById('price').value),
            stock: Number(document.getElementById('stock').value),
            status: document.getElementById('status').value,
            updatedAt: new Date()
        };

        if (id) {
            // Mode Update
            await updateDoc(doc(db, "laptops", id), laptopData);
            showToast('Data berhasil diupdate!', 'success');
            resetForm();
        } else {
            // Mode Tambah Baru
            laptopData.createdAt = new Date();
            await addDoc(collection(db, "laptops"), laptopData);
            showToast('Data berhasil disimpan!', 'success');
            e.target.reset();
            btn.innerText = 'Simpan Data ke Database';
        }
    } catch (error) {
        console.error("Error:", error);
        showToast('Gagal menyimpan: ' + error.message, 'error');
        btn.innerText = originalText;
    } finally {
        btn.disabled = false;
    }
});

// Logic Upload CSV
document.getElementById('btnUploadCsv').addEventListener('click', async () => {
    const fileInput = document.getElementById('csvFile');
    const file = fileInput.files[0];
    const btn = document.getElementById('btnUploadCsv');

    if (!file) {
        alert('Pilih file CSV terlebih dahulu!');
        return;
    }

    btn.disabled = true;
    btn.innerText = 'Sedang Memproses...';

    const reader = new FileReader();
    reader.onload = async function(e) {
        const text = e.target.result;
        const statusEl = document.getElementById('uploadStatus');
        
        // Normalisasi baris baru dan hapus baris kosong
        const allLines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(line => line.trim() !== '');
        
        // Cek apakah baris pertama adalah header
        let dataRows = allLines;
        if (allLines.length > 0 && allLines[0].toLowerCase().includes('brand')) {
            dataRows = allLines.slice(1);
        }

        if (dataRows.length === 0) {
            showToast('Data CSV kosong atau format tidak terbaca.', 'error');
            btn.disabled = false;
            btn.innerText = 'Upload CSV';
            return;
        }

        // Deteksi delimiter (koma atau titik koma)
        const delimiter = dataRows[0].includes(';') ? ';' : ',';
        
        let successCount = 0;
        const total = dataRows.length;

        for (let i = 0; i < total; i++) {
            const row = dataRows[i];
            statusEl.innerText = `Mengupload data ke-${i + 1} dari ${total}...`;
            
            const cols = row.split(delimiter);
            if (cols.length < 8) continue;

            try {
                // Bersihkan angka dari karakter non-digit (misal: Rp, titik)
                const priceClean = cols[6].replace(/[^0-9]/g, '');
                const stockClean = cols[7].replace(/[^0-9]/g, '');

                await addDoc(collection(db, "laptops"), {
                    brand: cols[0].trim(),
                    model: cols[1].trim(),
                    processor: cols[2].trim(),
                    ram: cols[3].trim(),
                    storage: cols[4].trim(),
                    features: cols[5].trim(),
                    price: Number(priceClean),
                    stock: Number(stockClean),
                    status: 'active', // Default aktif untuk upload CSV
                    createdAt: new Date()
                });
                successCount++;
            } catch (err) {
                console.error("Gagal upload baris:", row, err);
            }
        }
        
        statusEl.innerText = `Selesai! ${successCount} data berhasil disimpan.`;
        showToast(`Berhasil mengupload ${successCount} data laptop!`, 'success');
        btn.disabled = false;
        btn.innerText = 'Upload CSV';
        fileInput.value = ''; // Reset input
    };
    reader.readAsText(file);
});