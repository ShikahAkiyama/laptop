import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, doc, updateDoc, deleteDoc, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

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
const auth = getAuth(app);

// State untuk menyimpan data lokal agar mudah diambil saat Edit
const laptopsData = {};
let allLaptopsList = []; // Array untuk menyimpan data agar mudah difilter
let currentFilter = 'all'; // Status filter saat ini
const selectedLaptopIds = new Set(); // Menyimpan ID laptop yang dipilih untuk dicetak

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
    
    // Logika Edit Brand: Cek apakah brand ada di dropdown atau custom
    const brandSelect = document.getElementById('brand');
    const customDiv = document.getElementById('customBrandDiv');
    const customInput = document.getElementById('customBrand');
    
    // Cek apakah value brand ada di opsi select
    const optionExists = [...brandSelect.options].some(o => o.value === data.brand);

    if (optionExists) {
        brandSelect.value = data.brand;
        customDiv.classList.add('d-none');
    } else {
        brandSelect.value = 'Other';
        customDiv.classList.remove('d-none');
        customInput.value = data.brand;
    }

    document.getElementById('model').value = data.model;
    document.getElementById('processor').value = data.processor;
    document.getElementById('ram').value = data.ram;
    document.getElementById('storage').value = data.storage;
    document.getElementById('features').value = data.features;
    document.getElementById('price').value = data.price;
    document.getElementById('originalPrice').value = data.originalPrice || '';
    document.getElementById('stock').value = data.stock;
    document.getElementById('status').value = data.status || 'active'; // Default active jika data lama
    document.getElementById('images').value = (data.images || []).join(', ');
    document.getElementById('misc').value = data.misc || '';

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

    // Update class tabel untuk logika cetak (jika ada yang dipilih)
    const table = document.getElementById('adminTable');
    if (selectedLaptopIds.size > 0) {
        table.classList.add('has-selection');
    } else {
        table.classList.remove('has-selection');
    }

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

        const isChecked = selectedLaptopIds.has(item.id) ? 'checked' : '';
        const rowClass = selectedLaptopIds.has(item.id) ? 'is-selected' : '';

        const tr = document.createElement('tr');
        tr.className = rowClass;
        tr.innerHTML = `
            <td class="text-center no-print">
                <input type="checkbox" class="form-check-input select-item" value="${item.id}" ${isChecked}>
            </td>
            <td class="col-brand">
                <span class="badge bg-primary mb-1">${item.brand}</span><br>
                <b>${item.model}</b>
            </td>
            <td class="small col-specs">
                ${item.processor}<br>
                ${item.ram} | ${item.storage}
            </td>
            <td class="col-price">
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

    // Event Listener Checkbox Seleksi
    document.querySelectorAll('.select-item').forEach(cb => {
        cb.addEventListener('change', (e) => {
            const id = e.target.value;
            const tr = e.target.closest('tr');
            if (e.target.checked) {
                selectedLaptopIds.add(id);
                tr.classList.add('is-selected');
                table.classList.add('has-selection');
            } else {
                selectedLaptopIds.delete(id);
                tr.classList.remove('is-selected');
                if (selectedLaptopIds.size === 0) {
                    table.classList.remove('has-selection');
                }
            }
        });
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
    selectedLaptopIds.clear(); // Reset pilihan cetak juga
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
    document.getElementById('customBrandDiv').classList.add('d-none'); // Sembunyikan input manual
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
        // Tentukan nilai Brand (dari dropdown atau input manual)
        let brandValue = document.getElementById('brand').value;
        if (brandValue === 'Other') {
            brandValue = document.getElementById('customBrand').value.trim();
        }

        const laptopData = {
            brand: brandValue,
            model: document.getElementById('model').value,
            processor: document.getElementById('processor').value,
            ram: document.getElementById('ram').value,
            storage: document.getElementById('storage').value,
            features: document.getElementById('features').value,
            price: Number(document.getElementById('price').value),
            originalPrice: Number(document.getElementById('originalPrice').value),
            stock: Number(document.getElementById('stock').value),
            status: document.getElementById('status').value,
            images: document.getElementById('images').value.split(',').map(url => url.trim()).filter(url => url !== ''),
            misc: document.getElementById('misc').value,
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
        let text = e.target.result;

        // Hapus BOM (Byte Order Mark) jika ada di awal file (biasanya dari Excel CSV UTF-8)
        text = text.replace(/^\uFEFF/, '');

        const statusEl = document.getElementById('uploadStatus');
        
        // Deteksi delimiter dari baris pertama (Koma atau Titik Koma)
        const firstLine = text.split('\n')[0];
        const delimiter = firstLine && firstLine.includes(';') ? ';' : ',';
        
        // Normalisasi baris baru & Handle Multiline CSV (Baris baru di dalam kutip)
        const rawLines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
        const dataRows = [];
        let tempRow = '';

        for (let line of rawLines) {
            if (line.trim() === '' && tempRow === '') continue;

            // Gabungkan baris jika sedang dalam kutip (multiline cell)
            let combined = tempRow ? tempRow + '\n' + line : line;
            
            // Hitung jumlah kutip (jika ganjil, berarti baris belum selesai)
            const quoteCount = (combined.match(/"/g) || []).length;

            if (quoteCount % 2 === 0) {
                dataRows.push(combined);
                tempRow = '';
            } else {
                tempRow = combined;
            }
        }

        // Hapus Header jika ada
        if (dataRows.length > 0 && dataRows[0].toLowerCase().includes('brand')) {
            dataRows.shift();
        }

        if (dataRows.length === 0) {
            showToast('Data CSV kosong atau format tidak terbaca.', 'error');
            btn.disabled = false;
            btn.innerText = 'Upload CSV';
            return;
        }

        const updateDuplicates = document.getElementById('chkUpdateDuplicates').checked;

        // Helper untuk membersihkan value CSV (Excel Format)
        const cleanCSVValue = (val) => {
            if (!val) return '';
            let str = val.trim();
            // Jika diawali dan diakhiri tanda petik, hapus petiknya
            if (str.startsWith('"') && str.endsWith('"')) {
                str = str.slice(1, -1);
            }
            // Unescape double quotes ("" menjadi ")
            return str.replace(/""/g, '"');
        };
        
        // Regex untuk split CSV yang menghandle quoted string (delimiter di dalam quote tidak dipisah)
        const splitRegex = new RegExp(`${delimiter}(?=(?:(?:[^"]*"){2})*[^"]*$)`);

        let successCount = 0;
        let duplicateCount = 0;
        let updatedCount = 0;
        const total = dataRows.length;

        for (let i = 0; i < total; i++) {
            const row = dataRows[i];
            statusEl.innerText = `Mengupload data ke-${i + 1} dari ${total}...`;
            
            const cols = row.split(splitRegex);
            if (cols.length < 8) continue; // Minimal sampai stock

            try {
                // Bersihkan angka dari karakter non-digit (misal: Rp, titik)
                const priceClean = cols[6].replace(/[^0-9]/g, '');
                const originalPriceClean = cols[7] ? cols[7].replace(/[^0-9]/g, '') : '0';
                const stockClean = cols[8].replace(/[^0-9]/g, '');
                
                // Parse Images (Kolom ke-10, index 9)
                let images = [];
                if (cols[9]) {
                    const imgRaw = cleanCSVValue(cols[9]);
                    images = imgRaw.split('|').map(url => url.trim()).filter(url => url !== '');
                }
                
                // Parse Misc (Gabungkan sisa kolom jika ada koma dalam teks)
                let misc = '';
                if (cols.length > 10) {
                    const miscRaw = cols.slice(10).join(delimiter);
                    misc = cleanCSVValue(miscRaw);
                } else if (cols[10]) {
                    misc = cleanCSVValue(cols[10]);
                }

                const laptopData = {
                    brand: cleanCSVValue(cols[0]),
                    model: cleanCSVValue(cols[1]),
                    processor: cleanCSVValue(cols[2]),
                    ram: cleanCSVValue(cols[3]),
                    storage: cleanCSVValue(cols[4]),
                    features: cleanCSVValue(cols[5]),
                    price: Number(priceClean),
                    originalPrice: Number(originalPriceClean),
                    stock: Number(stockClean),
                    status: 'active',
                    images: images,
                    misc: misc
                };

                // Cek Duplikasi berdasarkan Model (Case Insensitive)
                const modelName = laptopData.model;
                const existingItem = allLaptopsList.find(item => item.model.toLowerCase() === modelName.toLowerCase());

                if (existingItem) {
                    if (updateDuplicates) {
                        // Update Data Lama
                        laptopData.updatedAt = new Date();
                        await updateDoc(doc(db, "laptops", existingItem.id), laptopData);
                        updatedCount++;
                    } else {
                        // Skip Duplikat
                        duplicateCount++;
                    }
                } else {
                    // Tambah Data Baru
                    laptopData.createdAt = new Date();
                    await addDoc(collection(db, "laptops"), laptopData);
                    successCount++;
                }
            } catch (err) {
                console.error("Gagal upload baris:", row, err);
            }
        }
        
        statusEl.innerText = `Selesai! ${successCount} baru, ${updatedCount} update, ${duplicateCount} dilewati.`;
        showToast(`Upload: ${successCount} Baru, ${updatedCount} Update`, 'success');
        btn.disabled = false;
        btn.innerText = 'Upload CSV';
        fileInput.value = ''; // Reset input
    };
    reader.readAsText(file);
});

// Event Listener Dropdown Brand (Tampilkan Input Manual jika pilih Lain-lain)
document.getElementById('brand').addEventListener('change', function() {
    const customDiv = document.getElementById('customBrandDiv');
    const customInput = document.getElementById('customBrand');
    
    if (this.value === 'Other') {
        customDiv.classList.remove('d-none');
        customInput.setAttribute('required', 'true'); // Wajib diisi jika pilih Lain-lain
    } else {
        customDiv.classList.add('d-none');
        customInput.removeAttribute('required');
        customInput.value = ''; // Reset nilai
    }
});

// Logic Download CSV
document.getElementById('btnDownloadCsv').addEventListener('click', () => {
    if (allLaptopsList.length === 0) {
        showToast('Tidak ada data untuk diunduh', 'error');
        return;
    }

    // Header sesuai format upload (menggunakan delimiter koma ',' sesuai contoh.txt)
    const headers = ["brand", "model", "processor", "ram", "storage", "features", "price", "originalPrice", "stock", "images", "misc"];
    let csvContent = headers.join(",") + "\n";

    allLaptopsList.forEach(item => {
        const row = headers.map(fieldName => {
            let val = item[fieldName];

            // Handle Images (Array to String)
            if (fieldName === 'images' && Array.isArray(val)) {
                val = val.join("|");
            }

            // Normalisasi ke String
            val = String(val || "");

            // Bersihkan karakter non-printable
            val = val.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");

            // Ganti newline dengan spasi (agar tidak merusak baris CSV)
            val = val.replace(/(\r\n|\n|\r)/g, " ");

            // Escape Double Quotes (" menjadi "")
            val = val.replace(/"/g, '""');

            // Jika mengandung delimiter (,) atau quote ("), bungkus dengan quote
            if (val.search(/("|;|,)/g) >= 0) {
                val = `"${val}"`;
            }
            
            return val;
        });
        
        csvContent += row.join(',') + "\n";
    });

    // Trigger Download File
    // Tambahkan BOM (\uFEFF) agar Excel membaca UTF-8 dengan benar (mengatasi karakter aneh seperti Â°)
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `data_laptop_${new Date().toISOString().slice(0,10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
});

// Logic Hapus Semua Data
document.getElementById('btnDeleteAll').addEventListener('click', async () => {
    if (allLaptopsList.length === 0) {
        showToast('Database sudah kosong.', 'error');
        return;
    }

    if (confirm(`PERINGATAN FATAL: \nAnda akan menghapus ${allLaptopsList.length} data laptop secara permanen!\n\nData yang dihapus TIDAK BISA dikembalikan. Pastikan Anda sudah backup/download CSV.\n\nLanjutkan menghapus?`)) {
        const btn = document.getElementById('btnDeleteAll');
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerText = 'Sedang Menghapus...';

        try {
            const deletePromises = allLaptopsList.map(item => deleteDoc(doc(db, "laptops", item.id)));
            await Promise.all(deletePromises);
            showToast('Semua data berhasil dihapus!', 'success');
        } catch (error) {
            showToast('Gagal menghapus sebagian data: ' + error.message, 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    }
});

// --- FITUR LOGIN FIREBASE ---

// Cek Status Login Realtime
onAuthStateChanged(auth, (user) => {
    if (!user) {
        // Jika belum login, redirect ke halaman login
        window.location.href = 'login.html';
    }
});

document.getElementById('btnLogout').addEventListener('click', () => {
    signOut(auth).then(() => {
        window.location.href = 'login.html';
    });
});